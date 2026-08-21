import { resolveEmailRecipient } from './email-recipient.ts';

/**
 * 📧 Servicio de Email usando Resend
 * 
 * Configuración:
 * - Secret: RESEND_API_KEY o RESEND_KEY (configurada en Supabase Dashboard)
 * 
 * Casos de uso para Libro de Reclamaciones:
 * 1. Confirmación al consumidor al registrar reclamo
 * 2. Notificación al proveedor de nuevo reclamo
 * 3. Notificación al consumidor cuando hay respuesta
 */ // Configuración del proveedor (empresa)
export const PROVEEDOR_CONFIG = {
  razonSocial: 'CJ VERTEXLABS GROUP EIRL',
  ruc: '20614965836',
  direccion: 'Sector 3, Grupo 20, Manzana M, Lote 36, Villa El Salvador, Lima, Perú',
  email: 'admin@simuladormtc.com',
  telefono: '+51 987 617 635',
  website: 'https://www.simuladormtc.com'
};
// El remitente del dominio debe estar verificado en Resend antes de producción.
const FROM_EMAIL = 'Simulador MTC <admin@simuladormtc.com>';
const FROM_EMAIL_DEV = 'Simulador MTC <onboarding@resend.dev>';

function getFromEmail() {
  const isProduction = Deno.env.get('APP_ENV')?.trim().toLowerCase() === 'production';
  return Deno.env.get('RESEND_FROM_EMAIL')
    || (!isProduction && Deno.env.get('RESEND_ALLOWED_RECIPIENT') ? FROM_EMAIL_DEV : FROM_EMAIL);
}
/**
 * Envía un email usando la API de Resend
 */ export async function sendEmail(to, subject, html, options = {}) {
  const resendKey = Deno.env.get('RESEND_API_KEY') || Deno.env.get('RESEND_KEY');
  if (!resendKey) {
    console.error('[EMAIL] RESEND_API_KEY/RESEND_KEY no configurada');
    return {
      success: false,
      error: 'API key de Resend no configurada'
    };
  }

  const isProduction = Deno.env.get('APP_ENV')?.trim().toLowerCase() === 'production';
  const recipient = resolveEmailRecipient(
    to,
    isProduction ? null : Deno.env.get('RESEND_QA_SOURCE_EMAIL'),
    isProduction ? null : Deno.env.get('RESEND_QA_RECIPIENT'),
    isProduction ? null : Deno.env.get('RESEND_ALLOWED_RECIPIENT'),
  );

  if (!recipient.allowed) {
    console.warn('[EMAIL] Envio bloqueado por la lista permitida:', recipient.originalRecipient);
    return {
      success: false,
      error: 'Destinatario no permitido en el modo de prueba'
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {})
      },
      body: JSON.stringify({
        from: getFromEmail(),
        to: [
          recipient.deliveryRecipient
        ],
        subject,
        html,
        ...(options.attachments?.length ? { attachments: options.attachments } : {})
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('[EMAIL] Error de Resend:', data);
      return {
        success: false,
        error: data.message || 'Error al enviar email'
      };
    }
    console.log('[EMAIL] Email enviado exitosamente:', data.id);
    return {
      success: true,
      messageId: data.id
    };
  } catch (error) {
    console.error('[EMAIL] Error al enviar email:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

export async function enviarCodigoVerificacionCorreo(data) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu correo</title>
</head>
<body style="margin:0;padding:0;background:#f5f8fc;font-family:Arial,sans-serif;color:#0b1638;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;background:#f5f8fc;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe4f0;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0f55e8;padding:28px;text-align:center;color:#ffffff;">
          <h1 style="margin:0;font-size:24px;">Verifica tu cuenta</h1>
          <p style="margin:8px 0 0;font-size:14px;">Simulador MTC</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola ${data.nombre || 'estudiante'}, usa este codigo para validar tu correo y activar tu cuenta.</p>
          <p style="margin:0 auto 18px;padding:18px 24px;max-width:220px;border-radius:10px;background:#eef5ff;color:#0f55e8;font-size:32px;font-weight:800;letter-spacing:6px;text-align:center;">${data.codigo}</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">El codigo vence en ${data.expiraMinutos} minutos. Si no creaste una cuenta, puedes ignorar este correo.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail(data.email, 'Codigo de verificacion - Simulador MTC', html);
}

export async function enviarCodigoRecuperacionContrasena(data) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recupera tu contrasena</title>
</head>
<body style="margin:0;padding:0;background:#f5f8fc;font-family:Arial,sans-serif;color:#0b1638;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;background:#f5f8fc;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe4f0;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#082a5f;padding:28px;text-align:center;color:#ffffff;">
          <h1 style="margin:0;font-size:24px;">Recupera tu contrasena</h1>
          <p style="margin:8px 0 0;font-size:14px;">Simulador MTC</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola ${data.nombre || 'estudiante'}, ingresa este codigo para crear una nueva contrasena.</p>
          <p style="margin:0 auto 18px;padding:18px 24px;max-width:220px;border-radius:10px;background:#eef5ff;color:#0f55e8;font-size:32px;font-weight:800;letter-spacing:6px;text-align:center;">${data.codigo}</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">El codigo vence en ${data.expiraMinutos} minutos. Si no solicitaste recuperar tu cuenta, ignora este correo.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail(data.email, 'Codigo para recuperar tu cuenta - Simulador MTC', html);
}
/**
 * Formatea fecha a formato legible
 */ function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}
