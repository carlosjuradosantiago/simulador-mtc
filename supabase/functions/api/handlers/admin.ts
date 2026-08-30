import { getUserFromToken } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, jsonResponse, unauthorizedResponse } from '../_shared/response.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { isRealPayment } from '../_shared/membership-access.ts';
import { classifyTrafficSource } from '../_shared/traffic-source.ts';

const ADMIN_ROLE = 'ADMIN';
const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ADMIN_DEVICES = ['mobile', 'desktop', 'tablet', 'unknown'] as const;
type AdminDevice = typeof ADMIN_DEVICES[number];

function startOfToday(value = new Date()) {
  const peruTime = new Date(value.getTime() - PERU_OFFSET_MS);
  peruTime.setUTCHours(0, 0, 0, 0);
  return new Date(peruTime.getTime() + PERU_OFFSET_MS);
}

function startOfMonth(value = new Date()) {
  const peruTime = new Date(value.getTime() - PERU_OFFSET_MS);
  peruTime.setUTCDate(1);
  peruTime.setUTCHours(0, 0, 0, 0);
  return new Date(peruTime.getTime() + PERU_OFFSET_MS);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getTime() + amount * DAY_MS);
}

function addMonths(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(1);
  nextDate.setUTCMonth(nextDate.getUTCMonth() + amount);
  return nextDate;
}

function peruDateKey(value: Date | string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - PERU_OFFSET_MS).toISOString().slice(0, 10);
}

function peruMonthKey(value: Date | string | null | undefined) {
  return peruDateKey(value).slice(0, 7);
}

function dateLabel(value: Date, options: Intl.DateTimeFormatOptions) {
  return value.toLocaleDateString('es-PE', { ...options, timeZone: 'America/Lima' });
}

