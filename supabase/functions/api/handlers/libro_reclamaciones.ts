import { getSupabaseClient } from '../_shared/supabase.ts';
import {
  enviarEmailConfirmacionConsumidor,
  enviarEmailNotificacionProveedor,
  PROVEEDOR_CONFIG
} from '../_shared/email.ts';

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

function calcularFechaLimiteRespuesta(fechaRegistro: Date) {
  const fechaLimite = new Date(fechaRegistro);
  fechaLimite.setDate(fechaLimite.getDate() + 30);
  return fechaLimite;
}

function validarBodyReclamo(body: any) {
  if (!body.tipoDocumento || !body.numeroDocumento || !body.nombres || !body.apellidos) {
    return 'Datos del consumidor incompletos';
  }
  if (!body.email) {
    return 'El correo electrónico es requerido';
  }
  if (!body.tipoReclamo || !['RECLAMO', 'QUEJA'].includes(body.tipoReclamo)) {
    return 'Tipo de reclamación inválido';
  }
  if (!body.aceptaTerminos) {
    return 'Debe aceptar los términos y condiciones';
  }
  return null;
}

export async function handleRegistrarReclamo(req: Request) {
  try {
    const body = await req.json();
    const validationError = validarBodyReclamo(body);
    if (validationError) {
      return response({ error: validationError }, 400);
    }

    const supabase = getSupabaseClient();
    const fechaRegistro = new Date();
    const fechaLimiteRespuesta = body.tipoReclamo === 'RECLAMO'
      ? calcularFechaLimiteRespuesta(fechaRegistro)
      : null;
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
          autoriza_envio_correo: body.autorizaEnvioCorreo ?? false,
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
      return response({ error: 'Error al registrar el reclamo', details: error?.message }, 500);
    }

    const emailData = {
      numeroReclamo,
      fechaRegistro: fechaRegistro.toISOString(),
      fechaLimiteRespuesta: fechaLimiteRespuesta?.toISOString() || null,
      tipoReclamo: body.tipoReclamo,
      estadoReclamo: 'PENDIENTE',
      nombreCompleto,
      tipoDocumento: body.tipoDocumento,
      numeroDocumento: body.numeroDocumento,
      email: body.email,
      telefono: body.telefono,
      direccion: body.direccion,
      departamento: body.departamento,
      provincia: body.provincia,
      distrito: body.distrito,
      tipoBien: body.tipoBien,
      descripcionBien: body.descripcionBien,
      montoReclamado: body.montoReclamado,
      fechaIncidente: body.fechaIncidente,
      detalleReclamo: body.detalleReclamo,
      pedidoConsumidor: body.pedidoConsumidor
    };

    const emailPromises = [enviarEmailNotificacionProveedor(emailData)];
    if (body.autorizaEnvioCorreo) {
      emailPromises.push(enviarEmailConfirmacionConsumidor(emailData));
    }
    const emailResults = await Promise.allSettled(emailPromises);
    const emailsEnviados = emailResults.filter((result: any) => result.status === 'fulfilled' && result.value?.success).length;

    return response({
      id: data.id,
      numeroReclamo,
      fechaRegistro: fechaRegistro.toISOString(),
      fechaLimiteRespuesta: fechaLimiteRespuesta?.toISOString() || null,
      tipoReclamo: body.tipoReclamo,
      estadoReclamo: 'PENDIENTE',
      nombreCompleto,
      tipoDocumento: body.tipoDocumento,
      numeroDocumento: body.numeroDocumento,
      email: body.email,
      descripcionBien: body.descripcionBien,
      emailsEnviados: emailsEnviados > 0,
      mensaje: `Su ${body.tipoReclamo.toLowerCase()} ha sido registrado exitosamente.`
    }, 201);
  } catch (err) {
    console.error('[LIBRO] Error:', err);
    return response({ error: 'Error interno del servidor', details: String(err) }, 500);
  }
}

export async function handleConsultarReclamo(_req: Request, numeroReclamo: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('libro_reclamaciones')
      .select(`
        id,
        numero_reclamo,
        fecha_registro,
        fecha_limite_respuesta,
        tipo_reclamo,
        estado_reclamo,
        nombre_completo,
        tipo_documento,
        numero_documento,
        email,
        descripcion_bien,
        fecha_respuesta,
        respuesta_proveedor
      `)
      .eq('numero_reclamo', numeroReclamo)
      .single();

    if (error || !data) {
      return response({ error: 'Reclamo no encontrado' }, 404);
    }

    return response({
      id: data.id,
      numeroReclamo: data.numero_reclamo,
      fechaRegistro: data.fecha_registro,
      fechaLimiteRespuesta: data.fecha_limite_respuesta,
      tipoReclamo: data.tipo_reclamo,
      estadoReclamo: data.estado_reclamo,
      nombreCompleto: data.nombre_completo,
      tipoDocumento: data.tipo_documento,
      numeroDocumento: data.numero_documento,
      email: data.email,
      descripcionBien: data.descripcion_bien,
      fechaRespuesta: data.fecha_respuesta,
      respuestaProveedor: data.respuesta_proveedor,
      mensaje: 'Consulta exitosa'
    });
  } catch (err) {
    console.error('[LIBRO] Error:', err);
    return response({ error: 'Error interno del servidor', details: String(err) }, 500);
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
