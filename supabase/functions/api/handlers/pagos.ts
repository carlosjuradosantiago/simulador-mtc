/**
 * Payment Handler - Procesar pagos con Culqi
 * Soporta: Tarjeta de crédito/débito y Yape
 */

import { getSupabaseClient } from '../_shared/supabase.ts';
import { getUserFromToken } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';
import { Resend } from 'npm:resend@2.0.0';

// Configuración de Culqi
const CULQI_SECRET_KEY = Deno.env.get('CULQI_SECRET_KEY') || '';
const CULQI_API_URL = 'https://api.culqi.com/v2';

// Configuración de Resend
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

interface PaymentRequest {
  token_id: string;
  amount: number; // En centavos
  currency: string;
  email: string;
  description: string;
  plan_id: number | string; // Acepta tanto number como string
  metodo_pago: 'tarjeta' | 'yape';
  // Datos del cliente del PreCheckout
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  tipo_documento?: string;
  numero_documento?: string;
  tipo_comprobante?: string;
  razon_social?: string;
  direccion_fiscal?: string;
  // 3DS Authentication (retry con parámetros 3DS)
  authentication_3DS?: {
    eci: string;
    xid: string;
    cavv: string;
    protocolVersion: string;
    directoryServerTransactionId?: string;
  };
  device_finger_print_id?: string;
}

interface CulqiChargeRequest {
  amount: number;
  currency_code: string;
  email: string;
  source_id: string;
  description?: string;
  antifraud_details?: {
    first_name: string;
    last_name: string;
    address: string;
    address_city: string;
    country_code: string;
    phone_number: string;
    device_finger_print_id?: string;
  };
  metadata?: Record<string, any>;
  authentication_3DS?: {
    eci: string;
    xid: string;
    cavv: string;
    protocolVersion: string;
    directoryServerTransactionId?: string;
  };
}

interface CulqiChargeResponse {
  id: string;
  object: string;
  amount: number;
  currency_code: string;
  email: string;
  outcome: {
    type: string;
    code: string;
    merchant_message: string;
    user_message: string;
  };
  creation_date: number;
  [key: string]: any;
}

/**
 * Enviar email de confirmación de pago usando Resend
 */