function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function sumPayments(payments: any[]) {
  return money(payments.reduce((sum, payment) => sum + Number(payment.monto || 0), 0));
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function cleanAdminSearch(value: unknown) {
  return String(value || '')
    .replace(/[^\p{L}\p{N}@._\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function visitorKey(row: any) {
  return row.visitor_id || (row.id_usuario ? 'user-' + row.id_usuario : null);
}

function uniqueVisitors(rows: any[]) {
  return new Set(rows.map(visitorKey).filter(Boolean)).size;
}

function classifyDevice(userAgent: unknown): AdminDevice | 'bot' {
  const ua = String(userAgent || '').trim().toLowerCase();
  if (!ua) return 'unknown';
  if (/(bot|spider|crawler|crawl|slurp|bingpreview|headlesschrome|lighthouse|pagespeed|google-inspectiontool|facebookexternalhit|whatsapp|telegrambot|twitterbot|linkedinbot|curl|wget|python-requests|go-http-client)/.test(ua)) {
    return 'bot';
  }
  if (/(ipad|tablet|kindle|silk|playbook)/.test(ua) || (ua.includes('android') && !ua.includes('mobile'))) {
    return 'tablet';
  }
  if (/(iphone|ipod|android|mobile|windows phone|iemobile|opera mini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function normalizeDeviceFilter(value: unknown) {
  const device = String(value || '').trim().toLowerCase();
  return ADMIN_DEVICES.includes(device as AdminDevice) ? device as AdminDevice : '';
}

function normalizeRoute(value: unknown) {
  const route = String(value || '/').trim();
  try {
    return new URL(route, 'https://www.simuladormtc.com').pathname || '/';
  } catch {
    return route.split('?')[0] || '/';
  }
}

function firstRelation(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function isMembershipActive(membership: any, now = new Date()) {
  const endDate = new Date(membership?.fecha_fin || 0);
  return membership?.esta_activa === true
    && !Number.isNaN(endDate.getTime())
    && endDate >= now;
}

function membershipStatus(membership: any, now = new Date()) {
  if (isMembershipActive(membership, now)) return 'Activa';
  if (membership?.esta_activa === false && new Date(membership?.fecha_fin || 0) >= now) return 'Cancelada';
  return 'Vencida';
}

function daysRemaining(value: unknown, now = new Date()) {
  const endDate = new Date(String(value || ''));
  if (Number.isNaN(endDate.getTime()) || endDate <= now) return 0;
  return Math.ceil((endDate.getTime() - now.getTime()) / DAY_MS);
}

export async function requireAdmin(req: Request) {
  const user = await getUserFromToken(req);
  if (!user?.userId) return { ok: false, response: unauthorizedResponse() };

  const supabase = getSupabaseClient();
  const { data: dbUser, error } = await supabase
    .from('usuarios')
    .select('id, correo_electronico, primer_nombre, apellido, nombre_usuario, rol')
    .eq('id', user.userId)
    .single();

  if (error || !dbUser) {
    return { ok: false, response: unauthorizedResponse() };
  }

  if (String(dbUser.rol || '').toUpperCase() !== ADMIN_ROLE) {
    return { ok: false, response: errorResponse('Acceso restringido al administrador', 403) };
  }

  return { ok: true, user: dbUser, supabase };
}

async function countRows(supabase: any, table: string, createdColumn = 'creado_en', from?: string) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (from) query = query.gte(createdColumn, from);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function fetchAnalyticsRows(supabase: any, from: string) {
  const { data, error, count } = await supabase
    .from('eventos_analytics')
    .select('visitor_id, id_usuario, tipo_evento, ruta, referrer, user_agent, creado_en', { count: 'exact' })
    .gte('creado_en', from)
    .order('creado_en', { ascending: false })
    .limit(10000);

  if (error) {
    if (error.code === '42P01') {
      return { ready: false, rows: [], count: 0, truncated: false };
    }
    throw error;
  }

  const rows = data || [];
  return { ready: true, rows, count: count || 0, truncated: (count || 0) > rows.length };
}

function buildRevenueSeries(payments: any[], today: Date, monthStart: Date) {
  const dailyRevenue = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(today, index - 13);
    return {
      key: peruDateKey(date),
      label: dateLabel(date, { day: '2-digit', month: 'short' }),
      revenue: 0,
      payments: 0,
    };
  });

  const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
    const date = addMonths(monthStart, index - 5);
    return {
      key: peruMonthKey(date),
      label: dateLabel(date, { month: 'short', year: '2-digit' }),
      revenue: 0,
      payments: 0,
    };
  });

  const dailyMap = new Map(dailyRevenue.map((item) => [item.key, item]));
  const monthlyMap = new Map(monthlyRevenue.map((item) => [item.key, item]));

  payments.forEach((payment) => {
    const paidAt = payment.fecha_pago || payment.creado_en;
    const day = dailyMap.get(peruDateKey(paidAt));
    const month = monthlyMap.get(peruMonthKey(paidAt));
    if (day) {
      day.revenue = money(day.revenue + Number(payment.monto || 0));
      day.payments += 1;
    }
    if (month) {
      month.revenue = money(month.revenue + Number(payment.monto || 0));
      month.payments += 1;
    }
  });

  return { dailyRevenue, monthlyRevenue };
}

function buildTrafficSeries(pageViews: any[], today: Date) {
  const series = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(today, index - 13);
    return {
      key: peruDateKey(date),
      label: dateLabel(date, { day: '2-digit', month: 'short' }),
      pageViews: 0,
      visitors: 0,
    };
  });
  const itemByDate = new Map(series.map((item) => [item.key, item]));
  const visitorsByDate = new Map(series.map((item) => [item.key, new Set<string>()]));

  pageViews.forEach((event) => {
    const key = peruDateKey(event.creado_en);
    const item = itemByDate.get(key);
    if (!item) return;
    item.pageViews += 1;
    const keyForVisitor = visitorKey(event);
    if (keyForVisitor) visitorsByDate.get(key)?.add(keyForVisitor);
  });

  series.forEach((item) => {
    item.visitors = visitorsByDate.get(item.key)?.size || 0;
  });

  return series;
}

function buildTopPages(pageViews: any[]) {
  const pageMap = new Map<string, { path: string; views: number; visitors: Set<string> }>();

  pageViews.forEach((event) => {
    const path = normalizeRoute(event.ruta);
    const current = pageMap.get(path) || { path, views: 0, visitors: new Set<string>() };
    current.views += 1;
    const key = visitorKey(event);
    if (key) current.visitors.add(key);
    pageMap.set(path, current);
  });

  return Array.from(pageMap.values())
    .sort((left, right) => right.views - left.views)
    .slice(0, 12)
    .map((page) => ({
      path: page.path,
      views: page.views,
      visitors: page.visitors.size,
      share: percentage(page.views, pageViews.length),
    }));
}

function trafficSource(event: any) {
  return classifyTrafficSource(event.ruta, event.referrer);
}

function buildTopSources(pageViews: any[]) {
  const sourceMap = new Map<string, { source: string; views: number; visitors: Set<string> }>();

  pageViews.forEach((event) => {
    const source = trafficSource(event);
    const current = sourceMap.get(source) || { source, views: 0, visitors: new Set<string>() };
    current.views += 1;
    const key = visitorKey(event);
    if (key) current.visitors.add(key);
    sourceMap.set(source, current);
  });

  return Array.from(sourceMap.values())
    .sort((left, right) => right.views - left.views)
    .slice(0, 12)
    .map((source) => ({
      source: source.source,
      views: source.views,
      visitors: source.visitors.size,
      share: percentage(source.views, pageViews.length),
    }));
}

function buildDevices(pageViews: any[]) {
  const rows = new Map<AdminDevice, {
    device: AdminDevice;
    visitors: number;
    pageViews: number;
    identifiedUsers: Set<number>;
  }>(ADMIN_DEVICES.map((device) => [device, {
    device,
    visitors: 0,
    pageViews: 0,
    identifiedUsers: new Set<number>(),
  }] as const));
  const firstDeviceByVisitor = new Map<string, AdminDevice>();

  [...pageViews]
    .sort((left, right) => new Date(left.creado_en || 0).getTime() - new Date(right.creado_en || 0).getTime())
    .forEach((event) => {
      const device = classifyDevice(event.user_agent);
      if (device === 'bot') return;
      const row = rows.get(device as AdminDevice);
      if (!row) return;
      row.pageViews += 1;
      if (event.id_usuario) row.identifiedUsers.add(Number(event.id_usuario));
      const key = visitorKey(event);
      if (key && !firstDeviceByVisitor.has(key)) {
        firstDeviceByVisitor.set(key, device as AdminDevice);
      }
    });

  firstDeviceByVisitor.forEach((device) => {
    const row = rows.get(device);
    if (row) row.visitors += 1;
  });

  return Array.from(rows.values())
    .filter((row) => row.pageViews > 0 || row.visitors > 0)
    .sort((left, right) => right.visitors - left.visitors)
    .map((row) => ({
      device: row.device,
      visitors: row.visitors,
      pageViews: row.pageViews,
      identifiedUsers: row.identifiedUsers.size,
      share: percentage(row.visitors, firstDeviceByVisitor.size),
    }));
}

async function buildAdminOverview(supabase: any) {
  const now = new Date();
  const today = startOfToday(now);
  const monthStart = startOfMonth(now);
  const analyticsStart = addDays(today, -29);
  const todayIso = today.toISOString();
  const monthIso = monthStart.toISOString();

  const [
    totalUsers,
    usersToday,
    usersThisMonth,
    analytics,
    sessionsResult,
    transactionsResult,
    membershipsResult,
    recentUsersResult,
    cohortUsersResult,
  ] = await Promise.all([
    countRows(supabase, 'usuarios'),
    countRows(supabase, 'usuarios', 'creado_en', todayIso),
    countRows(supabase, 'usuarios', 'creado_en', monthIso),
    fetchAnalyticsRows(supabase, analyticsStart.toISOString()),
    supabase
      .from('sesion_practica')
      .select('id, id_usuario, estado, id_categoria, modo_practica, tipo_sesion, creado_en, created_at, fecha_fin')
      .order('creado_en', { ascending: false })
      .limit(10000),
    supabase
      .from('transacciones_pago')
      .select('id, id_usuario, id_plan_membresia, monto, moneda, metodo_pago, estado, fecha_pago, creado_en, correo_cliente, culqi_charge_id, verificado_proveedor_en, planes_membresia:id_plan_membresia(nombre, precio, duracion_meses), usuarios:id_usuario(correo_electronico, primer_nombre, apellido, nombre_usuario)')
      .order('creado_en', { ascending: false })
      .limit(10000),
    supabase
      .from('membresias_usuario')
      .select('id, id_usuario, id_plan_membresia, fecha_inicio, fecha_fin, esta_activa, creado_en, planes_membresia:id_plan_membresia(nombre, precio, duracion_meses), usuarios:id_usuario(correo_electronico, primer_nombre, apellido, nombre_usuario)')
      .order('creado_en', { ascending: false })
      .limit(1000),
    supabase
      .from('admin_user_summary')
      .select('id, display_name, email, username, role, registered_at, practice_sessions, paid_amount, membership_ends_at, status, first_device, last_device, last_active_at, active_days, started_sessions, completed_sessions, attempts, returned_after_registration, first_practice_at, minutes_to_first_practice')
      .order('registered_at', { ascending: false })
      .limit(50),
    supabase
      .from('admin_user_summary')
      .select('id, started_sessions, completed_sessions, attempts, returned_after_registration')
      .eq('role', 'USUARIO')
      .gte('registered_at', analyticsStart.toISOString().slice(0, 19))
      .limit(10000),
  ]);

  for (const result of [sessionsResult, transactionsResult, membershipsResult, recentUsersResult, cohortUsersResult]) {
    if (result.error) throw result.error;
  }

  const sessions = sessionsResult.data || [];
  const transactions = transactionsResult.data || [];
  const memberships = membershipsResult.data || [];
  const recentUsers = recentUsersResult.data || [];
  const cohortUsers = cohortUsersResult.data || [];
  const successfulPayments = transactions.filter(isRealPayment);
  const activeMemberships = memberships.filter((membership: any) => isMembershipActive(membership, now));
  const expiringMemberships = activeMemberships.filter((membership: any) => daysRemaining(membership.fecha_fin, now) <= 7);
  const membershipsThisMonth = memberships.filter((membership: any) => new Date(membership.creado_en || 0) >= monthStart);
  const sessionsToday = sessions.filter((session: any) => new Date(session.creado_en || session.created_at || 0) >= today);
  const sessionsMonth = sessions.filter((session: any) => new Date(session.creado_en || session.created_at || 0) >= monthStart);
  const timedSessionsMonth = sessionsMonth.filter((session: any) => String(session.tipo_sesion || session.modo_practica || '').toUpperCase() === 'CRONOMETRADO');
  const paymentsToday = successfulPayments.filter((payment: any) => new Date(payment.fecha_pago || payment.creado_en || 0) >= today);
  const paymentsMonth = successfulPayments.filter((payment: any) => new Date(payment.fecha_pago || payment.creado_en || 0) >= monthStart);
  const practiceUserIds = new Set(sessions.map((session: any) => session.id_usuario).filter(Boolean));
  const realPayingUserIds = new Set(successfulPayments.map((payment: any) => payment.id_usuario).filter(Boolean));
  const activeMemberUserIds = new Set(activeMemberships.map((membership: any) => membership.id_usuario).filter(Boolean));
  const subscribedUserIds = new Set([...realPayingUserIds, ...activeMemberUserIds]);
  const practicedUnpaidUserIds = Array.from(practiceUserIds).filter((userId) => !subscribedUserIds.has(userId));

  const allPageViews = analytics.rows.filter((row: any) => row.tipo_evento === 'page_view');
  const humanPageViews = allPageViews.filter((row: any) => classifyDevice(row.user_agent) !== 'bot');
  const botPageViews = allPageViews.filter((row: any) => classifyDevice(row.user_agent) === 'bot');
  const humanPageViewsMonth = humanPageViews.filter((event: any) => new Date(event.creado_en || 0) >= monthStart);
  const humanPageViewsToday = humanPageViews.filter((event: any) => new Date(event.creado_en || 0) >= today);
  const signedInPageViewsMonth = humanPageViewsMonth.filter((event: any) => event.id_usuario);
  const { dailyRevenue, monthlyRevenue } = buildRevenueSeries(successfulPayments, today, monthStart);
  const trafficDaily = buildTrafficSeries(humanPageViews, today);
  const funnelRegistered = cohortUsers.length;
  const funnelStarted = cohortUsers.filter((user: any) => Number(user.started_sessions || 0) > 0).length;
  const funnelCompleted = cohortUsers.filter((user: any) => Number(user.completed_sessions || 0) > 0).length;
  const funnelRepeated = cohortUsers.filter((user: any) => Number(user.attempts || 0) > 1).length;
  const funnelReturned = cohortUsers.filter((user: any) => user.returned_after_registration === true).length;

  const paymentAmountByUser = new Map<number, number>();
  successfulPayments.forEach((payment: any) => {
    paymentAmountByUser.set(
      payment.id_usuario,
      money((paymentAmountByUser.get(payment.id_usuario) || 0) + Number(payment.monto || 0)),
    );
  });

  const practiceCountByUser = new Map<number, number>();
  sessions.forEach((session: any) => {
    practiceCountByUser.set(session.id_usuario, (practiceCountByUser.get(session.id_usuario) || 0) + 1);
  });

  const activeMembershipByUser = new Map<number, any>();
  activeMemberships.forEach((membership: any) => {
    if (!activeMembershipByUser.has(membership.id_usuario)) {
      activeMembershipByUser.set(membership.id_usuario, membership);
    }
  });

  const activePlanValue = activeMemberships.reduce((sum: number, membership: any) => {
    const plan = firstRelation(membership.planes_membresia);
    return sum + Number(plan?.precio || 0);
  }, 0);

  return {
    generatedAt: new Date().toISOString(),
    adminRole: ADMIN_ROLE,
    analyticsReady: analytics.ready,
    analyticsTruncated: analytics.truncated,
    metrics: {
      totalUsers,
      usersToday,
      usersThisMonth,
      pageViewsToday: humanPageViewsToday.length,
      pageViewsThisMonth: humanPageViewsMonth.length,
      pageViews30Days: humanPageViews.length,
      uniqueVisitorsToday: uniqueVisitors(humanPageViewsToday),
      uniqueVisitorsThisMonth: uniqueVisitors(humanPageViewsMonth),
      uniqueVisitors30Days: uniqueVisitors(humanPageViews),
      humanVisitors30Days: uniqueVisitors(humanPageViews),
      botVisitors30Days: uniqueVisitors(botPageViews),
      signedInVisitorsThisMonth: new Set(signedInPageViewsMonth.map((row: any) => row.id_usuario)).size,
      practiceSessionsTotal: sessions.length,
      practiceSessionsToday: sessionsToday.length,
      practiceSessionsThisMonth: sessionsMonth.length,
      timedSessionsThisMonth: timedSessionsMonth.length,
      practicedUsers: practiceUserIds.size,
      practicedButUnpaidUsers: practicedUnpaidUserIds.length,
      payingUsers: subscribedUserIds.size,
      realPayingUsers: realPayingUserIds.size,
      activeSubscriptions: activeMemberships.length,
      expiredSubscriptions: Math.max(memberships.length - activeMemberships.length, 0),
      subscriptionsThisMonth: membershipsThisMonth.length,
      subscriptionsExpiring7Days: expiringMemberships.length,
      activePlanValue: money(activePlanValue),
      revenueToday: sumPayments(paymentsToday),
      revenueThisMonth: sumPayments(paymentsMonth),
      revenueTotal: sumPayments(successfulPayments),
      paymentsToday: paymentsToday.length,
      paymentsThisMonth: paymentsMonth.length,
      paymentsTotal: successfulPayments.length,
      conversionFromPractice: percentage(subscribedUserIds.size, practiceUserIds.size),
      registeredToPaidConversion: percentage(realPayingUserIds.size, totalUsers),
    },
    devices: buildDevices(humanPageViews),
    funnel: {
      registered: funnelRegistered,
      started: funnelStarted,
      completed: funnelCompleted,
      repeated: funnelRepeated,
      returned: funnelReturned,
      startedRate: percentage(funnelStarted, funnelRegistered),
      completedRate: percentage(funnelCompleted, funnelRegistered),
      repeatedRate: percentage(funnelRepeated, funnelRegistered),
      returnedRate: percentage(funnelReturned, funnelRegistered),
    },
    series: {
      dailyRevenue,
      monthlyRevenue,
      trafficDaily,
    },
    topPages: buildTopPages(humanPageViews),
    topSources: buildTopSources(humanPageViews),
    recentUsers: recentUsers.map((user: any) => {
      const activeMembership = activeMembershipByUser.get(user.id);
      const hasPaid = realPayingUserIds.has(user.id);
      const hasPracticed = practiceUserIds.has(user.id);
      return {
        id: user.id,
        name: user.display_name,
        email: user.email,
        role: user.role || 'USUARIO',
        registeredAt: user.registered_at,
        practiceSessions: Number(user.practice_sessions || practiceCountByUser.get(user.id) || 0),
        paidAmount: Number(user.paid_amount || paymentAmountByUser.get(user.id) || 0),
        membershipEndsAt: user.membership_ends_at || activeMembership?.fecha_fin || null,
        status: user.status || (activeMembership
          ? 'Suscripcion activa'
          : hasPaid
          ? 'Pago anterior'
          : hasPracticed
          ? 'Practico sin pagar'
          : 'Registro'),
        firstDevice: user.first_device,
        lastDevice: user.last_device,
        lastActiveAt: user.last_active_at,
        activeDays: Number(user.active_days || 0),
        startedSessions: Number(user.started_sessions || 0),
        completedSessions: Number(user.completed_sessions || 0),
        attempts: Number(user.attempts || 0),
        returnedAfterRegistration: user.returned_after_registration === true,
        firstPracticeAt: user.first_practice_at,
        minutesToFirstPractice: user.minutes_to_first_practice === null
          ? null
          : Number(user.minutes_to_first_practice),
      };
    }),
    recentPayments: successfulPayments.slice(0, 50).map((payment: any) => {
      const customer = firstRelation(payment.usuarios);
      const plan = firstRelation(payment.planes_membresia);
      return {
        id: payment.id,
        userId: payment.id_usuario,
        customer: customer?.correo_electronico || payment.correo_cliente || '',
        plan: plan?.nombre || 'Plan ' + payment.id_plan_membresia,
        method: payment.metodo_pago,
        amount: Number(payment.monto || 0),
        currency: payment.moneda || 'PEN',
        status: payment.estado,
        paidAt: payment.fecha_pago || payment.creado_en,
      };
    }),
    subscriptions: memberships.slice(0, 100).map((membership: any) => {
      const customer = firstRelation(membership.usuarios);
      const plan = firstRelation(membership.planes_membresia);
      return {
        id: membership.id,
        userId: membership.id_usuario,
        customer: customer?.correo_electronico || 'Usuario ' + membership.id_usuario,
        customerName: [customer?.primer_nombre, customer?.apellido].filter(Boolean).join(' '),
        plan: plan?.nombre || 'Plan ' + membership.id_plan_membresia,
        amount: Number(plan?.precio || 0),
        durationMonths: Number(plan?.duracion_meses || 1),
        status: membershipStatus(membership, now),
        startedAt: membership.fecha_inicio,
        endsAt: membership.fecha_fin,
        daysRemaining: daysRemaining(membership.fecha_fin, now),
      };
    }),
  };
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const headers = Array.from(rows.reduce((keys, row) => {
    Object.keys(row).forEach((key) => keys.add(key));
    return keys;
  }, new Set<string>()));

  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function csvResponse(filename: string, rows: Record<string, unknown>[]) {
  return new Response(toCsv(rows), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + filename + '"',
    },
  });
}

export async function handleGetAdminOverview(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;

    const overview = await buildAdminOverview(admin.supabase);
    return jsonResponse(overview);
  } catch (error) {
    console.error('Admin overview error:', error);
    return errorResponse('No se pudo cargar el panel administrador', 500);
  }
}

