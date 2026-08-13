import { getUserFromToken } from '../_shared/auth.ts';
import { sendEmail } from '../_shared/email.ts';
import { errorResponse, jsonResponse, unauthorizedResponse } from '../_shared/response.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { generateAndSendTaxDocument, isSunatConfigurationReady } from '../_shared/sunat.ts';

const CULQI_API_URL = 'https://api.culqi.com/v2';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[a-z]{3,12}_(?:test|live)_[a-z0-9]+$/i;
const RUC_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

type BillingInput = {
  receiptType: 'boleta' | 'factura';
  documentType: 'DNI' | 'RUC';
  documentNumber: string;
  customerName: string;
  businessName: string;
  fiscalAddress: string;
  phone: string;
};

type PaymentRequest = {
  token_id?: unknown;
  plan_id?: unknown;
  idempotency_key?: unknown;
  payment_method?: unknown;
  device_fingerprint_id?: unknown;
  billing?: Record<string, unknown>;
  authentication_3DS?: Record<string, unknown>;
};

class ProviderError extends Error {
  publicCode: string;
  status: number;
  requires3ds: boolean;

  constructor(message: string, publicCode = 'payment_failed', status = 422, requires3ds = false) {
    super(message);
    this.publicCode = publicCode;
    this.status = status;
    this.requires3ds = requires3ds;
  }
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} no esta configurado`);
  return value;
}

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

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function isValidRuc(value: string) {
  if (!/^\d{11}$/.test(value)) return false;
  const sum = RUC_WEIGHTS.reduce((total, weight, index) => total + Number(value[index]) * weight, 0);
  const remainder = 11 - (sum % 11);
  const checkDigit = remainder === 10 ? 0 : remainder === 11 ? 1 : remainder;
  return checkDigit === Number(value[10]);
}

function normalizeBilling(raw: Record<string, unknown> | undefined, fallbackName: string): BillingInput {
  const receiptType = cleanText(raw?.receiptType ?? raw?.tipoComprobante, 10).toLowerCase();
  const documentType = cleanText(raw?.documentType ?? raw?.tipoDocumento, 3).toUpperCase();
  const documentNumber = cleanText(raw?.documentNumber ?? raw?.numeroDocumento, 15).replace(/\D/g, '');
  const customerName = cleanText(raw?.customerName ?? raw?.nombreCompleto ?? fallbackName, 120);
  const businessName = cleanText(raw?.businessName ?? raw?.razonSocial, 160);
  const fiscalAddress = cleanText(raw?.fiscalAddress ?? raw?.direccionFiscal, 220);
  const phone = cleanText(raw?.phone ?? raw?.telefono, 20).replace(/[^\d+]/g, '');

  if (receiptType !== 'boleta' && receiptType !== 'factura') {
    throw new ProviderError('Elige boleta o factura', 'invalid_billing', 400);
  }
  if (!customerName || customerName.length < 3) {
    throw new ProviderError('Ingresa el nombre del titular', 'invalid_billing', 400);
  }
  if (phone && !/^\+?\d{9,15}$/.test(phone)) {
    throw new ProviderError('Ingresa un telefono valido', 'invalid_billing', 400);
  }

  if (receiptType === 'factura') {
    if (documentType !== 'RUC' || !isValidRuc(documentNumber)) {
      throw new ProviderError('Ingresa un RUC valido de 11 digitos', 'invalid_billing', 400);
    }
    if (businessName.length < 3 || fiscalAddress.length < 5) {
      throw new ProviderError('Completa la razon social y direccion fiscal', 'invalid_billing', 400);
    }
  } else if (documentType !== 'DNI' || !/^\d{8}$/.test(documentNumber)) {
    throw new ProviderError('Ingresa un DNI valido de 8 digitos', 'invalid_billing', 400);
  }

  return {
    receiptType,
    documentType,
    documentNumber,
    customerName,
    businessName,
    fiscalAddress,
    phone,
  };
}

function normalize3ds(raw: Record<string, unknown> | undefined) {
  if (!raw) return null;
  const values = {
    eci: cleanText(raw.eci, 10),
    xid: cleanText(raw.xid, 256),
    cavv: cleanText(raw.cavv, 256),
    protocolVersion: cleanText(raw.protocolVersion, 16),
    directoryServerTransactionId: cleanText(raw.directoryServerTransactionId, 80),
  };
  if (!values.eci || !values.xid || !values.cavv || !values.protocolVersion) {
    throw new ProviderError('La autenticacion 3DS esta incompleta', 'invalid_3ds', 400);
  }
  return values;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function secureEquals(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([sha256Hex(left), sha256Hex(right)]);
  let difference = 0;
  for (let index = 0; index < leftHash.length; index += 1) {
    difference |= leftHash.charCodeAt(index) ^ rightHash.charCodeAt(index);
  }
  return difference === 0;
}

function safeProviderMessage(data: any, fallback: string) {
  return cleanText(
    data?.user_message || data?.outcome?.user_message || data?.merchant_message || fallback,
    220,
  );
}

async function culqiRequest(path: string, init: RequestInit = {}) {
  const secretKey = requiredEnv('CULQI_SECRET_KEY');
  if ((Deno.env.get('APP_ENV') || 'development') !== 'production' && !secretKey.startsWith('sk_test_')) {
    throw new Error('DEV solo admite llaves Culqi de prueba');
  }

  const response = await fetch(`${CULQI_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const requestId = response.headers.get('x-request-id') || response.headers.get('x-culqi-request-id') || '';
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ProviderError('Culqi devolvio una respuesta invalida', 'provider_invalid_response', 502);
  }
  return { response, data, requestId };
}

