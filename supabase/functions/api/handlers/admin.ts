import { getUserFromToken } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, jsonResponse, unauthorizedResponse } from '../_shared/response.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const DEFAULT_ADMIN_EMAILS = ['ivan.carlos23@gmail.com'];
const SUCCESSFUL_PAYMENT_STATUSES = new Set(['exitoso', 'exitosa', 'pagado', 'pagada', 'aprobado', 'aprobada', 'success', 'succeeded']);
const DEFAULT_MONTHLY_PRICE = 12;

function getAdminEmails() {
  const configured = Deno.env.get('ADMIN_EMAILS');
  const emails = configured
    ? configured.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ADMIN_EMAILS;
  return new Set(emails);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function addMonths(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + amount);
  return nextDate;
}

function dateKey(value: Date | string | null | undefined) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function monthKey(value: Date | string | null | undefined) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 7);
}

function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function isSuccessfulPayment(payment: any) {
  return SUCCESSFUL_PAYMENT_STATUSES.has(String(payment?.estado ?? '').toLowerCase());
}

function sumPayments(payments: any[]) {
  return money(payments.reduce((sum, payment) => sum + Number(payment.monto || 0), 0));
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function uniqueCount(rows: any[], key: string) {
  return new Set(rows.map((row) => row?.[key]).filter(Boolean)).size;
}

async function requireAdmin(req: Request) {
  const user = await getUserFromToken(req);
  if (!user?.userId) return { ok: false, response: unauthorizedResponse() };

  const supabase = getSupabaseClient();
  const { data: dbUser, error } = await supabase
    .from('usuarios')
    .select('id, correo_electronico, primer_nombre, apellido, nombre_usuario')
    .eq('id', user.userId)
    .single();

  if (error || !dbUser) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const isAdmin = getAdminEmails().has(String(dbUser.correo_electronico || '').toLowerCase());
  if (!isAdmin) {
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
    .select('visitor_id, id_usuario, tipo_evento, ruta, creado_en', { count: 'exact' })
    .gte('creado_en', from)
    .order('creado_en', { ascending: false })
    .limit(10000);

  if (error) {
    if (error.code === '42P01') {
      return { ready: false, rows: [], count: 0 };
    }
    throw error;
  }

  return { ready: true, rows: data || [], count: count || 0 };
}

function buildSeries(payments: any[]) {
  const today = startOfToday();
  const dailyRevenue = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(today, index - 13);
    return { key: dateKey(date), label: date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }), revenue: 0, payments: 0 };
  });

  const monthStart = startOfMonth();
  const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
    const date = addMonths(monthStart, index - 5);
    return { key: monthKey(date), label: date.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }), revenue: 0, payments: 0 };
  });

  const dailyMap = new Map(dailyRevenue.map((item) => [item.key, item]));
  const monthlyMap = new Map(monthlyRevenue.map((item) => [item.key, item]));

  payments.forEach((payment) => {
    const paidAt = payment.fecha_pago || payment.creado_en;
    const day = dailyMap.get(dateKey(paidAt));
    const month = monthlyMap.get(monthKey(paidAt));
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

function buildMarketProjection(plans: any[]) {
  const monthlyPlan = plans.find((plan) => Number(plan.duracion_meses) === 1) || plans[0];
  const monthlyPrice = Number(monthlyPlan?.precio || DEFAULT_MONTHLY_PRICE);
  const conservativeMarket = 230880;
  const broadMarket = 522000;
  const conservativeSubscribers = Math.round(conservativeMarket * 0.01);
  const broadSubscribers = Math.round(broadMarket * 0.01);
  const conservativeMonthlySubscribers = conservativeSubscribers / 12;
  const broadMonthlySubscribers = broadSubscribers / 12;

  return {
    sourceYear: 2024,
    source: 'MTC: licencias clase A emitidas',
    conservativeMarket,
    broadMarket,
    conversionRate: 1,
    monthlyPlanPrice: money(monthlyPrice),
    conservativeSubscribers,
    broadSubscribers,
    conservativeMonthlySubscribers: money(conservativeMonthlySubscribers),
    broadMonthlySubscribers: money(broadMonthlySubscribers),
    conservativeMonthlyRevenue: money(conservativeMonthlySubscribers * monthlyPrice),
    broadMonthlyRevenue: money(broadMonthlySubscribers * monthlyPrice),
    conservativeAnnualRevenue: money(conservativeSubscribers * monthlyPrice),
    broadAnnualRevenue: money(broadSubscribers * monthlyPrice),
  };
}

async function buildAdminOverview(supabase: any) {
  const today = startOfToday();
  const monthStart = startOfMonth();
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
    plansResult,
    recentUsersResult,
  ] = await Promise.all([
    countRows(supabase, 'usuarios'),
    countRows(supabase, 'usuarios', 'creado_en', todayIso),
    countRows(supabase, 'usuarios', 'creado_en', monthIso),
    fetchAnalyticsRows(supabase, monthIso),
    supabase.from('sesion_practica').select('id, id_usuario, estado, id_categoria, creado_en, created_at, fecha_fin').order('creado_en', { ascending: false }).limit(10000),
    supabase.from('transacciones_pago').select('id, id_usuario, id_plan_membresia, monto, moneda, metodo_pago, estado, fecha_pago, creado_en, correo_cliente, planes_membresia:id_plan_membresia(nombre, precio, duracion_meses), usuarios:id_usuario(correo_electronico, primer_nombre, apellido, nombre_usuario)').order('creado_en', { ascending: false }).limit(10000),
    supabase.from('membresias_usuario').select('id_usuario, fecha_inicio, fecha_fin, esta_activa').eq('esta_activa', true).gte('fecha_fin', new Date().toISOString()).limit(10000),
    supabase.from('planes_membresia').select('id, nombre, precio, duracion_meses, esta_activo').eq('esta_activo', true).order('precio', { ascending: true }),
    supabase.from('usuarios').select('id, correo_electronico, nombre_usuario, primer_nombre, apellido, creado_en').order('creado_en', { ascending: false }).limit(25),
  ]);

  for (const result of [sessionsResult, transactionsResult, membershipsResult, plansResult, recentUsersResult]) {
    if (result.error) throw result.error;
  }

  const sessions = sessionsResult.data || [];
  const transactions = transactionsResult.data || [];
  const activeMemberships = membershipsResult.data || [];
  const plans = plansResult.data || [];
  const recentUsers = recentUsersResult.data || [];
  const successfulPayments = transactions.filter(isSuccessfulPayment);
  const sessionsToday = sessions.filter((session) => new Date(session.creado_en || session.created_at || 0) >= today);
  const sessionsMonth = sessions.filter((session) => new Date(session.creado_en || session.created_at || 0) >= monthStart);
  const paymentsToday = successfulPayments.filter((payment) => new Date(payment.fecha_pago || payment.creado_en || 0) >= today);
  const paymentsMonth = successfulPayments.filter((payment) => new Date(payment.fecha_pago || payment.creado_en || 0) >= monthStart);
  const practiceUserIds = new Set(sessions.map((session) => session.id_usuario).filter(Boolean));
  const payingUserIds = new Set([
    ...successfulPayments.map((payment) => payment.id_usuario).filter(Boolean),
    ...activeMemberships.map((membership) => membership.id_usuario).filter(Boolean),
  ]);
  const practicedUnpaidUserIds = Array.from(practiceUserIds).filter((userId) => !payingUserIds.has(userId));
  const pageViews = analytics.rows.filter((row) => row.tipo_evento === 'page_view');
  const pageViewsToday = pageViews.filter((event) => new Date(event.creado_en || 0) >= today);
  const visitorKey = (row: any) => row.visitor_id || (row.id_usuario ? `user-${row.id_usuario}` : null);
  const { dailyRevenue, monthlyRevenue } = buildSeries(successfulPayments);

  const paymentAmountByUser = new Map<number, number>();
  successfulPayments.forEach((payment) => {
    paymentAmountByUser.set(payment.id_usuario, money((paymentAmountByUser.get(payment.id_usuario) || 0) + Number(payment.monto || 0)));
  });

  const practiceCountByUser = new Map<number, number>();
  sessions.forEach((session) => {
    practiceCountByUser.set(session.id_usuario, (practiceCountByUser.get(session.id_usuario) || 0) + 1);
  });

  return {
    generatedAt: new Date().toISOString(),
    analyticsReady: analytics.ready,
    metrics: {
      totalUsers,
      usersToday,
      usersThisMonth,
      pageViewsThisMonth: pageViews.length,
      pageViewsToday: pageViewsToday.length,
      uniqueVisitorsThisMonth: new Set(pageViews.map(visitorKey).filter(Boolean)).size,
      uniqueVisitorsToday: new Set(pageViewsToday.map(visitorKey).filter(Boolean)).size,
      practiceSessionsTotal: sessions.length,
      practiceSessionsToday: sessionsToday.length,
      practiceSessionsThisMonth: sessionsMonth.length,
      practicedUsers: practiceUserIds.size,
      practicedButUnpaidUsers: practicedUnpaidUserIds.length,
      payingUsers: payingUserIds.size,
      revenueToday: sumPayments(paymentsToday),
      revenueThisMonth: sumPayments(paymentsMonth),
      revenueTotal: sumPayments(successfulPayments),
      paymentsToday: paymentsToday.length,
      paymentsThisMonth: paymentsMonth.length,
      paymentsTotal: successfulPayments.length,
      conversionFromPractice: percentage(payingUserIds.size, practiceUserIds.size),
    },
    series: {
      dailyRevenue,
      monthlyRevenue,
    },
    marketProjection: buildMarketProjection(plans),
    recentUsers: recentUsers.map((user: any) => ({
      id: user.id,
      name: [user.primer_nombre, user.apellido].filter(Boolean).join(' ') || user.nombre_usuario || user.correo_electronico,
      email: user.correo_electronico,
      registeredAt: user.creado_en,
      practiceSessions: practiceCountByUser.get(user.id) || 0,
      paidAmount: paymentAmountByUser.get(user.id) || 0,
      status: payingUserIds.has(user.id) ? 'Pago' : practiceUserIds.has(user.id) ? 'Practico sin pagar' : 'Registro',
    })),
    recentPayments: successfulPayments.slice(0, 25).map((payment: any) => ({
      id: payment.id,
      userId: payment.id_usuario,
      customer: payment.usuarios?.correo_electronico || payment.correo_cliente || '',
      plan: payment.planes_membresia?.nombre || `Plan ${payment.id_plan_membresia}`,
      method: payment.metodo_pago,
      amount: Number(payment.monto || 0),
      currency: payment.moneda || 'PEN',
      status: payment.estado,
      paidAt: payment.fecha_pago || payment.creado_en,
    })),
  };
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
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
      'Content-Disposition': `attachment; filename="${filename}"`,
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
    return errorResponse('No se pudo cargar el dashboard admin', 500);
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
      return csvResponse('usuarios-admin.csv', overview.recentUsers);
    }

    if (type === 'payments') {
      return csvResponse('pagos-admin.csv', overview.recentPayments);
    }

    const rows = Object.entries(overview.metrics).map(([metric, value]) => ({ metric, value }));
    return csvResponse('resumen-admin.csv', rows);
  } catch (error) {
    console.error('Admin export error:', error);
    return errorResponse('No se pudo exportar el reporte', 500);
  }
}