export async function handleGetAdminUsers(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;

    const url = new URL(req.url);
    const page = Math.max(Number.parseInt(url.searchParams.get('page') || '1', 10), 1);
    const size = Math.min(Math.max(Number.parseInt(url.searchParams.get('size') || '10', 10), 5), 100);
    const direction = url.searchParams.get('direction') === 'asc' ? 'asc' : 'desc';
    const search = cleanAdminSearch(url.searchParams.get('search'));
    const device = normalizeDeviceFilter(url.searchParams.get('device'));
    const sortColumns: Record<string, string> = {
      name: 'display_name',
      email: 'email',
      status: 'status',
      practices: 'practice_sessions',
      paid: 'paid_amount',
      registeredAt: 'registered_at',
      device: 'first_device',
      lastActiveAt: 'last_active_at',
      activeDays: 'active_days',
    };
    const sort = Object.hasOwn(sortColumns, url.searchParams.get('sort') || '')
      ? String(url.searchParams.get('sort'))
      : 'registeredAt';
    const offset = (page - 1) * size;

    let query = admin.supabase
      .from('admin_user_summary')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
    }
    if (device) {
      query = query.eq('first_device', device);
    }

    const { data, error, count } = await query
      .order(sortColumns[sort], { ascending: direction === 'asc', nullsFirst: false })
      .order('id', { ascending: false })
      .range(offset, offset + size - 1);

    if (error) throw error;

    const total = count || 0;
    return jsonResponse({
      items: (data || []).map((user: any) => ({
        id: user.id,
        name: user.display_name,
        email: user.email,
        username: user.username,
        role: user.role,
        registeredAt: user.registered_at,
        practiceSessions: Number(user.practice_sessions || 0),
        paymentCount: Number(user.payment_count || 0),
        paidAmount: Number(user.paid_amount || 0),
        membershipStartedAt: user.membership_started_at,
        membershipEndsAt: user.membership_ends_at,
        status: user.status,
        firstDevice: user.first_device,
        lastDevice: user.last_device,
        lastActiveAt: user.last_active_at,
        activeDays: Number(user.active_days || 0),
        startedSessions: Number(user.started_sessions || 0),
        completedSessions: Number(user.completed_sessions || 0),
        attempts: Number(user.attempts || 0),
        returnedAfterRegistration: user.returned_after_registration === true,
        firstPracticeAt: user.first_practice_at,
        minutesToFirstPractice: user.minutes_to_first_practice === null
          ? null
          : Number(user.minutes_to_first_practice),
      })),
      pagination: {
        page,
        size,
        total,
        totalPages: Math.max(Math.ceil(total / size), 1),
      },
      sort: { field: sort, direction },
      search,
      device,
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return errorResponse('No se pudo cargar la lista de usuarios', 500);
  }
}

export async function handleExportAdminReport(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'summary';
    const overview = await buildAdminOverview(admin.supabase);

    if (type === 'users') {
      const { data, error } = await admin.supabase
        .from('admin_user_summary')
        .select('id, display_name, email, role, status, practice_sessions, payment_count, paid_amount, membership_ends_at, registered_at, first_device, last_device, last_active_at, active_days, started_sessions, completed_sessions, attempts, returned_after_registration, first_practice_at, minutes_to_first_practice')
        .order('registered_at', { ascending: false })
        .limit(10000);
      if (error) throw error;
      return csvResponse('usuarios-admin.csv', data || []);
    }
    if (type === 'payments') {
      return csvResponse('pagos-admin.csv', overview.recentPayments);
    }
    if (type === 'subscriptions') {
      return csvResponse('suscripciones-admin.csv', overview.subscriptions);
    }
    if (type === 'traffic') {
      return csvResponse('trafico-admin.csv', overview.topPages);
    }

    const rows = Object.entries(overview.metrics).map(([metric, value]) => ({ metric, value }));
    return csvResponse('resumen-admin.csv', rows);
  } catch (error) {
    console.error('Admin export error:', error);
    return errorResponse('No se pudo exportar el reporte', 500);
  }
}