function requires3ds(status: number, data: any) {
  const action = cleanText(data?.action_code || data?.outcome?.action_code, 30).toUpperCase();
  const type = cleanText(data?.outcome?.type, 60).toLowerCase();
  const message = safeProviderMessage(data, '').toLowerCase();
  return action === 'REVIEW'
    || type.includes('revision')
    || message.includes('autenticacion')
    || message.includes('autenticarse')
    || (status === 201 && !data?.id);
}

function isApprovedCharge(data: any) {
  const type = cleanText(data?.outcome?.type, 80).toLowerCase();
  const code = cleanText(data?.outcome?.code || data?.action_code, 40).toUpperCase();
  if (['venta_denegada', 'declined', 'rejected', 'denied', 'venta_rechazada'].includes(type)) return false;
  return ['venta_autorizada', 'venta_exitosa', 'authorized', 'approved'].includes(type)
    || code.startsWith('AUT')
    || (data?.object === 'charge' && Boolean(data?.id) && !type && !code && !requires3ds(200, data));
}

function cardSummary(charge: any) {
  const source = charge?.source || charge?.card || {};
  const rawNumber = cleanText(source?.card_number || source?.number, 32).replace(/\D/g, '');
  const last4 = cleanText(source?.last_four || source?.last4 || rawNumber.slice(-4), 4).replace(/\D/g, '');
  const brand = cleanText(source?.iin?.card_brand || source?.brand || source?.card_brand, 40);
  return { brand, last4: /^\d{4}$/.test(last4) ? last4 : '' };
}