async function sendPaymentConfirmationEmail(data: {
  email: string;
  userName: string;
  planName: string;
  amount: number;
  transactionId: string;
  membershipEndDate: Date;
}) {
  // Solo intentar enviar si hay API key configurada
  if (!RESEND_API_KEY) {
    console.log('⚠️ RESEND_API_KEY no configurada, email no enviado');
    return false;
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937;
            background-color: #f3f4f6;
            padding: 20px;
          }
          .email-wrapper { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 { 
            font-size: 28px; 
            margin-bottom: 8px;
            font-weight: 700;
          }
          .header p { 
            font-size: 16px; 
            opacity: 0.95;
          }
          .content { 
            padding: 40px 30px;
          }
          .greeting { 
            font-size: 18px; 
            margin-bottom: 20px;
            color: #374151;
          }
          .detail-box { 
            background: #f9fafb; 
            padding: 24px; 
            border-radius: 8px; 
            margin: 24px 0; 
            border-left: 4px solid #10b981;
          }
          .detail-box h3 { 
            color: #059669; 
            margin-bottom: 16px;
            font-size: 18px;
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-row:last-child { 
            border-bottom: none; 
          }
          .detail-label { 
            color: #6b7280; 
            font-weight: 500;
          }
          .detail-value { 
            color: #111827; 
            font-weight: 600;
          }
          .benefits { 
            background: #ecfdf5; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 24px 0;
          }
          .benefits h3 { 
            color: #059669; 
            margin-bottom: 12px;
            font-size: 16px;
          }
          .benefits ul { 
            list-style: none; 
            padding: 0;
          }
          .benefits li { 
            padding: 8px 0; 
            color: #374151;
            display: flex;
            align-items: center;
          }
          .benefits li:before { 
            content: "✓"; 
            color: #10b981; 
            font-weight: bold; 
            margin-right: 8px;
            font-size: 18px;
          }
          .button-container { 
            text-align: center; 
            margin: 30px 0;
          }
          .button { 
            display: inline-block; 
            padding: 14px 36px; 
            background: #10b981; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
          }
          .footer { 
            background: #f9fafb;
            text-align: center; 
            padding: 24px 30px; 
            color: #6b7280; 
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
          }
          .footer p { 
            margin: 8px 0;
          }
          .divider { 
            height: 1px; 
            background: #e5e7eb; 
            margin: 24px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <h1>🎉 ¡Pago Exitoso!</h1>
            <p>Tu membresía Premium ha sido activada</p>
          </div>
          
          <div class="content">
            <p class="greeting">Hola <strong>${data.userName}</strong>,</p>
            <p>¡Gracias por tu confianza! Tu pago ha sido procesado exitosamente y tu membresía Premium está ahora activa.</p>
            
            <div class="detail-box">
              <h3>📋 Resumen de tu Compra</h3>
              <div class="detail-row">
                <span class="detail-label">Plan</span>
                <span class="detail-value">${data.planName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Monto Pagado</span>
                <span class="detail-value">S/ ${data.amount.toFixed(2)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">ID de Transacción</span>
                <span class="detail-value">#${data.transactionId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha de Activación</span>
                <span class="detail-value">${new Date().toLocaleDateString('es-PE', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Válido Hasta</span>
                <span class="detail-value">${new Date(data.membershipEndDate).toLocaleDateString('es-PE', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            </div>
            
            <div class="benefits">
              <h3>✨ Beneficios de tu Membresía Premium</h3>
              <ul>
                <li>Exámenes ilimitados sin restricciones</li>
                <li>Acceso a todas las preguntas actualizadas</li>
                <li>Modo práctica por categorías</li>
                <li>Estadísticas detalladas de tu progreso</li>
                <li>Simulacros cronometrados realistas</li>
                <li>Historial completo de tus exámenes</li>
              </ul>
            </div>
            
            <div class="button-container">
              <a href="${Deno.env.get('APP_URL') || 'http://localhost:4200'}" class="button">
                🚗 Ir al Simulador MTC
              </a>
            </div>
            
            <div class="divider"></div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.<br>
              Estamos aquí para ayudarte a aprobar tu examen de licencia de conducir.
            </p>
          </div>
          
          <div class="footer">
            <p><strong>Simulador MTC - Perú</strong></p>
            <p>© ${new Date().getFullYear()} Todos los derechos reservados.</p>
            <p style="margin-top: 12px; font-size: 12px;">
              Este es un correo automático, por favor no responder.<br>
              Conserva este email como comprobante de tu compra.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar email usando Resend (igual que artrotheca)
    console.log('📧 Enviando email de confirmación a:', data.email);
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Simulador MTC <onboarding@resend.dev>',
      to: [data.email],
      subject: `🎉 ¡Pago Exitoso! - ${data.planName} - Simulador MTC`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('❌ Error enviando email:', emailError);
      return false;
    }

    console.log('✅ Email enviado exitosamente:', emailData);
    return true;
  } catch (error) {
    console.error('❌ Error en sendPaymentConfirmationEmail:', error);
    return false;
  }
}

/**
 * Obtener configuración de Culqi (Public Key)
 */
export async function handleGetCulqiConfig(req: Request) {
  try {
    const publicKey = Deno.env.get('CULQI_PUBLIC_KEY') || '';
    
    if (!publicKey) {
      return errorResponse('Configuración de Culqi no disponible', 500);
    }

    return jsonResponse({
      publicKey
    });
  } catch (error) {
    console.error('Error getting Culqi config:', error);
    return errorResponse('Error al obtener configuración', 500);
  }
}

/**
 * Crear cargo en Culqi
 * Lee respuesta como texto primero (puede no ser JSON en errores)
 * Verifica outcome del cargo (approved/declined)
 * Detecta cuando se requiere 3DS y retorna señal requires_3ds
 */
async function createCulqiCharge(chargeData: CulqiChargeRequest): Promise<CulqiChargeResponse> {
  const url = `${CULQI_API_URL}/charges`;
  
  console.log('💳 [CULQI] Enviando cargo:', JSON.stringify(chargeData, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CULQI_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeData)
  });

  // ✅ Leer como texto primero (como el proyecto referencia)
  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error('❌ Culqi response not JSON:', responseText);
    throw new Error(`Error parseando respuesta de Culqi: ${responseText.substring(0, 200)}`);
  }

  console.log('📡 [CULQI] Respuesta (status:', response.status, '):', JSON.stringify(data, null, 2));

  // ✅ Detectar 3DS requerido (action_code REVIEW o mensaje de autenticación)
  const actionCode = data.action_code || '';
  const userMessage = data.user_message || data.outcome?.user_message || '';
  const has3DSParams = !!chargeData.authentication_3DS;

  if (actionCode === 'REVIEW' || userMessage.toLowerCase().includes('autenticarse')) {
    if (has3DSParams) {
      // Ya se envió 3DS y aún pide REVIEW → autenticación 3DS falló
      console.error('❌ [CULQI] 3DS auth falló después de autenticación:', data);
      throw new Error('La autenticación 3DS no fue exitosa. Intenta con otra tarjeta.');
    }
    // Requiere 3DS → devolver señal al frontend
    console.log('🔐 [CULQI] Cargo requiere 3DS, action_code:', actionCode);
    // Marcar en la respuesta que requiere 3DS (se manejará en handleProcesarPago)
    data._requires_3ds = true;
    return data;
  }

  if (!response.ok) {
    console.error('❌ Culqi charge error:', data);
    const errorMsg = data.user_message || data.merchant_message || 'Error al procesar el pago';
    throw new Error(errorMsg);
  }

  // ✅ Verificar outcome del cargo (mismo patrón que wild-frontier-dash)
  const outcomeType = data.outcome?.type || '';
  const outcomeCode = data.outcome?.code || '';
  const approvedTypes = ['venta_autorizada', 'venta_exitosa', 'authorized'];
  const isApproved = approvedTypes.includes(outcomeType) || outcomeCode.startsWith('AUT');
  const declinedTypes = ['venta_denegada', 'declined', 'rejected', 'denied', 'venta_rechazada'];
  const isDeclined = declinedTypes.includes(outcomeType);

  if (isDeclined) {
    console.error('❌ [CULQI] Cargo rechazado:', data.outcome);
    throw new Error(data.outcome?.user_message || 'El cargo fue rechazado por el banco emisor');
  }

  if (!isApproved) {
    console.warn('⚠️ [CULQI] Estado desconocido:', outcomeType, outcomeCode);
    throw new Error('No se pudo confirmar el pago. Intenta de nuevo.');
  }

  console.log('✅ [CULQI] Cargo aprobado, outcome:', outcomeType);
  return data;
}

/**
 * Activar o renovar membresía del usuario
 */
async function activateMembership(supabase: any, userId: number, planId: number, transactionId: number) {
  console.log('📝 [activateMembership] INICIO con parámetros:', {
    userId,
    userId_type: typeof userId,
    planId,
    planId_type: typeof planId,
    transactionId
  });

  // Convertir planId a number si viene como string
  const planIdNumber = typeof planId === 'string' ? parseInt(planId) : planId;
  console.log('🔢 [activateMembership] planId convertido:', {
    original: planId,
    converted: planIdNumber,
    type: typeof planIdNumber
  });

  // Obtener datos del plan
  const { data: plan, error: planError } = await supabase
    .from('planes_membresia')
    .select('duracion_meses, nombre')
    .eq('id', planIdNumber)
    .single();

  console.log('📋 [activateMembership] Query plan resultado:', {
    plan,
    planError,
    planId_usado: planIdNumber
  });

  if (planError || !plan) {
    console.error('❌ [activateMembership] Plan no encontrado:', { planError, planId: planIdNumber });
    throw new Error('Plan de membresía no encontrado');
  }

  const now = new Date();
  const fechaInicio = now;
  const fechaFin = new Date(now);
  fechaFin.setMonth(fechaFin.getMonth() + plan.duracion_meses);

  // Verificar si ya tiene una membresía activa
  const { data: existingMembership } = await supabase
    .from('membresias_usuario')
    .select('id, fecha_fin')
    .eq('id_usuario', userId)
    .eq('id_plan_membresia', planId)
    .eq('esta_activa', true)
    .single();

  let membershipId: number;
  let action: string;

  if (existingMembership) {
    // Renovar membresía existente
    const nuevaFechaFin = new Date(existingMembership.fecha_fin);
    nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + plan.duracion_meses);

    const { data: updated, error: updateError } = await supabase
      .from('membresias_usuario')
      .update({
        fecha_fin: nuevaFechaFin.toISOString(),
        actualizado_en: now.toISOString()
      })
      .eq('id', existingMembership.id)
      .select()
      .single();

    if (updateError) {
      throw new Error('Error al renovar membresía');
    }

    membershipId = updated.id;
    action = 'renovacion';
  } else {
    // Crear nueva membresía
    console.log('🆕 [activateMembership] Creando nueva membresía con datos:', {
      id_usuario: userId,
      id_plan_membresia: planIdNumber,
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: fechaFin.toISOString(),
      esta_activa: true
    });

    const { data: newMembership, error: insertError } = await supabase
      .from('membresias_usuario')
      .insert({
        id_usuario: userId,
        id_plan_membresia: planIdNumber,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        esta_activa: true
      })
      .select()
      .single();

    console.log('📊 [activateMembership] Resultado INSERT:', {
      newMembership,
      insertError: insertError ? {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      } : null
    });

    if (insertError) {
      console.error('❌ [activateMembership] Error completo al crear membresía:', insertError);
      throw new Error(`Error al crear membresía: ${insertError.message || insertError.details || 'Unknown error'}`);
    }

    membershipId = newMembership.id;
    action = 'activacion';
  }

  // Registrar en historial
  await supabase.from('historial_membresias').insert({
    id_usuario: userId,
    id_membresia: membershipId,
    id_transaccion: transactionId,
    accion: action,
    fecha_inicio_nueva: fechaInicio.toISOString(),
    fecha_fin_nueva: fechaFin.toISOString(),
    notas: `Pago procesado exitosamente. Transaction ID: ${transactionId}`
  });

  return { membershipId, fechaInicio, fechaFin, planNombre: plan.nombre };
}

/**
 * Procesar pago
 */
export async function handleProcesarPago(req: Request) {
  try {
    // Verificar autenticación usando el sistema unificado (soporta custom JWT y Supabase Auth)
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = getSupabaseClient();

    // Obtener usuario canónico usando userId del token. Las tablas de pagos/membresías
    // referencian `usuarios`, no la tabla legacy `users`.
    const { data: dbUser, error: userError } = await supabase
      .from('usuarios')
      .select('id, correo_electronico, primer_nombre, apellido')
      .eq('id', user.userId)
      .single();

    if (userError || !dbUser) {
      console.error('❌ [PAYMENT] Usuario no encontrado en BD:', { userId: user.userId, error: userError });
      return errorResponse('Usuario no encontrado', 404);
    }

    // Parsear request
    const paymentData: PaymentRequest = await req.json();

    console.log('� [PAYMENT] Datos recibidos:', {
      userId: dbUser.id,
      plan_id: paymentData.plan_id,
      plan_id_type: typeof paymentData.plan_id,
      amount: paymentData.amount,
      method: paymentData.metodo_pago,
      email: paymentData.email
    });

    // Validar datos requeridos
    if (!paymentData.token_id || !paymentData.amount || !paymentData.plan_id) {
      console.error('❌ [PAYMENT] Datos incompletos:', paymentData);
      return errorResponse('Datos de pago incompletos', 400);
    }

    console.log('💳 [PAYMENT] Iniciando procesamiento de pago...');

    // Crear transacción en estado pendiente
    const planId = parseInt(paymentData.plan_id.toString());
    console.log('🔍 [PAYMENT] Preparando transacción:', {
      id_usuario: dbUser.id,
      id_plan_membresia: planId,
      plan_id_original: paymentData.plan_id,
      monto: paymentData.amount / 100
    });

    const { data: transaction, error: transactionError} = await supabase
      .from('transacciones_pago')
      .insert({
        id_usuario: dbUser.id,
        id_plan_membresia: planId,
        culqi_token_id: paymentData.token_id,
        monto: paymentData.amount / 100, // Convertir de centavos a soles
        moneda: paymentData.currency,
        metodo_pago: paymentData.metodo_pago,
        estado: 'pendiente',
        descripcion: paymentData.description,
        correo_cliente: paymentData.email
      })
      .select()
      .single();

    if (transactionError) {
      console.error('❌ [PAYMENT] Error creating transaction:', transactionError);
      return errorResponse(`Error al crear transacción: ${transactionError.message}`, 500);
    }

    console.log('✅ [PAYMENT] Transacción creada:', transaction.id);

    try {
      // Extraer datos del cliente para antifraud (del PreCheckout)
      const clienteNombres = paymentData.nombres || dbUser.primer_nombre || 'Cliente';
      const clienteApellidos = paymentData.apellidos || dbUser.apellido || '';
      const clienteTelefono = paymentData.telefono || '999999999';

      console.log('🔍 [PAYMENT] Datos antifraud:', { clienteNombres, clienteApellidos, clienteTelefono });

      // Procesar cargo en Culqi
      const chargeData: CulqiChargeRequest = {
        amount: paymentData.amount,
        currency_code: paymentData.currency,
        email: paymentData.email,
        source_id: paymentData.token_id,
        description: paymentData.description,
        // ✅ ANTIFRAUD_DETAILS: Requerido por Culqi, especialmente para Yape
        antifraud_details: {
          first_name: clienteNombres,
          last_name: clienteApellidos || 'Cliente',
          address: "Lima, Perú",
          address_city: "Lima",
          country_code: "PE",
          phone_number: clienteTelefono,
          ...(paymentData.device_finger_print_id && {
            device_finger_print_id: paymentData.device_finger_print_id
          })
        },
        metadata: {
          user_id: dbUser.id.toString(),
          transaction_id: transaction.id.toString(),
          plan_id: paymentData.plan_id.toString(),
          has_3ds: paymentData.authentication_3DS ? 'true' : 'false'
        }
      };

      // ✅ Agregar parámetros 3DS si vienen del frontend (retry después de autenticación)
      if (paymentData.authentication_3DS) {
        chargeData.authentication_3DS = {
          eci: paymentData.authentication_3DS.eci,
          xid: paymentData.authentication_3DS.xid,
          cavv: paymentData.authentication_3DS.cavv,
          protocolVersion: paymentData.authentication_3DS.protocolVersion,
          ...(paymentData.authentication_3DS.directoryServerTransactionId && {
            directoryServerTransactionId: paymentData.authentication_3DS.directoryServerTransactionId
          })
        };
        console.log('🔐 [PAYMENT] Cargo con autenticación 3DS');
      }

      const culqiResponse = await createCulqiCharge(chargeData);

      // ✅ Si Culqi requiere 3DS, devolver señal al frontend
      if (culqiResponse._requires_3ds) {
        console.log('🔐 [PAYMENT] Cargo requiere 3DS, devolviendo señal al frontend');
        // Actualizar transacción como pendiente 3DS
        await supabase
          .from('transacciones_pago')
          .update({
            estado: 'pendiente_3ds',
            respuesta_culqi: { requires_3ds: true, charge_id: culqiResponse.id }
          })
          .eq('id', transaction.id);

        return jsonResponse({
          success: false,
          requires_3ds: true,
          charge_id: culqiResponse.id,
          action_code: culqiResponse.action_code,
          user_message: culqiResponse.user_message || culqiResponse.outcome?.user_message || 'Se requiere autenticación adicional',
          amount: paymentData.amount,
          currency: 'PEN',
          token_id: paymentData.token_id,
          email: paymentData.email,
          transaction_id: transaction.id
        });
      }

      console.log('✅ Cargo exitoso en Culqi:', culqiResponse.id);

      // Actualizar transacción como exitosa
      await supabase
        .from('transacciones_pago')
        .update({
          estado: 'exitoso',
          culqi_charge_id: culqiResponse.id,
          respuesta_culqi: culqiResponse,
          fecha_pago: new Date().toISOString()
        })
        .eq('id', transaction.id);

      // Activar membresía
      console.log('🎯 [PAYMENT] Activando membresía con:', {
        userId: dbUser.id,
        planId: paymentData.plan_id,
        transactionId: transaction.id
      });
      const membership = await activateMembership(
        supabase, 
        dbUser.id, 
        paymentData.plan_id, 
        transaction.id
      );
      console.log('✅ [PAYMENT] Membresía activada:', membership);

      // 📧 Enviar email de confirmación
      try {
        await sendPaymentConfirmationEmail({
          email: paymentData.email,
          userName: `${dbUser.primer_nombre || ''} ${dbUser.apellido || ''}`.trim() || paymentData.email,
          planName: membership.planNombre,
          amount: paymentData.amount / 100,
          transactionId: culqiResponse.id,
          membershipEndDate: membership.fechaFin
        });
        console.log('✅ Email de confirmación enviado a:', paymentData.email);
      } catch (emailError) {
        console.error('⚠️ Error enviando email (no crítico):', emailError);
        // No fallar la transacción si el email falla
      }

      return jsonResponse({
        success: true,
        charge_id: culqiResponse.id,
        transaction_id: transaction.id,
        message: 'Pago procesado exitosamente',
        membership: {
          id: membership.membershipId,
          fecha_inicio: membership.fechaInicio.toISOString(),
          fecha_fin: membership.fechaFin.toISOString(),
          plan_nombre: membership.planNombre
        }
      });

    } catch (culqiError: any) {
      // Error en el cargo - actualizar transacción como fallida
      await supabase
        .from('transacciones_pago')
        .update({
          estado: 'fallido',
          mensaje_error: culqiError.message,
          respuesta_culqi: { error: culqiError.toString() }
        })
        .eq('id', transaction.id);

      console.error('❌ Error en cargo Culqi:', culqiError);

      // ✅ IMPORTANTE: Devolver HTTP 200 con success:false para que Supabase
      // pase el body completo al frontend. Con 400/500 el body puede perderse.
      return jsonResponse({
        success: false,
        error: culqiError.message || 'Error al procesar el pago',
        error_type: 'charge_failed',
        transaction_id: transaction.id
      });
    }

  } catch (error: any) {
    console.error('❌ Error general en procesamiento de pago:', error);
    return errorResponse(error.message || 'Error interno del servidor', 500);
  }
}

/**
 * Obtener historial de pagos del usuario
 */
export async function handleGetHistorialPagos(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = getSupabaseClient();

    const { data: transactions, error } = await supabase
      .from('transacciones_pago')
      .select(`
        *,
        planes_membresia:id_plan_membresia(nombre, precio, duracion_meses)
      `)
      .eq('id_usuario', user.userId)
      .order('creado_en', { ascending: false });

    if (error) {
      throw error;
    }

    return jsonResponse(transactions || []);
  } catch (error) {
    console.error('Error getting payment history:', error);
    return errorResponse('Error al obtener historial', 500);
  }
}
