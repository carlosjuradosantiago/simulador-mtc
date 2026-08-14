import { getSupabaseClient } from '../_shared/supabase.ts';
import {
  enviarEmailConfirmacionConsumidor,
  enviarEmailNotificacionProveedor,
  PROVEEDOR_CONFIG
} from '../_shared/email.ts';
import { addBusinessDays } from '../_shared/complaint-deadline.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-auth-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function generarNumeroReclamo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LR-${year}${month}${day}-${random}`;
}

function validarBodyReclamo(body: any) {
  if (!body || typeof body !== 'object') return 'Solicitud inválida';
  const requiredText = [
    ['tipoDocumento', 2, 15], ['numeroDocumento', 5, 20], ['nombres', 2, 100], ['apellidos', 2, 100],
    ['email', 5, 160], ['telefono', 7, 20], ['direccion', 5, 200], ['departamento', 2, 80],
    ['provincia', 2, 80], ['distrito', 2, 80], ['tipoBien', 4, 20], ['descripcionBien', 5, 240],
    ['fechaIncidente', 10, 10], ['detalleReclamo', 10, 2000], ['pedidoConsumidor', 5, 1000],
  ];
  for (const [field, min, max] of requiredText) {
    const value = typeof body[field] === 'string' ? body[field].trim() : '';
    if (value.length < min || value.length > max) return `El campo ${field} es inválido`;
  }
  if (!['DNI', 'CE', 'PASAPORTE'].includes(body.tipoDocumento.trim().toUpperCase())) return 'Tipo de documento inválido';
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(body.email.trim())) return 'Correo electrónico inválido';
  if (!/^\d{7,15}$/.test(body.telefono.replace(/\D/g, ''))) return 'Teléfono inválido';
  if (!body.tipoReclamo || !['RECLAMO', 'QUEJA'].includes(body.tipoReclamo)) {
    return 'Tipo de reclamación inválido';
  }
  if (!['SERVICIO', 'PRODUCTO'].includes(body.tipoBien.trim().toUpperCase())) return 'Tipo de bien inválido';
  const incidentTime = Date.parse(`${body.fechaIncidente}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.fechaIncidente) || Number.isNaN(incidentTime) || incidentTime > Date.now()) return 'Fecha del incidente inválida';
  if (body.montoReclamado != null && (!Number.isFinite(Number(body.montoReclamado)) || Number(body.montoReclamado) < 0)) return 'Monto reclamado inválido';
  if (!body.aceptaTerminos) {
    return 'Debe aceptar los términos y condiciones';
  }
  return null;
}

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function escapeHtml(value: unknown) {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  return clean(value).replace(/[&<>"']/g, (character) => entities[character]);
}

export async function handleRegistrarReclamo(req: Request) {
  try {
    const rawBody = await req.text();
    if (rawBody.length > 25_000) return response({ error: 'La solicitud excede el tamaño permitido' }, 413);
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return response({ error: 'Solicitud JSON inválida' }, 400);
    }
    const validationError = validarBodyReclamo(body);
    if (validationError) {
      return response({ error: validationError }, 400);
    }

    for (const field of ['tipoDocumento', 'numeroDocumento', 'nombres', 'apellidos', 'email', 'telefono', 'direccion', 'departamento', 'provincia', 'distrito', 'tipoBien', 'descripcionBien', 'tipoReclamo', 'fechaIncidente', 'detalleReclamo', 'pedidoConsumidor']) {
      body[field] = clean(body[field]);
    }
    body.tipoDocumento = body.tipoDocumento.toUpperCase();
    body.tipoBien = body.tipoBien.toUpperCase();
    body.tipoReclamo = body.tipoReclamo.toUpperCase();
    body.email = body.email.toLowerCase();

    const supabase = getSupabaseClient();
    const fechaRegistro = new Date();
    const fechaLimiteRespuesta = addBusinessDays(fechaRegistro, 15);
    const nombreCompleto = `${body.nombres} ${body.apellidos}`.trim();

    let data: any = null;
    let error: any = null;
    let numeroReclamo = '';

    for (let attempt = 0; attempt < 5; attempt++) {
      numeroReclamo = generarNumeroReclamo();
      const insertResult = await supabase
        .from('libro_reclamaciones')
        .insert({
          numero_reclamo: numeroReclamo,
          fecha_registro: fechaRegistro.toISOString(),
          fecha_limite_respuesta: fechaLimiteRespuesta?.toISOString() || null,
          tipo_documento: body.tipoDocumento,
          numero_documento: body.numeroDocumento,
          nombres: body.nombres,
          apellidos: body.apellidos,
          nombre_completo: nombreCompleto,
          direccion: body.direccion,
          departamento: body.departamento,
          provincia: body.provincia,
          distrito: body.distrito,
          telefono: body.telefono,
          email: body.email,
          es_menor_de_edad: body.esMenorDeEdad ?? false,
          nombre_padre_tutor: body.nombrePadreOTutor || null,
          tipo_bien: body.tipoBien,
          monto_reclamado: body.montoReclamado || null,
          descripcion_bien: body.descripcionBien,
          tipo_reclamo: body.tipoReclamo,
          fecha_incidente: body.fechaIncidente,
          detalle_reclamo: body.detalleReclamo,
          pedido_consumidor: body.pedidoConsumidor,
          autoriza_envio_correo: true,
          acepta_terminos: body.aceptaTerminos,
          estado_reclamo: 'PENDIENTE',
          fecha_respuesta: null,
          respuesta_proveedor: null,
          ip_origen: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
          user_agent: req.headers.get('user-agent') || null
        })
        .select('id')
        .single();

      data = insertResult.data;
      error = insertResult.error;
      if (!error || error.code !== '23505') break;
    }

    if (error || !data) {
      console.error('[LIBRO] Error al insertar reclamo:', error);
      return response({ error: 'No pudimos registrar la solicitud' }, 500);
    }

    const emailData = {
      numeroReclamo,
      fechaRegistro: fechaRegistro.toISOString(),
      fechaLimiteRespuesta: fechaLimiteRespuesta?.toISOString() || null,
      tipoReclamo: body.tipoReclamo,
      estadoReclamo: 'PENDIENTE',
      nombreCompleto: escapeHtml(nombreCompleto),
      tipoDocumento: body.tipoDocumento,
      numeroDocumento: escapeHtml(body.numeroDocumento),
      email: body.email,
      telefono: escapeHtml(body.telefono),
      direccion: escapeHtml(body.direccion),
      departamento: escapeHtml(body.departamento),
      provincia: escapeHtml(body.provincia),
      distrito: escapeHtml(body.distrito),
      tipoBien: body.tipoBien,
      descripcionBien: escapeHtml(body.descripcionBien),
      montoReclamado: body.montoReclamado,
      fechaIncidente: body.fechaIncidente,
      detalleReclamo: escapeHtml(body.detalleReclamo),
      pedidoConsumidor: escapeHtml(body.pedidoConsumidor)
    };

    const emailPromises = [
      enviarEmailNotificacionProveedor(emailData),
      enviarEmailConfirmacionConsumidor(emailData),
    ];
    const emailResults = await Promise.allSettled(emailPromises);
    const consumerEmailResult = emailResults[1];
    const consumerEmailSent = consumerEmailResult?.status === 'fulfilled' && consumerEmailResult.value?.success === true;

    return response({
      numeroReclamo,
      fechaRegistro: fechaRegistro.toISOString(),
      fechaLimiteRespuesta: fechaLimiteRespuesta?.toISOString() || null,
      tipoReclamo: body.tipoReclamo,
      estadoReclamo: 'PENDIENTE',
      emailsEnviados: consumerEmailSent,
      mensaje: 'Su solicitud ha sido registrada correctamente.'
    }, 201);
  } catch (err) {
    console.error('[LIBRO] Error:', err);
    return response({ error: 'Error interno del servidor' }, 500);
  }
}

export async function handleConsultarReclamo(_req: Request, numeroReclamo: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('libro_reclamaciones')
      .select(`
        numero_reclamo,
        fecha_registro,
        fecha_limite_respuesta,
        tipo_reclamo,
        estado_reclamo,
        fecha_respuesta
      `)
      .eq('numero_reclamo', numeroReclamo)
      .single();

    if (error || !data) {
      return response({ error: 'Reclamo no encontrado' }, 404);
    }

    return response({
      numeroReclamo: data.numero_reclamo,
      fechaRegistro: data.fecha_registro,
      fechaLimiteRespuesta: data.fecha_limite_respuesta,
      tipoReclamo: data.tipo_reclamo,
      estadoReclamo: data.estado_reclamo,
      fechaRespuesta: data.fecha_respuesta,
      mensaje: 'Consulta exitosa'
    });
  } catch (err) {
    console.error('[LIBRO] Error:', err);
    return response({ error: 'Error interno del servidor' }, 500);
  }
}

export async function handleGetProveedorInfo(_req: Request) {
  return response(PROVEEDOR_CONFIG);
}

export async function handleSetupTable(_req: Request) {
  return response({
    error: 'Gone',
    message: 'La creación/modificación de tablas debe ejecutarse por migraciones.'
  }, 410);
}