/**
 * 📧 EMAIL 1: Confirmación al consumidor cuando registra un reclamo
 * Requerido por INDECOPI según Ley N° 29571
 */ export async function enviarEmailConfirmacionConsumidor(data) {
  console.log('[EMAIL] Enviando confirmación al consumidor:', data.email);
  const tipoTexto = data.tipoReclamo === 'RECLAMO' ? 'RECLAMO' : 'QUEJA';
  const plazoTexto = 'Conforme a la normativa de protección al consumidor, recibirá una respuesta en un plazo máximo e improrrogable de 15 días hábiles.';
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de ${tipoTexto}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; text-align: center;">
                📋 LIBRO DE RECLAMACIONES
              </h1>
              <p style="color: #bbdefb; margin: 10px 0 0 0; text-align: center; font-size: 14px;">
                ${PROVEEDOR_CONFIG.razonSocial}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <!-- Número de Reclamo -->
              <div style="background-color: #e3f2fd; border-left: 4px solid #1976d2; padding: 15px; margin-bottom: 25px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0; color: #1565c0; font-size: 14px; text-transform: uppercase;">Número de ${tipoTexto}</p>
                <p style="margin: 5px 0 0 0; color: #0d47a1; font-size: 24px; font-weight: bold;">${data.numeroReclamo}</p>
              </div>

              <p style="color: #424242; font-size: 16px; line-height: 1.6;">
                Estimado(a) <strong>${data.nombreCompleto}</strong>,
              </p>
              
              <p style="color: #424242; font-size: 16px; line-height: 1.6;">
                Hemos recibido su ${tipoTexto.toLowerCase()} exitosamente. ${plazoTexto}
              </p>

              <!-- Datos del Reclamo -->
              <div style="background-color: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                  📝 Resumen de su ${tipoTexto}
                </h3>
                
                <table width="100%" style="font-size: 14px; color: #616161;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;" width="40%"><strong>Fecha de Registro:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">${formatDate(data.fechaRegistro)}</td>
                  </tr>
                  ${data.fechaLimiteRespuesta ? `
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;"><strong>Fecha Límite Respuesta:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee; color: #f57c00; font-weight: bold;">${formatDateShort(data.fechaLimiteRespuesta)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;"><strong>Tipo:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">${data.tipoBien}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;"><strong>Bien/Servicio:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">${data.descripcionBien}</td>
                  </tr>
                  ${data.montoReclamado ? `
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;"><strong>Monto Reclamado:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">S/ ${data.montoReclamado.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;"><strong>Fecha del Incidente:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee;">${formatDateShort(data.fechaIncidente)}</td>
                  </tr>
                </table>

                <div style="margin-top: 15px;">
                  <p style="margin: 0 0 5px 0; font-size: 14px; color: #616161;"><strong>Detalle del ${tipoTexto}:</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #424242; background-color: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0;">${data.detalleReclamo}</p>
                </div>

                <div style="margin-top: 15px;">
                  <p style="margin: 0 0 5px 0; font-size: 14px; color: #616161;"><strong>Su Pedido:</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #424242; background-color: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0;">${data.pedidoConsumidor}</p>
                </div>
              </div>

              <!-- Consultar Estado -->
              <div style="background-color: #fff3e0; border: 1px solid #ffcc80; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #e65100; font-size: 14px;">
                  💡 <strong>¿Cómo consultar el estado de su ${tipoTexto.toLowerCase()}?</strong><br>
                  Puede consultar el estado en cualquier momento ingresando su número de ${tipoTexto.toLowerCase()} 
                  <strong>${data.numeroReclamo}</strong> en nuestra página web.
                </p>
              </div>

              <!-- Datos del Consumidor -->
              <div style="background-color: #f5f5f5; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <p style="margin: 0 0 10px 0; color: #757575; font-size: 12px; text-transform: uppercase;">Datos del Consumidor Registrado</p>
                <p style="margin: 0; color: #424242; font-size: 14px;">
                  <strong>${data.nombreCompleto}</strong><br>
                  ${data.tipoDocumento}: ${data.numeroDocumento}<br>
                  ${data.direccion}, ${data.distrito}, ${data.provincia}, ${data.departamento}<br>
                  Tel: ${data.telefono} | Email: ${data.email}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #37474f; padding: 25px; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px; text-align: center;">
                <strong>${PROVEEDOR_CONFIG.razonSocial}</strong>
              </p>
              <p style="margin: 0; color: #b0bec5; font-size: 12px; text-align: center;">
                RUC: ${PROVEEDOR_CONFIG.ruc}<br>
                ${PROVEEDOR_CONFIG.direccion}<br>
                Tel: ${PROVEEDOR_CONFIG.telefono} | ${PROVEEDOR_CONFIG.email}
              </p>
              <p style="margin: 15px 0 0 0; color: #78909c; font-size: 11px; text-align: center;">
                Este es un correo automático generado por el Sistema de Libro de Reclamaciones.<br>
                Conforme a la Ley N° 29571 - Código de Protección y Defensa del Consumidor.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  return sendEmail(data.email, `✅ Confirmación de ${tipoTexto} N° ${data.numeroReclamo} - ${PROVEEDOR_CONFIG.razonSocial}`, html);
}
/**
 * 📧 EMAIL 2: Notificación al proveedor (empresa) de nuevo reclamo
 */ export async function enviarEmailNotificacionProveedor(data) {
  const emailProveedor = PROVEEDOR_CONFIG.email;
  console.log('[EMAIL] Enviando notificación al proveedor:', emailProveedor);
  const tipoTexto = data.tipoReclamo === 'RECLAMO' ? 'RECLAMO' : 'QUEJA';
  const urgenciaColor = data.tipoReclamo === 'RECLAMO' ? '#f44336' : '#ff9800';
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo ${tipoTexto} Recibido</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header con alerta -->
          <tr>
            <td style="background-color: ${urgenciaColor}; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; text-align: center;">
                🚨 NUEVO ${tipoTexto} RECIBIDO
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 25px;">
              <!-- Número y Fecha Límite -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td width="50%" style="background-color: #e3f2fd; padding: 15px; border-radius: 8px 0 0 8px;">
                    <p style="margin: 0; color: #1565c0; font-size: 12px; text-transform: uppercase;">Número</p>
                    <p style="margin: 5px 0 0 0; color: #0d47a1; font-size: 18px; font-weight: bold;">${data.numeroReclamo}</p>
                  </td>
                  ${data.fechaLimiteRespuesta ? `
                  <td width="50%" style="background-color: #fff3e0; padding: 15px; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; color: #e65100; font-size: 12px; text-transform: uppercase;">Fecha Límite</p>
                    <p style="margin: 5px 0 0 0; color: #bf360c; font-size: 18px; font-weight: bold;">${formatDateShort(data.fechaLimiteRespuesta)}</p>
                  </td>
                  ` : ''}
                </tr>
              </table>

              <!-- Datos del Consumidor -->
              <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #424242; font-size: 14px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                  👤 DATOS DEL CONSUMIDOR
                </h3>
                <table width="100%" style="font-size: 14px; color: #616161;">
                  <tr>
                    <td style="padding: 5px 0;" width="35%"><strong>Nombre:</strong></td>
                    <td style="padding: 5px 0;">${data.nombreCompleto}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Documento:</strong></td>
                    <td style="padding: 5px 0;">${data.tipoDocumento} ${data.numeroDocumento}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Email:</strong></td>
                    <td style="padding: 5px 0;"><a href="mailto:${data.email}" style="color: #1976d2;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Teléfono:</strong></td>
                    <td style="padding: 5px 0;">${data.telefono}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Dirección:</strong></td>
                    <td style="padding: 5px 0;">${data.direccion}, ${data.distrito}, ${data.provincia}, ${data.departamento}</td>
                  </tr>
                </table>
              </div>

              <!-- Detalle del Reclamo -->
              <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #424242; font-size: 14px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                  📋 DETALLE DEL ${tipoTexto}
                </h3>
                <table width="100%" style="font-size: 14px; color: #616161;">
                  <tr>
                    <td style="padding: 5px 0;" width="35%"><strong>Tipo de Bien:</strong></td>
                    <td style="padding: 5px 0;">${data.tipoBien}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Descripción:</strong></td>
                    <td style="padding: 5px 0;">${data.descripcionBien}</td>
                  </tr>
                  ${data.montoReclamado ? `
                  <tr>
                    <td style="padding: 5px 0;"><strong>Monto Reclamado:</strong></td>
                    <td style="padding: 5px 0; color: #f44336; font-weight: bold;">S/ ${data.montoReclamado.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 5px 0;"><strong>Fecha Incidente:</strong></td>
                    <td style="padding: 5px 0;">${formatDateShort(data.fechaIncidente)}</td>
                  </tr>
                </table>
                
                <div style="margin-top: 15px; background-color: #fafafa; padding: 10px; border-radius: 4px;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #757575; text-transform: uppercase;">Detalle:</p>
                  <p style="margin: 0; font-size: 14px; color: #424242;">${data.detalleReclamo}</p>
                </div>

                <div style="margin-top: 15px; background-color: #e8f5e9; padding: 10px; border-radius: 4px;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #2e7d32; text-transform: uppercase;">Pedido del Consumidor:</p>
                  <p style="margin: 0; font-size: 14px; color: #1b5e20; font-weight: bold;">${data.pedidoConsumidor}</p>
                </div>
              </div>

              <!-- Acciones -->
              <div style="background-color: #ffebee; border: 1px solid #ffcdd2; border-radius: 8px; padding: 15px; text-align: center;">
                <p style="margin: 0; color: #c62828; font-size: 14px;">
                  ⚠️ <strong>ACCIÓN REQUERIDA</strong><br>
                  Debe responder esta solicitud antes del ${data.fechaLimiteRespuesta ? formatDateShort(data.fechaLimiteRespuesta) : 'plazo establecido'} según la normativa de protección al consumidor.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #263238; padding: 20px; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #90a4ae; font-size: 12px; text-align: center;">
                Sistema de Libro de Reclamaciones Virtual<br>
                Notificación automática - ${formatDate(data.fechaRegistro)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  return sendEmail(emailProveedor, `🚨 [URGENTE] Nuevo ${tipoTexto} N° ${data.numeroReclamo} - Atención Requerida`, html);
}
/**
 * 📧 EMAIL 3: Notificación al consumidor cuando el proveedor responde
 */ export async function enviarEmailRespuestaReclamo(data) {
  console.log('[EMAIL] Enviando respuesta de reclamo al consumidor:', data.email);
  if (!data.respuestaProveedor) {
    return {
      success: false,
      error: 'No hay respuesta del proveedor para enviar'
    };
  }
  const tipoTexto = data.tipoReclamo === 'RECLAMO' ? 'RECLAMO' : 'QUEJA';
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Respuesta a su ${tipoTexto}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #43a047 0%, #2e7d32 100%); padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; text-align: center;">
                ✅ RESPUESTA A SU ${tipoTexto}
              </h1>
              <p style="color: #c8e6c9; margin: 10px 0 0 0; text-align: center; font-size: 14px;">
                ${PROVEEDOR_CONFIG.razonSocial}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <!-- Número de Reclamo -->
              <div style="background-color: #e8f5e9; border-left: 4px solid #43a047; padding: 15px; margin-bottom: 25px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0; color: #2e7d32; font-size: 14px; text-transform: uppercase;">Número de ${tipoTexto}</p>
                <p style="margin: 5px 0 0 0; color: #1b5e20; font-size: 24px; font-weight: bold;">${data.numeroReclamo}</p>
              </div>

              <p style="color: #424242; font-size: 16px; line-height: 1.6;">
                Estimado(a) <strong>${data.nombreCompleto}</strong>,
              </p>
              
              <p style="color: #424242; font-size: 16px; line-height: 1.6;">
                Le informamos que hemos procesado su ${tipoTexto.toLowerCase()} y a continuación encontrará nuestra respuesta:
              </p>

              <!-- Respuesta -->
              <div style="background-color: #f5f5f5; border: 2px solid #43a047; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 16px;">
                  📩 Respuesta del Proveedor
                </h3>
                <p style="margin: 0; font-size: 15px; color: #424242; line-height: 1.7; white-space: pre-wrap;">${data.respuestaProveedor}</p>
                ${data.fechaRespuesta ? `
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #757575; text-align: right;">
                  Fecha de respuesta: ${formatDate(data.fechaRespuesta)}
                </p>
                ` : ''}
              </div>

              <!-- Resumen Original -->
              <div style="background-color: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #757575; margin: 0 0 10px 0; font-size: 14px;">Resumen de su ${tipoTexto.toLowerCase()} original:</h4>
                <p style="margin: 0; font-size: 14px; color: #616161;">
                  <strong>Bien/Servicio:</strong> ${data.descripcionBien}<br>
                  <strong>Detalle:</strong> ${data.detalleReclamo}<br>
                  <strong>Su pedido:</strong> ${data.pedidoConsumidor}
                </p>
              </div>

              <!-- Información adicional -->
              <div style="background-color: #e3f2fd; border: 1px solid #90caf9; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #1565c0; font-size: 14px;">
                  📌 <strong>¿No está conforme con la respuesta?</strong><br>
                  Puede presentar una denuncia ante INDECOPI a través de su página web 
                  <a href="https://www.indecopi.gob.pe" style="color: #1976d2;">www.indecopi.gob.pe</a> 
                  o llamando a la línea gratuita 0800-44040.
                </p>
              </div>

              <p style="color: #616161; font-size: 14px; line-height: 1.6; margin-top: 25px;">
                Agradecemos su preferencia y lamentamos los inconvenientes ocasionados.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #37474f; padding: 25px; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px; text-align: center;">
                <strong>${PROVEEDOR_CONFIG.razonSocial}</strong>
              </p>
              <p style="margin: 0; color: #b0bec5; font-size: 12px; text-align: center;">
                RUC: ${PROVEEDOR_CONFIG.ruc}<br>
                ${PROVEEDOR_CONFIG.direccion}<br>
                Tel: ${PROVEEDOR_CONFIG.telefono} | ${PROVEEDOR_CONFIG.email}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  return sendEmail(
    data.email,
    `✅ Respuesta a su ${tipoTexto} N° ${data.numeroReclamo} - ${PROVEEDOR_CONFIG.razonSocial}`,
    html,
    { idempotencyKey: `complaint-response/${data.numeroReclamo}` },
  );
}
