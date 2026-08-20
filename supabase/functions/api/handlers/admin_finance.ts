import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';
import { generateAndSendTaxDocument } from '../_shared/sunat.ts';
import { requireAdmin } from './admin.ts';

const CULQI_API_URL = 'https://api.culqi.com/v2';
const MAX_EXPORT_ROWS = 10000;
const SUCCESS_STATUSES = new Set([
  'exitoso', 'exitosa', 'pagado', 'pagada', 'paid',
  'approved', 'aprobado', 'aprobada', 'success', 'succeeded',
]);

function cleanSearch(value: unknown) {
  return String(value || '')
    .replace(/[^\p{L}\p{N}@._\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function firstRelation(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function money(value: unknown) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvResponse(filename: string, rows: Record<string, unknown>[]) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const csv = headers.length
    ? [headers.map(csvEscape).join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n')
    : '';
  return new Response(csv, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function limaDate(value = new Date()) {
  return new Date(value.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function defaultMonthStart() {
  return `${limaDate().slice(0, 7)}-01`;
}

function parseRange(url: URL) {
  const from = url.searchParams.get('from') || defaultMonthStart();
  const to = url.searchParams.get('to') || limaDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new Error('Rango de fechas invalido');
  }
  const start = new Date(`${from}T00:00:00-05:00`);
  const end = new Date(`${to}T23:59:59.999-05:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new Error('Rango de fechas invalido');
  }
  if (end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000) {
    throw new Error('El rango no puede superar 366 dias');
  }
  return { from, to, start, end };
}

function parsePage(url: URL, defaultSize = 20) {
  const page = Math.max(Number.parseInt(url.searchParams.get('page') || '1', 10), 1);
  const size = Math.min(Math.max(Number.parseInt(url.searchParams.get('size') || String(defaultSize), 10), 5), 100);
  return { page, size, offset: (page - 1) * size };
}

function pagination(page: number, size: number, total: number) {
  return { page, size, total, totalPages: Math.max(Math.ceil(total / size), 1) };
}

function paymentEnvironment(chargeId: unknown) {
  const id = String(chargeId || '');
  if (id.startsWith('chr_live_')) return 'Produccion';
  if (id.startsWith('chr_test_')) return 'Prueba';
  return 'Sin verificar';
}

function paymentIsVerified(payment: any) {
  const status = String(payment?.estado || '').toLowerCase();
  return SUCCESS_STATUSES.has(status)
    && payment?.metodo_pago !== 'simulacion'
    && Boolean(payment?.verificado_proveedor_en)
    && /^chr_(?:live|test)_/.test(String(payment?.culqi_charge_id || ''));
}

function mapPayment(payment: any) {
  const customer = firstRelation(payment.usuarios);
  const plan = firstRelation(payment.planes_membresia);
  const receipt = firstRelation(payment.comprobantes_electronicos);
  return {
    id: payment.id,
    userId: payment.id_usuario,
    customer: customer?.correo_electronico || payment.correo_cliente || '',
    customerName: [customer?.primer_nombre, customer?.apellido].filter(Boolean).join(' '),
    plan: plan?.nombre || `Plan ${payment.id_plan_membresia}`,
    amount: Number(payment.monto || 0),
    currency: payment.moneda || 'PEN',
    method: payment.metodo_pago || '',
    status: payment.estado || '',
    paidAt: payment.fecha_pago || payment.creado_en,
    createdAt: payment.creado_en,
    chargeId: payment.culqi_charge_id || null,
    verifiedAt: payment.verificado_proveedor_en || null,
    environment: paymentEnvironment(payment.culqi_charge_id),
    isVerified: paymentIsVerified(payment),
    receipt: receipt ? {
      id: receipt.id,
      type: receipt.tipo_comprobante,
      series: receipt.serie,
      number: receipt.numero,
      status: receipt.estado_sunat,
    } : null,
  };
}

async function queryPayments(supabase: any, url: URL, paged = true) {
  const range = parseRange(url);
  const { page, size, offset } = parsePage(url);
  const search = cleanSearch(url.searchParams.get('search'));
  const direction = url.searchParams.get('direction') === 'asc' ? 'asc' : 'desc';
  const sortColumns: Record<string, string> = {
    date: 'creado_en',
    amount: 'monto',
    status: 'estado',
    method: 'metodo_pago',
  };
  const sort = Object.hasOwn(sortColumns, url.searchParams.get('sort') || '')
    ? String(url.searchParams.get('sort'))
    : 'date';

  let query = supabase
    .from('transacciones_pago')
    .select(`
      id, id_usuario, id_plan_membresia, monto, moneda, metodo_pago, estado,
      fecha_pago, creado_en, correo_cliente, culqi_charge_id, verificado_proveedor_en,
      usuarios:id_usuario(correo_electronico, primer_nombre, apellido),
      planes_membresia:id_plan_membresia(nombre),
      comprobantes_electronicos(id, tipo_comprobante, serie, numero, estado_sunat)
    `, { count: 'exact' })
    .gte('creado_en', range.start.toISOString())
    .lte('creado_en', range.end.toISOString());

  if (search) query = query.or(`correo_cliente.ilike.%${search}%,culqi_charge_id.ilike.%${search}%`);
  query = query
    .order(sortColumns[sort], { ascending: direction === 'asc', nullsFirst: false })
    .order('id', { ascending: false });
  query = paged ? query.range(offset, offset + size - 1) : query.limit(MAX_EXPORT_ROWS);

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    items: (data || []).map(mapPayment),
    pagination: pagination(page, size, count || 0),
    sort: { field: sort, direction },
    range: { from: range.from, to: range.to },
  };
}

function mapReceipt(receipt: any) {
  const customer = firstRelation(receipt.usuarios);
  const transaction = firstRelation(receipt.transacciones_pago);
  return {
    id: receipt.id,
    customer: customer?.correo_electronico || receipt.correo_cliente || '',
    customerName: receipt.nombre_cliente,
    documentNumber: receipt.numero_documento_cliente,
    type: receipt.tipo_comprobante,
    series: receipt.serie,
    number: receipt.numero,
    label: `${receipt.serie}-${String(receipt.numero).padStart(8, '0')}`,
    status: receipt.estado_sunat,
    total: Number(receipt.total || 0),
    currency: receipt.moneda || 'PEN',
    createdAt: receipt.creado_en,
    transactionId: receipt.id_transaccion,
    chargeId: transaction?.culqi_charge_id || null,
    files: {
      pdf: Boolean(receipt.ruta_pdf),
      xml: Boolean(receipt.ruta_xml),
      cdr: Boolean(receipt.ruta_cdr),
    },
  };
}

async function queryReceipts(supabase: any, url: URL, paged = true) {
  const range = parseRange(url);
  const { page, size, offset } = parsePage(url);
  const search = cleanSearch(url.searchParams.get('search'));
  const direction = url.searchParams.get('direction') === 'asc' ? 'asc' : 'desc';
  const sortColumns: Record<string, string> = {
    date: 'creado_en',
    total: 'total',
    type: 'tipo_comprobante',
    status: 'estado_sunat',
    number: 'numero',
  };
  const sort = Object.hasOwn(sortColumns, url.searchParams.get('sort') || '')
    ? String(url.searchParams.get('sort'))
    : 'date';

  let query = supabase
    .from('comprobantes_electronicos')
    .select(`
      id, id_usuario, id_transaccion, tipo_comprobante, serie, numero, estado_sunat,
      numero_documento_cliente, nombre_cliente, correo_cliente, moneda, total,
      ruta_pdf, ruta_xml, ruta_cdr, creado_en,
      usuarios:id_usuario(correo_electronico),
      transacciones_pago:id_transaccion(culqi_charge_id)
    `, { count: 'exact' })
    .gte('creado_en', range.start.toISOString())
    .lte('creado_en', range.end.toISOString());

  if (search) {
    query = query.or(`nombre_cliente.ilike.%${search}%,correo_cliente.ilike.%${search}%,numero_documento_cliente.ilike.%${search}%,serie.ilike.%${search}%`);
  }
  query = query
    .order(sortColumns[sort], { ascending: direction === 'asc', nullsFirst: false })
    .order('id', { ascending: false });
  query = paged ? query.range(offset, offset + size - 1) : query.limit(MAX_EXPORT_ROWS);

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    items: (data || []).map(mapReceipt),
    pagination: pagination(page, size, count || 0),
    sort: { field: sort, direction },
    range: { from: range.from, to: range.to },
  };
}

function providerCreationDate(charge: any) {
  const raw = Number(charge?.creation_date || charge?.created_at || 0);
  if (!raw) return null;
  return new Date(raw < 10_000_000_000 ? raw * 1000 : raw).toISOString();
}

async function listCulqiCharges(start: Date, end: Date) {
  const secretKey = Deno.env.get('CULQI_SECRET_KEY');
  if (!secretKey) throw new Error('La llave privada de Culqi no esta configurada');

  const charges: any[] = [];
  let before = '';
  for (let page = 0; page < 100; page += 1) {
    const url = new URL(`${CULQI_API_URL}/charges`);
    url.searchParams.set('limit', '100');
    url.searchParams.set('creation_date_from', String(Math.floor(start.getTime() / 1000)));
    url.searchParams.set('creation_date_to', String(Math.floor(end.getTime() / 1000)));
    if (before) url.searchParams.set('before', before);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secretKey}`, 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Culqi no pudo listar los cargos (${response.status})`);
    const payload = await response.json();
    const batch = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    charges.push(...batch);
    if (batch.length < 100) break;
    const nextBefore = String(batch.at(-1)?.id || '');
    if (!nextBefore || nextBefore === before) break;
    before = nextBefore;
  }
  return charges;
}

async function buildReconciliation(supabase: any, url: URL) {
  const range = parseRange(url);
  const { data, error } = await supabase
    .from('transacciones_pago')
    .select('id, id_usuario, monto, moneda, metodo_pago, estado, correo_cliente, culqi_charge_id, verificado_proveedor_en, fecha_pago, creado_en')
    .gte('creado_en', range.start.toISOString())
    .lte('creado_en', range.end.toISOString())
    .not('culqi_charge_id', 'is', null)
    .limit(MAX_EXPORT_ROWS);
  if (error) throw error;

  const local = (data || []).filter((payment: any) => SUCCESS_STATUSES.has(String(payment.estado || '').toLowerCase()) && payment.metodo_pago !== 'simulacion');
  const localIds = new Set(local.map((payment: any) => payment.culqi_charge_id).filter(Boolean));
  const appEnvironment = Deno.env.get('APP_ENV') || 'development';
  const provider = (await listCulqiCharges(range.start, range.end)).filter((charge: any) => {
    const metadataEnvironment = String(charge?.metadata?.environment || '');
    return localIds.has(charge?.id) || metadataEnvironment === appEnvironment;
  });
  const providerById = new Map(provider.map((charge: any) => [charge.id, charge]));
  const localById = new Map(local.map((payment: any) => [payment.culqi_charge_id, payment]));
  const rows: Record<string, unknown>[] = [];

  local.forEach((payment: any) => {
    const charge = providerById.get(payment.culqi_charge_id);
    const systemAmount = money(payment.monto);
    const culqiAmount = charge ? money(Number(charge.amount || 0) / 100) : null;
    const sameAmount = charge && Math.round(systemAmount * 100) === Number(charge.amount || 0);
    const sameCurrency = charge && String(payment.moneda || 'PEN').toUpperCase() === String(charge.currency_code || charge.currency || '').toUpperCase();
    rows.push({
      status: !charge ? 'Solo en sistema' : sameAmount && sameCurrency ? 'Conciliado' : 'Monto diferente',
      transactionId: payment.id,
      chargeId: payment.culqi_charge_id,
      customer: payment.correo_cliente,
      method: payment.metodo_pago,
      systemAmount,
      culqiAmount,
      currency: payment.moneda || 'PEN',
      paidAt: payment.fecha_pago || payment.creado_en,
    });
  });

  provider.forEach((charge: any) => {
    if (localById.has(charge.id)) return;
    rows.push({
      status: 'Solo en Culqi',
      transactionId: '',
      chargeId: charge.id,
      customer: charge.email || '',
      method: charge.source?.object === 'token' ? 'tarjeta o Yape' : charge.source?.object || '',
      systemAmount: null,
      culqiAmount: money(Number(charge.amount || 0) / 100),
      currency: charge.currency_code || charge.currency || 'PEN',
      paidAt: providerCreationDate(charge),
    });
  });

  rows.sort((left: any, right: any) => String(right.paidAt || '').localeCompare(String(left.paidAt || '')));
  const systemTotal = money(local.reduce((sum: number, payment: any) => sum + Number(payment.monto || 0), 0));
  const culqiTotal = money(provider.reduce((sum: number, charge: any) => sum + Number(charge.amount || 0) / 100, 0));
  const issues = rows.filter((row: any) => row.status !== 'Conciliado').length;
  return {
    generatedAt: new Date().toISOString(),
    range: { from: range.from, to: range.to },
    environment: appEnvironment === 'production' ? 'Produccion' : 'Prueba',
    summary: {
      systemCount: local.length,
      culqiCount: provider.length,
      matchedCount: rows.filter((row: any) => row.status === 'Conciliado').length,
      issues,
      systemTotal,
      culqiTotal,
      difference: money(culqiTotal - systemTotal),
      balanced: issues === 0 && Math.round(systemTotal * 100) === Math.round(culqiTotal * 100),
    },
    items: rows,
  };
}

export async function handleGetAdminPayments(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;
    return jsonResponse(await queryPayments(admin.supabase, new URL(req.url)));
  } catch (error) {
    console.error('Admin payments error:', error);
    return errorResponse(error instanceof Error ? error.message : 'No se pudieron cargar los pagos', 500);
  }
}

export async function handleGetAdminReceipts(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;
    return jsonResponse(await queryReceipts(admin.supabase, new URL(req.url)));
  } catch (error) {
    console.error('Admin receipts error:', error);
    return errorResponse(error instanceof Error ? error.message : 'No se pudieron cargar los comprobantes', 500);
  }
}

export async function handleGetAdminReconciliation(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;
    return jsonResponse(await buildReconciliation(admin.supabase, new URL(req.url)));
  } catch (error) {
    console.error('Admin reconciliation error:', error);
    return errorResponse(error instanceof Error ? error.message : 'No se pudo conciliar con Culqi', 502);
  }
}

export async function handleGetAdminReceipt(req: Request, receiptId: string) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;
    if (!/^\d+$/.test(receiptId)) return errorResponse('Comprobante no valido', 400);

    const { data: receipt, error } = await admin.supabase
      .from('comprobantes_electronicos')
      .select('id, tipo_comprobante, serie, numero, estado_sunat, ruta_pdf, ruta_xml, ruta_cdr')
      .eq('id', Number(receiptId))
      .single();
    if (error || !receipt) return errorResponse('Comprobante no encontrado', 404);

    const paths = { pdf: receipt.ruta_pdf, xml: receipt.ruta_xml, cdr: receipt.ruta_cdr };
    const urls: Record<string, string | null> = { pdf: null, xml: null, cdr: null };
    for (const [type, path] of Object.entries(paths)) {
      if (!path) continue;
      const { data, error: signError } = await admin.supabase.storage.from('tax-documents').createSignedUrl(String(path), 600);
      if (!signError && data?.signedUrl) urls[type] = data.signedUrl;
    }
    return jsonResponse({
      id: receipt.id,
      label: `${receipt.serie}-${String(receipt.numero).padStart(8, '0')}`,
      type: receipt.tipo_comprobante,
      status: receipt.estado_sunat,
      urls,
    });
  } catch (error) {
    console.error('Admin receipt download error:', error);
    return errorResponse('No se pudo abrir el comprobante', 500);
  }
}

export async function handleRetryAdminReceipt(req: Request, receiptId: string) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;
    if (!/^\d+$/.test(receiptId)) return errorResponse('Comprobante no valido', 400);
    const { data: receipt, error } = await admin.supabase
      .from('comprobantes_electronicos')
      .select('*')
      .eq('id', Number(receiptId))
      .single();
    if (error || !receipt) return errorResponse('Comprobante no encontrado', 404);
    if (receipt.estado_sunat === 'aceptado') {
      return jsonResponse({ success: true, receipt: { id: receipt.id, status: receipt.estado_sunat } });
    }

    const result = await generateAndSendTaxDocument(admin.supabase, receipt);
    return jsonResponse({ success: result.status === 'aceptado', receipt: result });
  } catch (error) {
    console.error('Admin receipt retry error:', error);
    return errorResponse(error instanceof Error ? error.message : 'No se pudo reintentar el comprobante', 502);
  }
}

export async function handleExportAdminFinance(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'payments';
    const range = parseRange(url);
    const suffix = `${range.from}-${range.to}`;

    if (type === 'reconciliation') {
      const report = await buildReconciliation(admin.supabase, url);
      return csvResponse(`conciliacion-culqi-${suffix}.csv`, report.items);
    }
    if (type === 'receipts') {
      const report = await queryReceipts(admin.supabase, url, false);
      return csvResponse(`comprobantes-${suffix}.csv`, report.items.map((receipt: any) => ({
        id: receipt.id,
        comprobante: receipt.label,
        tipo: receipt.type,
        estado: receipt.status,
        cliente: receipt.customer,
        documento: receipt.documentNumber,
        total: receipt.total,
        moneda: receipt.currency,
        fecha: receipt.createdAt,
      })));
    }
    const report = await queryPayments(admin.supabase, url, false);
    return csvResponse(`pagos-${suffix}.csv`, report.items.map((payment: any) => ({
      id: payment.id,
      cliente: payment.customer,
      plan: payment.plan,
      monto: payment.amount,
      moneda: payment.currency,
      metodo: payment.method,
      estado: payment.status,
      ambiente: payment.environment,
      verificado: payment.isVerified,
      cargo_culqi: payment.chargeId,
      fecha: payment.paidAt,
    })));
  } catch (error) {
    console.error('Admin finance export error:', error);
    return errorResponse(error instanceof Error ? error.message : 'No se pudo exportar el reporte financiero', 500);
  }
}