async function createCulqiCharge(payload: Record<string, unknown>) {
  const { response, data, requestId } = await culqiRequest('/charges', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (requires3ds(response.status, data)) {
    throw new ProviderError(
      safeProviderMessage(data, 'Tu banco necesita confirmar que eres el titular'),
      'requires_3ds',
      200,
      true,
    );
  }
  if (!response.ok || !isApprovedCharge(data)) {
    throw new ProviderError(safeProviderMessage(data, 'No se pudo aprobar el pago'));
  }
  return { charge: data, requestId };
}

async function retrieveCulqiCharge(chargeId: string) {
  const { response, data, requestId } = await culqiRequest(`/charges/${encodeURIComponent(chargeId)}`);
  if (!response.ok || !data?.id) {
    throw new ProviderError('No se pudo verificar el cargo con Culqi', 'provider_verification_failed', 502);
  }
  return { charge: data, requestId };
}

function verifyCharge(charge: any, transaction: any, dbUser: any, plan: any) {
  const metadata = charge?.metadata || {};
  const amount = Math.round(Number(plan.precio) * 100);
  const matches = charge?.id
    && Number(charge.amount) === amount
    && String(charge.currency_code || '').toUpperCase() === 'PEN'
    && String(charge.email || '').toLowerCase() === String(dbUser.correo_electronico || '').toLowerCase()
    && String(metadata.transaction_id || '') === String(transaction.id)
    && String(metadata.user_id || '') === String(dbUser.id)
    && String(metadata.plan_id || '') === String(plan.id)
    && isApprovedCharge(charge);

  if (!matches) {
    throw new ProviderError('La verificacion del cargo no coincide con la compra', 'provider_verification_failed', 502);
  }
}

async function finalizePayment(supabase: any, transaction: any, charge: any, requestId: string) {
  const card = cardSummary(charge);
  const { data, error } = await supabase.rpc('finalizar_pago_culqi', {
    p_transaccion_id: transaction.id,
    p_culqi_charge_id: charge.id,
    p_monto: Number(transaction.monto),
    p_moneda: transaction.moneda,
    p_card_brand: card.brand,
    p_card_last4: card.last4,
    p_outcome_code: cleanText(charge?.outcome?.code || charge?.action_code, 80),
    p_request_id: requestId,
  });
  if (error) throw new Error(`No se pudo activar la membresia: ${error.message}`);
  return data;
}

async function createReceiptRecord(supabase: any, transactionId: number, billing: BillingInput) {
  const receiptType = billing.receiptType === 'factura' ? 'FACTURA' : 'BOLETA';
  const series = receiptType === 'FACTURA'
    ? (Deno.env.get('SUNAT_FACTURA_SERIES') || 'F001')
    : (Deno.env.get('SUNAT_BOLETA_SERIES') || 'B001');
  const customerName = receiptType === 'FACTURA' ? billing.businessName : billing.customerName;
  const documentType = receiptType === 'FACTURA' ? '6' : '1';
  const { data, error } = await supabase.rpc('crear_comprobante_pago', {
    p_transaccion_id: transactionId,
    p_tipo_comprobante: receiptType,
    p_serie: series,
    p_ambiente_sunat: 'beta',
    p_ruc_emisor: requiredEnv('SUNAT_RUC'),
    p_razon_social_emisor: requiredEnv('SUNAT_ISSUER_NAME'),
    p_tipo_documento_cliente: documentType,
    p_numero_documento_cliente: billing.documentNumber,
    p_nombre_cliente: customerName,
    p_direccion_cliente: billing.fiscalAddress,
  });
  if (error || !data) throw new Error(`No se pudo crear el comprobante: ${error?.message || 'sin datos'}`);
  return data;
}

async function ensureReceipt(supabase: any, transaction: any, billing: BillingInput) {
  const receipt = await createReceiptRecord(supabase, transaction.id, billing);
  if (receipt.estado_sunat === 'aceptado') {
    return {
      id: receipt.id,
      type: receipt.tipo_comprobante,
      number: `${receipt.serie}-${receipt.numero}`,
      status: receipt.estado_sunat,
      responseCode: receipt.codigo_respuesta_sunat,
      responseDescription: receipt.descripcion_respuesta_sunat,
    };
  }

  try {
    return await generateAndSendTaxDocument(supabase, receipt);
  } catch (error) {
    const message = cleanText(error instanceof Error ? error.message : error, 500);
    await supabase
      .from('comprobantes_electronicos')
      .update({
        estado_sunat: 'error',
        descripcion_respuesta_sunat: message,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', receipt.id);
    console.error('[PAYMENT] SUNAT beta error', { receiptId: receipt.id, message });
    return {
      id: receipt.id,
      type: receipt.tipo_comprobante,
      number: `${receipt.serie}-${receipt.numero}`,
      status: 'error',
      responseDescription: message,
    };
  }
}

async function sendConfirmationEmail(supabase: any, dbUser: any, plan: any, transaction: any, membership: any, receipt: any) {
  const appUrl = Deno.env.get('APP_URL') || 'https://simuladormtc-vertexlabs-dev.vercel.app';
  const fullName = `${dbUser.primer_nombre || ''} ${dbUser.apellido || ''}`.trim() || dbUser.correo_electronico;
  const receiptLabel = receipt ? `${receipt.type} ${receipt.number}` : 'Comprobante en preparacion';
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#10213d">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #d8e2ef">
<tr><td style="padding:26px;background:#0f55e8;color:#fff"><h1 style="margin:0;font-size:24px">Pago de prueba confirmado</h1><p style="margin:8px 0 0">Tu acceso al Simulador MTC ya esta activo.</p></td></tr>
<tr><td style="padding:28px">
<p>Hola <strong>${escapeHtml(fullName)}</strong>,</p>
<p>Procesamos correctamente tu compra en el ambiente DEV de Culqi.</p>
<table width="100%" cellpadding="7" style="background:#f7f9fc;border-left:4px solid #0f55e8">
<tr><td>Plan</td><td align="right"><strong>${escapeHtml(plan.nombre)}</strong></td></tr>
<tr><td>Monto</td><td align="right"><strong>S/ ${Number(transaction.monto).toFixed(2)}</strong></td></tr>
<tr><td>Comprobante</td><td align="right"><strong>${escapeHtml(receiptLabel)}</strong></td></tr>
<tr><td>Acceso hasta</td><td align="right"><strong>${new Date(membership.membership_end).toLocaleDateString('es-PE')}</strong></td></tr>
</table>
<p style="margin-top:18px;padding:12px;background:#fff4ce"><strong>Prueba:</strong> este pago y el comprobante SUNAT BETA no tienen valor comercial ni fiscal.</p>
<p style="text-align:center;margin-top:24px"><a href="${appUrl}/perfil" style="display:inline-block;padding:13px 24px;background:#0f55e8;color:#fff;text-decoration:none;font-weight:bold">Ver mi acceso</a></p>
</td></tr></table></td></tr></table></body></html>`;

  const attachments = [];
  for (const [path, fallbackName] of [
    [receipt?.pdfPath, `${receiptLabel}.pdf`],
    [receipt?.xmlPath, `${receiptLabel}.xml`],
  ]) {
    if (!path) continue;
    const { data, error } = await supabase.storage.from('tax-documents').download(path);
    if (!error && data) {
      attachments.push({ filename: fallbackName.replaceAll(' ', '-'), content: bytesToBase64(new Uint8Array(await data.arrayBuffer())) });
    }
  }

  const result = await sendEmail(
    dbUser.correo_electronico,
    `Pago confirmado - ${plan.nombre} - Simulador MTC`,
    html,
    { idempotencyKey: `payment-confirmation/${transaction.id}`, attachments },
  );

  if (result.success && receipt?.id) {
    await supabase
      .from('comprobantes_electronicos')
      .update({ correo_enviado_en: new Date().toISOString(), actualizado_en: new Date().toISOString() })
      .eq('id', receipt.id)
      .is('correo_enviado_en', null);
  }
}

async function getCanonicalData(supabase: any, userId: number, planId: number) {
  const [{ data: dbUser, error: userError }, { data: plan, error: planError }] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, correo_electronico, primer_nombre, apellido')
      .eq('id', userId)
      .eq('esta_activo', true)
      .single(),
    supabase
      .from('planes_membresia')
      .select('id, nombre, precio, duracion_meses')
      .eq('id', planId)
      .eq('esta_activo', true)
      .single(),
  ]);
  if (userError || !dbUser) throw new ProviderError('Usuario no encontrado', 'user_not_found', 404);
  if (planError || !plan) throw new ProviderError('Plan no disponible', 'plan_not_found', 404);
  return { dbUser, plan };
}

async function completeVerifiedPayment(supabase: any, transaction: any, dbUser: any, plan: any, billing: BillingInput, charge: any, requestId: string) {
  verifyCharge(charge, transaction, dbUser, plan);
  const membership = await finalizePayment(supabase, transaction, charge, requestId);
  const receipt = await ensureReceipt(supabase, transaction, billing);
  await sendConfirmationEmail(supabase, dbUser, plan, transaction, membership, receipt).catch((error) => {
    console.error('[PAYMENT] Resend error', { transactionId: transaction.id, message: cleanText(error, 200) });
  });
  return { membership, receipt };
}

export async function handleGetCulqiConfig(_req: Request) {
  try {
    const publicKey = requiredEnv('CULQI_PUBLIC_KEY');
    const rsaId = requiredEnv('CULQI_RSA_ID');
    const rsaPublicKey = requiredEnv('CULQI_RSA_PUBLIC_KEY').replace(/\\n/g, '\n');
    return jsonResponse({
      provider: 'culqi',
      publicKey,
      rsaId,
      rsaPublicKey,
      currency: 'PEN',
      testMode: publicKey.startsWith('pk_test_'),
      sunatBetaReady: isSunatConfigurationReady(),
      paymentMethods: ['tarjeta', 'yape'],
    });
  } catch (error) {
    console.error('[PAYMENT] Public configuration error', { message: cleanText(error, 160) });
    return errorResponse('La pasarela de pago DEV aun no esta disponible', 503);
  }
}

export async function handleProcesarPago(req: Request) {
  let transaction: any = null;
  const supabase = getSupabaseClient();
  try {
    const user = await getUserFromToken(req);
    if (!user) return unauthorizedResponse();

    const body: PaymentRequest = await req.json();
    const planId = Number(body.plan_id);
    const tokenId = cleanText(body.token_id, 160);
    const idempotencyKey = cleanText(body.idempotency_key, 40);
    const paymentMethod = cleanText(body.payment_method, 20).toLowerCase() === 'yape' ? 'yape' : 'tarjeta';
    const deviceId = cleanText(body.device_fingerprint_id, 80);
    const authentication3ds = normalize3ds(body.authentication_3DS);

    if (!Number.isInteger(planId) || planId <= 0) {
      throw new ProviderError('Selecciona un plan valido', 'invalid_plan', 400);
    }
    if (!UUID_PATTERN.test(idempotencyKey)) {
      throw new ProviderError('No pudimos identificar el intento de pago', 'invalid_idempotency_key', 400);
    }
    if (!TOKEN_PATTERN.test(tokenId)) {
      throw new ProviderError('El token de pago no es valido', 'invalid_token', 400);
    }
    if ((Deno.env.get('APP_ENV') || 'development') !== 'production' && !tokenId.includes('_test_')) {
      throw new ProviderError('DEV solo admite tokens Culqi de prueba', 'live_token_blocked', 400);
    }

    const { dbUser, plan } = await getCanonicalData(supabase, Number(user.userId), planId);
    const fallbackName = `${dbUser.primer_nombre || ''} ${dbUser.apellido || ''}`.trim();
    const billing = normalizeBilling(body.billing, fallbackName);
    const tokenHash = await sha256Hex(tokenId);
    const amountInCents = Math.round(Number(plan.precio) * 100);
    if (amountInCents < 300 || amountInCents > 999900) {
      throw new ProviderError('El monto del plan esta fuera del rango permitido', 'invalid_plan_amount', 500);
    }

    const { data: existing } = await supabase
      .from('transacciones_pago')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .eq('id_usuario', dbUser.id)
      .maybeSingle();

    if (existing) {
      transaction = existing;
      if (existing.estado === 'exitoso') {
        const [{ data: membership }, { data: receipt }] = await Promise.all([
          supabase
            .from('membresias_usuario')
            .select('id, fecha_inicio, fecha_fin')
            .eq('id_usuario', dbUser.id)
            .eq('esta_activa', true)
            .order('fecha_fin', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('comprobantes_electronicos')
            .select('id, tipo_comprobante, serie, numero, estado_sunat')
            .eq('id_transaccion', existing.id)
            .maybeSingle(),
        ]);
        return jsonResponse({
          success: true,
          alreadyProcessed: true,
          transactionId: existing.id,
          membership,
          receipt,
        });
      }
      if (existing.culqi_token_hash !== tokenHash) {
        throw new ProviderError('El intento de pago ya pertenece a otro token', 'idempotency_conflict', 409);
      }
      if (existing.estado === 'pendiente_3ds' && !authentication3ds) {
        return jsonResponse({ success: false, requires3ds: true, transactionId: existing.id });
      }
      if (existing.estado !== 'pendiente_3ds') {
        throw new ProviderError('Este intento ya fue procesado. Vuelve a abrir Culqi.', 'idempotency_conflict', 409);
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('transacciones_pago')
        .insert({
          id_usuario: dbUser.id,
          id_plan_membresia: plan.id,
          idempotency_key: idempotencyKey,
          culqi_token_hash: tokenHash,
          monto: Number(plan.precio),
          moneda: 'PEN',
          metodo_pago: paymentMethod,
          estado: 'procesando',
          descripcion: `${plan.nombre} - Simulador MTC`,
          correo_cliente: dbUser.correo_electronico,
          telefono_cliente: billing.phone || null,
          datos_facturacion: billing,
          culqi_token_id: null,
          respuesta_culqi: null,
        })
        .select()
        .single();
      if (insertError || !inserted) {
        if (insertError?.code === '23505') {
          throw new ProviderError('El intento de pago ya esta en proceso', 'idempotency_conflict', 409);
        }
        throw new Error(`No se pudo crear la transaccion: ${insertError?.message || 'sin datos'}`);
      }
      transaction = inserted;
    }

    const chargePayload: Record<string, unknown> = {
      amount: amountInCents,
      currency_code: 'PEN',
      email: dbUser.correo_electronico,
      source_id: tokenId,
      description: `${plan.nombre} - Simulador MTC`,
      installments: 0,
      antifraud_details: {
        first_name: cleanText(dbUser.primer_nombre || billing.customerName.split(' ')[0] || 'Cliente', 50),
        last_name: cleanText(dbUser.apellido || billing.customerName.split(' ').slice(1).join(' ') || 'Simulador', 50),
        address: billing.fiscalAddress || 'Lima',
        address_city: 'Lima',
        country_code: 'PE',
        phone_number: billing.phone || '999999999',
        ...(UUID_PATTERN.test(deviceId) ? { device_finger_print_id: deviceId } : {}),
      },
      metadata: {
        transaction_id: String(transaction.id),
        user_id: String(dbUser.id),
        plan_id: String(plan.id),
        environment: Deno.env.get('APP_ENV') || 'development',
      },
      ...(authentication3ds ? { authentication_3DS: authentication3ds } : {}),
    };

    let created: { charge: any; requestId: string };
    try {
      created = await createCulqiCharge(chargePayload);
    } catch (error) {
      if (error instanceof ProviderError && error.requires3ds) {
        await supabase
          .from('transacciones_pago')
          .update({ estado: 'pendiente_3ds', actualizado_en: new Date().toISOString() })
          .eq('id', transaction.id);
        return jsonResponse({
          success: false,
          requires3ds: true,
          transactionId: transaction.id,
          message: error.message,
        });
      }
      throw error;
    }

    await supabase
      .from('transacciones_pago')
      .update({
        culqi_charge_id: created.charge.id,
        estado: 'procesando',
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    transaction.culqi_charge_id = created.charge.id;
    const verified = await retrieveCulqiCharge(created.charge.id);
    const completed = await completeVerifiedPayment(
      supabase,
      transaction,
      dbUser,
      plan,
      billing,
      verified.charge,
      verified.requestId || created.requestId,
    );

    return jsonResponse({
      success: true,
      transactionId: transaction.id,
      chargeId: created.charge.id,
      membership: completed.membership,
      receipt: completed.receipt,
    });
  } catch (error) {
    const providerError = error instanceof ProviderError
      ? error
      : new ProviderError('No pudimos completar el pago. Intenta nuevamente.', 'internal_payment_error', 500);
    if (transaction?.id && !providerError.requires3ds) {
      await supabase
        .from('transacciones_pago')
        .update({
          estado: 'fallido',
          mensaje_error: `${providerError.publicCode}: ${cleanText(providerError.message, 180)}`,
          culqi_token_id: null,
          respuesta_culqi: null,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', transaction.id)
        .neq('estado', 'exitoso');
    }
    console.error('[PAYMENT] Processing failed', {
      transactionId: transaction?.id || null,
      code: providerError.publicCode,
      status: providerError.status,
    });
    return jsonResponse({ success: false, error: providerError.message, code: providerError.publicCode }, providerError.status);
  }
}

export async function handleSimularPago(_req: Request) {
  return errorResponse('La simulacion fue deshabilitada. Usa Culqi DEV.', 503);
}

export async function handleGetHistorialPagos(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return unauthorizedResponse();
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('transacciones_pago')
      .select(`
        id,
        monto,
        moneda,
        metodo_pago,
        estado,
        culqi_card_brand,
        culqi_card_last4,
        fecha_pago,
        creado_en,
        planes_membresia:id_plan_membresia(nombre, duracion_meses),
        comprobantes_electronicos(id, tipo_comprobante, serie, numero, estado_sunat)
      `)
      .eq('id_usuario', user.userId)
      .order('creado_en', { ascending: false })
      .limit(50);
    if (error) throw error;
    return jsonResponse(data || []);
  } catch (error) {
    console.error('[PAYMENT] History error', { message: cleanText(error, 160) });
    return errorResponse('No pudimos cargar tus pagos', 500);
  }
}

export async function handleGetReceipt(req: Request, receiptId: string) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return unauthorizedResponse();
    if (!/^\d+$/.test(receiptId)) return errorResponse('Comprobante no valido', 400);
    const supabase = getSupabaseClient();
    const { data: receipt, error } = await supabase
      .from('comprobantes_electronicos')
      .select('id, tipo_comprobante, serie, numero, estado_sunat, total, moneda, codigo_respuesta_sunat, descripcion_respuesta_sunat, ruta_xml, ruta_pdf, ruta_cdr, creado_en')
      .eq('id', Number(receiptId))
      .eq('id_usuario', user.userId)
      .single();
    if (error || !receipt) return errorResponse('Comprobante no encontrado', 404);

    const paths = [receipt.ruta_pdf, receipt.ruta_xml, receipt.ruta_cdr].filter(Boolean);
    const signedUrls: Record<string, string> = {};
    for (const path of paths) {
      const { data, error: signError } = await supabase.storage.from('tax-documents').createSignedUrl(path, 600);
      if (!signError && data?.signedUrl) signedUrls[path] = data.signedUrl;
    }

    return jsonResponse({
      ...receipt,
      urls: {
        pdf: receipt.ruta_pdf ? signedUrls[receipt.ruta_pdf] || null : null,
        xml: receipt.ruta_xml ? signedUrls[receipt.ruta_xml] || null : null,
        cdr: receipt.ruta_cdr ? signedUrls[receipt.ruta_cdr] || null : null,
      },
    });
  } catch (error) {
    console.error('[PAYMENT] Receipt error', { message: cleanText(error, 160) });
    return errorResponse('No pudimos abrir el comprobante', 500);
  }
}

function extractWebhookChargeId(payload: any) {
  return cleanText(
    payload?.data?.object?.id
      || payload?.data?.id
      || payload?.object?.id
      || (payload?.object === 'charge' ? payload?.id : ''),
    100,
  );
}

export async function handleCulqiWebhook(req: Request, suppliedToken: string) {
  const expectedToken = Deno.env.get('CULQI_WEBHOOK_TOKEN') || '';
  if (!expectedToken || !(await secureEquals(suppliedToken, expectedToken))) {
    return errorResponse('No encontrado', 404);
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 65536) return errorResponse('Payload demasiado grande', 413);
  const raw = await req.text();
  if (raw.length > 65536) return errorResponse('Payload demasiado grande', 413);

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return errorResponse('JSON invalido', 400);
  }

  const supabase = getSupabaseClient();
  const payloadHash = await sha256Hex(raw);
  const eventId = cleanText(payload?.event_id || payload?.id, 160) || payloadHash;
  const eventType = cleanText(payload?.type || payload?.event, 100);
  const chargeId = extractWebhookChargeId(payload);
  const { data: event, error: eventError } = await supabase
    .from('eventos_webhook_culqi')
    .upsert({
      event_id: eventId,
      event_type: eventType,
      culqi_object_id: chargeId || null,
      payload_hash: payloadHash,
    }, { onConflict: 'event_id', ignoreDuplicates: true })
    .select('id, procesado')
    .maybeSingle();

  if (eventError) {
    console.error('[PAYMENT] Webhook registry error', { code: eventError.code });
    return errorResponse('No pudimos registrar el evento', 500);
  }
  if (!event) return jsonResponse({ received: true, duplicate: true });
  if (!chargeId) {
    await supabase.from('eventos_webhook_culqi').update({ procesado: true, procesado_en: new Date().toISOString() }).eq('id', event.id);
    return jsonResponse({ received: true, ignored: true });
  }

  try {
    const verified = await retrieveCulqiCharge(chargeId);
    const transactionId = Number(verified.charge?.metadata?.transaction_id);
    if (!Number.isInteger(transactionId) || transactionId <= 0) throw new Error('Cargo sin transaction_id valido');
    const { data: transaction, error: txError } = await supabase
      .from('transacciones_pago')
      .select('*')
      .eq('id', transactionId)
      .single();
    if (txError || !transaction) throw new Error('Transaccion no encontrada');
    const { dbUser, plan } = await getCanonicalData(supabase, transaction.id_usuario, transaction.id_plan_membresia);
    const billing = normalizeBilling(transaction.datos_facturacion, `${dbUser.primer_nombre || ''} ${dbUser.apellido || ''}`.trim());

    if (!transaction.culqi_charge_id) {
      await supabase.from('transacciones_pago').update({ culqi_charge_id: chargeId }).eq('id', transaction.id);
      transaction.culqi_charge_id = chargeId;
    }
    if (transaction.culqi_charge_id !== chargeId) throw new Error('El cargo no coincide con la transaccion');

    await completeVerifiedPayment(supabase, transaction, dbUser, plan, billing, verified.charge, verified.requestId);
    await supabase
      .from('eventos_webhook_culqi')
      .update({ procesado: true, procesado_en: new Date().toISOString(), mensaje_error: null })
      .eq('id', event.id);
    return jsonResponse({ received: true, processed: true });
  } catch (error) {
    const message = cleanText(error instanceof Error ? error.message : error, 240);
    await supabase.from('eventos_webhook_culqi').update({ mensaje_error: message }).eq('id', event.id);
    console.error('[PAYMENT] Webhook processing error', { eventId, message });
    return errorResponse('El evento quedo pendiente de verificacion', 503);
  }
}
