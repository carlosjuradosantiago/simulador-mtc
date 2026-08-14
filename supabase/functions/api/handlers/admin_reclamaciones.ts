import { enviarEmailRespuestaReclamo } from '../_shared/email.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';
import { requireAdmin } from './admin.ts';

const PAGE_SIZE_MAX = 100;
const OPEN_STATUSES = ['PENDIENTE', 'EN_PROCESO'];
const EDITABLE_STATUSES = new Set(OPEN_STATUSES);
const COMPLAINT_FIELDS = `
  id,
  numero_reclamo,
  fecha_registro,
  fecha_limite_respuesta,
  fecha_respuesta,
  tipo_documento,
  numero_documento,
  nombres,
  apellidos,
  nombre_completo,
  direccion,
  departamento,
  provincia,
  distrito,
  telefono,
  email,
  es_menor_de_edad,
  nombre_padre_tutor,
  tipo_bien,
  monto_reclamado,
  descripcion_bien,
  tipo_reclamo,
  fecha_incidente,
  detalle_reclamo,
  pedido_consumidor,
  estado_reclamo,
  respuesta_proveedor,
  respondido_por,
  respuesta_enviada_en,
  respuesta_email_id,
  ultimo_error_envio,
  updated_at
`;

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parsePositiveInteger(value: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function parseComplaintId(value: unknown) {
  const id = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function complaintDueState(row: any, now = new Date()) {
  if (row.estado_reclamo === 'ATENDIDO') return 'ATENDIDO';
  if (!row.fecha_limite_respuesta) return 'SIN_PLAZO';
  const deadline = new Date(row.fecha_limite_respuesta);
  if (Number.isNaN(deadline.getTime())) return 'SIN_PLAZO';
  return deadline < now ? 'VENCIDO' : 'EN_PLAZO';
}

function serializeComplaint(row: any) {
  return {
    id: row.id,
    number: row.numero_reclamo,
    registeredAt: row.fecha_registro,
    responseDeadline: row.fecha_limite_respuesta,
    respondedAt: row.fecha_respuesta,
    documentType: row.tipo_documento,
    documentNumber: row.numero_documento,
    firstNames: row.nombres,
    lastNames: row.apellidos,
    fullName: row.nombre_completo,
    address: row.direccion,
    department: row.departamento,
    province: row.provincia,
    district: row.distrito,
    phone: row.telefono,
    email: row.email,
    isMinor: Boolean(row.es_menor_de_edad),
    guardianName: row.nombre_padre_tutor,
    serviceType: row.tipo_bien,
    amount: row.monto_reclamado == null ? null : Number(row.monto_reclamado),
    serviceDescription: row.descripcion_bien,
    complaintType: row.tipo_reclamo,
    incidentDate: row.fecha_incidente,
    details: row.detalle_reclamo,
    request: row.pedido_consumidor,
    status: row.estado_reclamo,
    response: row.respuesta_proveedor,
    respondedBy: row.respondido_por,
    responseSentAt: row.respuesta_enviada_en,
    responseEmailId: row.respuesta_email_id,
    lastEmailError: row.ultimo_error_envio,
    dueState: complaintDueState(row),
    updatedAt: row.updated_at,
  };
}

async function exactCount(query: any) {
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function complaintCounts(supabase: any) {
  const now = new Date().toISOString();
  const base = () => supabase.from('libro_reclamaciones').select('id', { count: 'exact', head: true });
  const [total, pending, inProgress, attended, overdue, withoutDeadline] = await Promise.all([
    exactCount(base()),
    exactCount(base().eq('estado_reclamo', 'PENDIENTE')),
    exactCount(base().eq('estado_reclamo', 'EN_PROCESO')),
    exactCount(base().eq('estado_reclamo', 'ATENDIDO')),
    exactCount(base().in('estado_reclamo', OPEN_STATUSES).lt('fecha_limite_respuesta', now)),
    exactCount(base().in('estado_reclamo', OPEN_STATUSES).is('fecha_limite_respuesta', null)),
  ]);
  return { total, pending, inProgress, attended, overdue, withoutDeadline };
}

async function findComplaint(supabase: any, id: number) {
  const { data, error } = await supabase
    .from('libro_reclamaciones')
    .select(COMPLAINT_FIELDS)
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data;
}

export async function handleGetAdminComplaints(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;

    const url = new URL(req.url);
    const page = parsePositiveInteger(url.searchParams.get('page'), 1);
    const pageSize = parsePositiveInteger(url.searchParams.get('pageSize'), 25, PAGE_SIZE_MAX);
    const status = cleanText(url.searchParams.get('status') || 'TODOS', 20).toUpperCase();
    const type = cleanText(url.searchParams.get('type') || 'TODOS', 20).toUpperCase();
    const search = cleanText(url.searchParams.get('search'), 80)
      .replace(/[^a-zA-Z0-9@._+\-\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const validStatuses = new Set(['TODOS', 'PENDIENTE', 'EN_PROCESO', 'ATENDIDO', 'VENCIDOS', 'SIN_PLAZO']);
    const validTypes = new Set(['TODOS', 'RECLAMO', 'QUEJA']);
    if (!validStatuses.has(status) || !validTypes.has(type)) {
      return errorResponse('Filtros de reclamaciones invalidos', 400);
    }

    let query = admin.supabase
      .from('libro_reclamaciones')
      .select(COMPLAINT_FIELDS, { count: 'exact' });

    if (status === 'VENCIDOS') {
      query = query.in('estado_reclamo', OPEN_STATUSES).lt('fecha_limite_respuesta', new Date().toISOString());
    } else if (status === 'SIN_PLAZO') {
      query = query.in('estado_reclamo', OPEN_STATUSES).is('fecha_limite_respuesta', null);
    } else if (status !== 'TODOS') {
      query = query.eq('estado_reclamo', status);
    }
    if (type !== 'TODOS') query = query.eq('tipo_reclamo', type);
    if (search) {
      query = query.or(`numero_reclamo.ilike.%${search}%,email.ilike.%${search}%,nombre_completo.ilike.%${search}%,numero_documento.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const [{ data, error, count }, counts] = await Promise.all([
      query
        .order('fecha_registro', { ascending: false })
        .range(from, from + pageSize - 1),
      complaintCounts(admin.supabase),
    ]);
    if (error) throw error;

    return jsonResponse({
      items: (data || []).map(serializeComplaint),
      counts,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      },
    });
  } catch (error) {
    console.error('[ADMIN COMPLAINTS] List error', { message: cleanText(error, 220) });
    return errorResponse('No se pudieron cargar las reclamaciones', 500);
  }
}

export async function handleGetAdminComplaint(req: Request, rawId: string) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;
    const id = parseComplaintId(rawId);
    if (!id) return errorResponse('Reclamacion invalida', 400);
    const complaint = await findComplaint(admin.supabase, id);
    if (!complaint) return errorResponse('Reclamacion no encontrada', 404);
    return jsonResponse(serializeComplaint(complaint));
  } catch (error) {
    console.error('[ADMIN COMPLAINTS] Detail error', { message: cleanText(error, 220) });
    return errorResponse('No se pudo cargar la reclamacion', 500);
  }
}

export async function handleUpdateAdminComplaintStatus(req: Request, rawId: string) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;
    const id = parseComplaintId(rawId);
    if (!id) return errorResponse('Reclamacion invalida', 400);

    const body = await req.json().catch(() => null);
    const status = cleanText(body?.status, 20).toUpperCase();
    if (!EDITABLE_STATUSES.has(status)) {
      return errorResponse('El estado debe ser PENDIENTE o EN_PROCESO', 400);
    }
    const current = await findComplaint(admin.supabase, id);
    if (!current) return errorResponse('Reclamacion no encontrada', 404);
    if (current.estado_reclamo === 'ATENDIDO') {
      return errorResponse('Una reclamacion atendida conserva su respuesta como evidencia', 409);
    }

    const { data, error } = await admin.supabase
      .from('libro_reclamaciones')
      .update({ estado_reclamo: status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(COMPLAINT_FIELDS)
      .single();
    if (error || !data) throw error || new Error('Sin datos despues de actualizar');
    return jsonResponse(serializeComplaint(data));
  } catch (error) {
    console.error('[ADMIN COMPLAINTS] Status error', { message: cleanText(error, 220) });
    return errorResponse('No se pudo actualizar el estado', 500);
  }
}

export async function handleRespondAdminComplaint(req: Request, rawId: string) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;
    const id = parseComplaintId(rawId);
    if (!id) return errorResponse('Reclamacion invalida', 400);

    const body = await req.json().catch(() => null);
    const responseText = cleanText(body?.response, 4000);
    if (responseText.length < 10) {
      return errorResponse('La respuesta debe tener al menos 10 caracteres', 400);
    }

    const complaint = await findComplaint(admin.supabase, id);
    if (!complaint) return errorResponse('Reclamacion no encontrada', 404);
    if (complaint.estado_reclamo === 'ATENDIDO' || complaint.respuesta_enviada_en) {
      return errorResponse('Esta reclamacion ya fue respondida', 409);
    }

    const respondedAt = new Date().toISOString();
    const emailResult = await enviarEmailRespuestaReclamo({
      numeroReclamo: escapeHtml(complaint.numero_reclamo),
      fechaRegistro: complaint.fecha_registro,
      fechaRespuesta: respondedAt,
      tipoReclamo: complaint.tipo_reclamo,
      nombreCompleto: escapeHtml(complaint.nombre_completo),
      email: complaint.email,
      descripcionBien: escapeHtml(complaint.descripcion_bien),
      detalleReclamo: escapeHtml(complaint.detalle_reclamo),
      pedidoConsumidor: escapeHtml(complaint.pedido_consumidor),
      respuestaProveedor: escapeHtml(responseText),
    });

    if (!emailResult?.success) {
      await admin.supabase
        .from('libro_reclamaciones')
        .update({
          estado_reclamo: 'EN_PROCESO',
          ultimo_error_envio: cleanText(emailResult?.error || 'Error de correo', 500),
          updated_at: respondedAt,
        })
        .eq('id', id);
      return errorResponse('No se pudo enviar la respuesta. El reclamo sigue en proceso para reintentar.', 502);
    }

    const responder = admin.user.correo_electronico
      || [admin.user.primer_nombre, admin.user.apellido].filter(Boolean).join(' ')
      || 'Administrador';
    const { data, error } = await admin.supabase
      .from('libro_reclamaciones')
      .update({
        estado_reclamo: 'ATENDIDO',
        respuesta_proveedor: responseText,
        fecha_respuesta: respondedAt,
        respondido_por: cleanText(responder, 160),
        respuesta_enviada_en: respondedAt,
        respuesta_email_id: cleanText(emailResult.messageId, 160) || null,
        ultimo_error_envio: null,
        updated_at: respondedAt,
      })
      .eq('id', id)
      .is('respuesta_enviada_en', null)
      .select(COMPLAINT_FIELDS)
      .maybeSingle();
    if (error) throw error;
    if (!data) return errorResponse('La reclamacion ya fue atendida por otro administrador', 409);
    return jsonResponse(serializeComplaint(data));
  } catch (error) {
    console.error('[ADMIN COMPLAINTS] Response error', { message: cleanText(error, 220) });
    return errorResponse('No se pudo enviar la respuesta', 500);
  }
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  return /[",\n\r]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
}

export async function handleExportAdminComplaints(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.response;
    const { data, error } = await admin.supabase
      .from('libro_reclamaciones')
      .select(COMPLAINT_FIELDS)
      .order('fecha_registro', { ascending: false })
      .limit(10000);
    if (error) throw error;

    const headers = [
      'Numero', 'Registro', 'Limite', 'Estado', 'Tipo', 'Consumidor', 'Documento', 'Correo', 'Telefono',
      'Direccion', 'Servicio', 'Monto', 'Detalle', 'Pedido', 'Respuesta', 'Respondido por', 'Respuesta enviada',
    ];
    const rows = (data || []).map((row: any) => [
      row.numero_reclamo, row.fecha_registro, row.fecha_limite_respuesta, row.estado_reclamo, row.tipo_reclamo,
      row.nombre_completo, `${row.tipo_documento} ${row.numero_documento}`, row.email, row.telefono,
      [row.direccion, row.distrito, row.provincia, row.departamento].filter(Boolean).join(', '),
      row.descripcion_bien, row.monto_reclamado, row.detalle_reclamo, row.pedido_consumidor,
      row.respuesta_proveedor, row.respondido_por, row.respuesta_enviada_en,
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="reclamaciones-admin.csv"',
      },
    });
  } catch (error) {
    console.error('[ADMIN COMPLAINTS] Export error', { message: cleanText(error, 220) });
    return errorResponse('No se pudieron exportar las reclamaciones', 500);
  }
}
