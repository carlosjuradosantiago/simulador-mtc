import { getUserFromToken } from '../_shared/auth.ts';
import { sendEmail } from '../_shared/email.ts';
import { errorResponse, jsonResponse, unauthorizedResponse } from '../_shared/response.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { generateAndSendTaxDocument, isSunatConfigurationReady } from '../_shared/sunat.ts';

const CULQI_API_URL = 'https://api.culqi.com/v2';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[a-z]{3,12}_(?:test|live)_[a-z0-9]+$/i;
const RUC_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const CURRENT_TERMS_VERSION = '2026-08-13';

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
  accept_recurring?: unknown;
  accept_legal?: unknown;
  terms_version?: unknown;
  device_fingerprint_id?: unknown;
  billing?: Record<string, unknown>;
  authentication_3DS?: Record<string, unknown>;
};

class ProviderError extends Error {
  publicCode: string;
  status: number;
  requires3ds: boolean;
  providerCode: string;
  requestId: string;

  constructor(
    message: string,
    publicCode = 'payment_failed',
    status = 422,
    requires3ds = false,
    providerCode = '',
    requestId = '',
  ) {
    super(message);
    this.publicCode = publicCode;
    this.status = status;
    this.requires3ds = requires3ds;
    this.providerCode = providerCode;
    this.requestId = requestId;
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

function culqiProviderEmail(userEmail = '') {
  return cleanText(userEmail, 180).toLowerCase();
}

async function culqiRequest(path: string, init: RequestInit = {}) {
  const secretKey = requiredEnv('CULQI_SECRET_KEY');
  if ((Deno.env.get('APP_ENV') || 'development') !== 'production' && !secretKey.startsWith('sk_test_')) {
    throw new Error('La configuracion de la pasarela de pago no es valida');
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
  const code = cleanText(data?.outcome?.code || data?.action_code || data?.response_code, 40).toUpperCase();
  if (['venta_denegada', 'declined', 'rejected', 'denied', 'venta_rechazada'].includes(type)) return false;
  if (['VENTA_DENEGADA', 'VENTA_RECHAZADA', 'DECLINED', 'REJECTED', 'DENIED'].includes(code)) return false;
  return ['venta_autorizada', 'venta_exitosa', 'authorized', 'approved'].includes(type)
    || ['VENTA_AUTORIZADA', 'VENTA_EXITOSA', 'AUTHORIZED', 'APPROVED'].includes(code)
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

function chargeSourceId(charge: any) {
  return cleanText(charge?.source?.id || charge?.card?.id, 80);
}

function providerId(value: unknown, prefix: string) {
  const id = cleanText(value, 100);
  return id.startsWith(`${prefix}_test_`) || id.startsWith(`${prefix}_live_`) ? id : '';
}

function epochToIso(value: unknown) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  const date = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function subscriptionState(status: unknown) {
  return ({ 1: 'creada', 2: 'creada', 3: 'activa', 4: 'cancelada', 5: 'en_cola', 6: 'finalizada' } as Record<number, string>)[Number(status)] || 'creada';
}

function subscriptionChargeIds(subscription: any) {
  const periods = Array.isArray(subscription?.periods)
    ? subscription.periods
    : subscription?.periods ? [subscription.periods] : [];
  const ids: string[] = [];
  for (const period of periods) {
    const charges = Array.isArray(period?.charges)
      ? period.charges
      : period?.charges ? [period.charges] : [];
    for (const charge of charges) {
      const id = providerId(charge?.charge_id || charge?.id, 'chr');
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function subscriptionPlanId(subscription: any) {
  return providerId(subscription?.plan?.plan_id || subscription?.plan_id, 'pln');
}

function providerItems(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return data?.data ? [data.data] : [];
}

function providerErrorCode(data: any) {
  return cleanText(data?.code || data?.type || data?.action_code || data?.outcome?.code, 60)
    .replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function culqiPersonName(value: unknown, fallback: string) {
  const normalized = cleanText(value, 50).replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return normalized.length >= 2 ? normalized : fallback;
}

function subscriptionSnapshot(subscription: any) {
  return {
    state: subscriptionState(subscription?.status),
    nextBillingAt: epochToIso(subscription?.next_billing_date),
    currentPeriod: Number.isInteger(Number(subscription?.current_period)) ? Number(subscription.current_period) : null,
  };
}

async function createCulqiCharge(payload: Record<string, unknown>) {
  const { response, data, requestId } = await culqiRequest('/charges', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const providerType = cleanText(
    data?.outcome?.code || data?.code || data?.action_code || data?.type,
    60,
  ).replace(/[^a-zA-Z0-9_-]/g, '_');
  const providerParam = cleanText(data?.param || data?.parameter || data?.field, 60)
    .replace(/[^a-zA-Z0-9_.-]/g, '_');
  const providerCode = [providerType, providerParam].filter(Boolean).join(':');

  if (requires3ds(response.status, data)) {
    throw new ProviderError(
      safeProviderMessage(data, 'Tu banco necesita confirmar que eres el titular'),
      'requires_3ds',
      200,
      true,
      providerCode,
      requestId,
    );
  }
  if (!response.ok || !isApprovedCharge(data)) {
    console.warn('[CULQI] Charge rejected', { status: response.status, providerCode, requestId });
    throw new ProviderError(
      safeProviderMessage(data, 'No se pudo aprobar el pago'),
      'payment_failed',
      422,
      false,
      providerCode,
      requestId,
    );
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

async function retrieveCulqiSubscription(subscriptionId: string) {
  const { response, data, requestId } = await culqiRequest(`/recurrent/subscriptions/${encodeURIComponent(subscriptionId)}`);
  if (!response.ok || !providerId(data?.id, 'sxn')) {
    throw new ProviderError('No se pudo verificar la suscripcion con Culqi', 'subscription_verification_failed', 502, false, providerErrorCode(data), requestId);
  }
  return { subscription: data, requestId };
}

async function ensureCulqiPlan(supabase: any, plan: any) {
  const amount = Math.round(Number(plan.precio) * 100);
  const environment = requiredEnv('CULQI_SECRET_KEY').startsWith('sk_test_') ? 'test' : 'live';
  // ponytail: Culqi sandbox limits plans to three cycles; live uses 0 for indefinite renewal.
  const intervalCount = environment === 'test' ? 3 : 0;
  const { data: configured } = await supabase
    .from('configuracion_planes_culqi')
    .select('culqi_plan_id')
    .eq('id_plan_membresia', plan.id)
    .eq('ambiente', environment)
    .maybeSingle();

  if (providerId(configured?.culqi_plan_id, 'pln')) {
    const { response, data } = await culqiRequest(`/recurrent/plans/${encodeURIComponent(configured.culqi_plan_id)}`);
    if (response.ok
      && Number(data?.amount) === amount
      && String(data?.currency || '').toUpperCase() === 'PEN'
      && Number(data?.interval_unit_time) === 3
      && Number(data?.interval_count) === intervalCount
      && Number(data?.status) === 1) {
      return configured.culqi_plan_id;
    }
    if (response.ok) throw new ProviderError('El plan mensual de Culqi no coincide con S/ 12', 'subscription_plan_mismatch', 500);
  }

  const shortName = `simulador-mtc-${environment}-${plan.id}-mensual`;
  const listed = await culqiRequest('/recurrent/plans?limit=100');
  let providerPlan = providerItems(listed.data).find((item: any) => item?.short_name === shortName);

  if (!providerPlan) {
    const created = await culqiRequest('/recurrent/plans/create', {
      method: 'POST',
      body: JSON.stringify({
        name: `${cleanText(plan.nombre, 36)} mensual`,
        short_name: shortName,
        description: 'Acceso mensual al Simulador MTC con renovacion automatica',
        amount,
        currency: 'PEN',
        interval_unit_time: 3,
        interval_count: intervalCount,
        initial_cycles: {
          count: 0,
          has_initial_charge: false,
          amount: 0,
          interval_unit_time: 3,
        },
        metadata: {
          app_plan_id: String(plan.id),
          environment: Deno.env.get('APP_ENV') || 'development',
        },
      }),
    });
    if (!created.response.ok || !providerId(created.data?.id, 'pln')) {
      throw new ProviderError(
        safeProviderMessage(created.data, 'No se pudo configurar el plan mensual'),
        'subscription_plan_failed',
        502,
        false,
        providerErrorCode(created.data),
        created.requestId,
      );
    }
    const verified = await culqiRequest(`/recurrent/plans/${encodeURIComponent(created.data.id)}`);
    providerPlan = verified.response.ok ? verified.data : created.data;
  }

  const planId = providerId(providerPlan?.id, 'pln');
  if (!planId
    || Number(providerPlan?.amount) !== amount
    || String(providerPlan?.currency || '').toUpperCase() !== 'PEN'
    || Number(providerPlan?.interval_unit_time) !== 3
    || Number(providerPlan?.interval_count) !== intervalCount) {
    throw new ProviderError('Culqi devolvio un plan mensual invalido', 'subscription_plan_mismatch', 502);
  }

  const { error } = await supabase.from('configuracion_planes_culqi').upsert({
    id_plan_membresia: plan.id,
    ambiente: environment,
    culqi_plan_id: planId,
    monto_centimos: amount,
    moneda: 'PEN',
    intervalo_unidad: 3,
    actualizado_en: new Date().toISOString(),
  }, { onConflict: 'id_plan_membresia,ambiente' });
  if (error) throw new Error(`No se pudo guardar el plan Culqi: ${error.message}`);
  return planId;
}

async function ensureCulqiCustomer(supabase: any, dbUser: any, billing: BillingInput) {
  const email = culqiProviderEmail(dbUser.correo_electronico).toLowerCase();
  const { data: previous } = await supabase
    .from('suscripciones_culqi')
    .select('culqi_customer_id')
    .eq('id_usuario', dbUser.id)
    .not('culqi_customer_id', 'is', null)
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (providerId(previous?.culqi_customer_id, 'cus')) {
    const existing = await culqiRequest(`/customers/${encodeURIComponent(previous.culqi_customer_id)}`);
    if (existing.response.ok && String(existing.data?.email || '').toLowerCase() === email) return previous.culqi_customer_id;
  }

  const listed = await culqiRequest(`/customers?email=${encodeURIComponent(email)}&limit=100`);
  const listedCustomer = providerItems(listed.data).find((item: any) => String(item?.email || '').toLowerCase() === email);
  if (providerId(listedCustomer?.id, 'cus')) return listedCustomer.id;

  const created = await culqiRequest('/customers', {
    method: 'POST',
    body: JSON.stringify({
      first_name: culqiPersonName(dbUser.primer_nombre || billing.customerName.split(' ')[0], 'Cliente'),
      last_name: culqiPersonName(dbUser.apellido || billing.customerName.split(' ').slice(1).join(' '), 'Simulador'),
      email,
      address: billing.fiscalAddress || 'Lima Peru',
      address_city: 'Lima',
      country_code: 'PE',
      phone_number: billing.phone || '999999999',
      metadata: { app_user_id: String(dbUser.id) },
    }),
  });
  if (!created.response.ok || !providerId(created.data?.id, 'cus')) {
    throw new ProviderError(
      safeProviderMessage(created.data, 'No se pudo registrar al cliente en Culqi'),
      'subscription_customer_failed',
      422,
      false,
      providerErrorCode(created.data),
      created.requestId,
    );
  }
  return created.data.id;
}

async function createCulqiCard(customerId: string, tokenId: string, authentication3ds: any, transactionId: number) {
  const created = await culqiRequest('/cards', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customerId,
      token_id: tokenId,
      validate: false,
      metadata: { transaction_id: String(transactionId) },
      ...(authentication3ds ? { authentication_3DS: authentication3ds } : {}),
    }),
  });
  if (requires3ds(created.response.status, created.data)) {
    throw new ProviderError(
      safeProviderMessage(created.data, 'Tu banco necesita confirmar que eres el titular'),
      'requires_3ds',
      200,
      true,
      providerErrorCode(created.data),
      created.requestId,
    );
  }
  if (!created.response.ok || !providerId(created.data?.id, 'crd')) {
    throw new ProviderError(
      safeProviderMessage(created.data, 'No se pudo registrar la tarjeta para la suscripcion'),
      'subscription_card_failed',
      422,
      false,
      providerErrorCode(created.data),
      created.requestId,
    );
  }
  return created.data;
}

async function createCulqiSubscription(cardId: string, planId: string, transaction: any, dbUser: any) {
  const created = await culqiRequest('/recurrent/subscriptions/create', {
    method: 'POST',
    body: JSON.stringify({
      card_id: cardId,
      plan_id: planId,
      tyc: true,
      metadata: {
        transaction_id: String(transaction.id),
        user_id: String(dbUser.id),
        plan_id: String(transaction.id_plan_membresia),
        environment: Deno.env.get('APP_ENV') || 'development',
      },
    }),
  });
  if (!created.response.ok || !providerId(created.data?.id, 'sxn')) {
    throw new ProviderError(
      safeProviderMessage(created.data, 'No se pudo activar la renovacion mensual'),
      'subscription_creation_failed',
      422,
      false,
      providerErrorCode(created.data),
      created.requestId,
    );
  }
  return created.data;
}

function verifyCharge(charge: any, transaction: any, dbUser: any, plan: any) {
  const metadata = charge?.metadata || {};
  const amount = Math.round(Number(plan.precio) * 100);
  const matches = charge?.id
    && Number(charge.amount) === amount
    && String(charge.currency_code || charge.currency || '').toUpperCase() === 'PEN'
    && String(charge.email || '').toLowerCase() === culqiProviderEmail(dbUser.correo_electronico).toLowerCase()
    && String(metadata.transaction_id || '') === String(transaction.id)
    && String(metadata.user_id || '') === String(dbUser.id)
    && String(metadata.plan_id || '') === String(plan.id)
    && isApprovedCharge(charge);

  if (!matches) {
    throw new ProviderError('La verificacion del cargo no coincide con la compra', 'provider_verification_failed', 502);
  }
}

function verifyRecurringCharge(charge: any, recurring: any, providerSubscription: any, dbUser: any, plan: any) {
  const amount = Math.round(Number(plan.precio) * 100);
  const providerChargeIds = subscriptionChargeIds(providerSubscription);
  const matches = providerId(charge?.id, 'chr')
    && Number(charge.amount) === amount
    && String(charge.currency_code || charge.currency || '').toUpperCase() === 'PEN'
    && String(charge.email || '').toLowerCase() === culqiProviderEmail(dbUser.correo_electronico).toLowerCase()
    && chargeSourceId(charge) === recurring.culqi_card_id
    && subscriptionPlanId(providerSubscription) === recurring.culqi_plan_id
    && providerId(providerSubscription?.id, 'sxn') === recurring.culqi_subscription_id
    && (providerChargeIds.length === 0 || providerChargeIds.includes(charge.id))
    && isApprovedCharge(charge);

  if (!matches) {
    throw new ProviderError('Culqi no aprobo el cobro. Tu suscripcion no fue activada.', 'subscription_charge_verification_failed', 502);
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
<tr><td style="padding:26px;background:#0f55e8;color:#fff"><h1 style="margin:0;font-size:24px">Pago confirmado</h1><p style="margin:8px 0 0">Tu acceso al Simulador MTC ya esta activo.</p></td></tr>
<tr><td style="padding:28px">
<p>Hola <strong>${escapeHtml(fullName)}</strong>,</p>
<p>Procesamos correctamente tu compra. Tu acceso ya se encuentra activo.</p>
<table width="100%" cellpadding="7" style="background:#f7f9fc;border-left:4px solid #0f55e8">
<tr><td>Plan</td><td align="right"><strong>${escapeHtml(plan.nombre)}</strong></td></tr>
<tr><td>Monto</td><td align="right"><strong>S/ ${Number(transaction.monto).toFixed(2)}</strong></td></tr>
<tr><td>Comprobante</td><td align="right"><strong>${escapeHtml(receiptLabel)}</strong></td></tr>
<tr><td>Acceso hasta</td><td align="right"><strong>${new Date(membership.membership_end).toLocaleDateString('es-PE')}</strong></td></tr>
</table>
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

async function syncRecurringSubscription(supabase: any, recurringId: number, providerSubscription: any, extra: Record<string, unknown> = {}) {
  const snapshot = subscriptionSnapshot(providerSubscription);
  const { data, error } = await supabase
    .from('suscripciones_culqi')
    .update({
      estado: snapshot.state,
      renovacion_automatica: !['cancelada', 'finalizada'].includes(snapshot.state),
      proximo_cobro_en: snapshot.nextBillingAt,
      periodo_actual: snapshot.currentPeriod,
      mensaje_error: null,
      actualizado_en: new Date().toISOString(),
      ...extra,
    })
    .eq('id', recurringId)
    .select('*')
    .single();
  if (error || !data) throw new Error(`No se pudo actualizar la suscripcion: ${error?.message || 'sin datos'}`);
  return data;
}

async function completeRecurringCharge(
  supabase: any,
  recurring: any,
  providerSubscription: any,
  charge: any,
  requestId: string,
) {
  const { dbUser, plan } = await getCanonicalData(supabase, recurring.id_usuario, recurring.id_plan_membresia);
  verifyRecurringCharge(charge, recurring, providerSubscription, dbUser, plan);

  let { data: transaction } = await supabase
    .from('transacciones_pago')
    .select('*')
    .eq('culqi_charge_id', charge.id)
    .maybeSingle();

  if (!transaction) {
    const { data: initial } = await supabase
      .from('transacciones_pago')
      .select('*')
      .eq('id', recurring.id_transaccion_inicial)
      .single();
    if (initial && initial.estado !== 'exitoso' && !initial.culqi_charge_id) {
      const { data: updated, error } = await supabase
        .from('transacciones_pago')
        .update({
          culqi_charge_id: charge.id,
          culqi_subscription_id: recurring.culqi_subscription_id,
          estado: 'procesando',
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', initial.id)
        .select()
        .single();
      if (error || !updated) throw new Error(`No se pudo asociar el primer cobro: ${error?.message || 'sin datos'}`);
      transaction = updated;
    }
  }

  if (!transaction) {
    const { data: inserted, error } = await supabase
      .from('transacciones_pago')
      .insert({
        id_usuario: recurring.id_usuario,
        id_plan_membresia: recurring.id_plan_membresia,
        culqi_charge_id: charge.id,
        culqi_subscription_id: recurring.culqi_subscription_id,
        monto: Number(plan.precio),
        moneda: 'PEN',
        metodo_pago: 'tarjeta',
        origen_cobro: 'renovacion_automatica',
        estado: 'procesando',
        descripcion: `${plan.nombre} - renovacion mensual`,
        correo_cliente: dbUser.correo_electronico,
        telefono_cliente: recurring.datos_facturacion?.phone || null,
        datos_facturacion: recurring.datos_facturacion,
        culqi_token_id: null,
        respuesta_culqi: null,
      })
      .select()
      .single();
    if (error || !inserted) {
      if (error?.code === '23505') {
        const { data: concurrent } = await supabase.from('transacciones_pago').select('*').eq('culqi_charge_id', charge.id).single();
        transaction = concurrent;
      } else {
        throw new Error(`No se pudo registrar la renovacion: ${error?.message || 'sin datos'}`);
      }
    } else {
      transaction = inserted;
    }
  }

  if (!transaction) throw new Error('No se encontro la transaccion recurrente');
  const billing = normalizeBilling(recurring.datos_facturacion, `${dbUser.primer_nombre || ''} ${dbUser.apellido || ''}`.trim());
  const membership = await finalizePayment(supabase, transaction, charge, requestId);
  const receipt = await ensureReceipt(supabase, transaction, billing);
  await sendConfirmationEmail(supabase, dbUser, plan, transaction, membership, receipt).catch((error) => {
    console.error('[PAYMENT] Recurring Resend error', { transactionId: transaction.id, message: cleanText(error, 200) });
  });
  await syncRecurringSubscription(supabase, recurring.id, providerSubscription);
  return { transaction, membership, receipt };
}

async function startRecurringSubscription(
  supabase: any,
  transaction: any,
  dbUser: any,
  plan: any,
  billing: BillingInput,
  tokenId: string,
  authentication3ds: any,
) {
  const acceptedAt = new Date().toISOString();
  let { data: recurring, error: recurringError } = await supabase
    .from('suscripciones_culqi')
    .select('*')
    .eq('id_transaccion_inicial', transaction.id)
    .maybeSingle();

  if (!recurring) {
    const inserted = await supabase
      .from('suscripciones_culqi')
      .insert({
        id_usuario: dbUser.id,
        id_plan_membresia: plan.id,
        id_transaccion_inicial: transaction.id,
        estado: 'preparando',
        renovacion_automatica: true,
        datos_facturacion: billing,
        terminos_aceptados_en: acceptedAt,
        terminos_version: CURRENT_TERMS_VERSION,
      })
      .select()
      .single();
    recurring = inserted.data;
    recurringError = inserted.error;
  }
  if (recurringError || !recurring) {
    if (recurringError?.code === '23505') {
      throw new ProviderError('Ya tienes una suscripcion mensual activa', 'subscription_already_active', 409);
    }
    throw new Error(`No se pudo preparar la suscripcion: ${recurringError?.message || 'sin datos'}`);
  }

  let createdCardId = '';
  let createdSubscriptionId = '';
  try {
    const planId = recurring.culqi_plan_id || await ensureCulqiPlan(supabase, plan);
    const customerId = recurring.culqi_customer_id || await ensureCulqiCustomer(supabase, dbUser, billing);
    const card = await createCulqiCard(customerId, tokenId, authentication3ds, transaction.id);
    createdCardId = card.id;
    const cardData = cardSummary(card);
    await supabase.from('suscripciones_culqi').update({
      culqi_plan_id: planId,
      culqi_customer_id: customerId,
      culqi_card_id: card.id,
      culqi_card_brand: cardData.brand || null,
      culqi_card_last4: cardData.last4 || null,
      actualizado_en: new Date().toISOString(),
    }).eq('id', recurring.id);

    const createdSubscription = await createCulqiSubscription(card.id, planId, transaction, dbUser);
    const subscriptionId = createdSubscription.id;
    createdSubscriptionId = subscriptionId;
    const verified = await retrieveCulqiSubscription(subscriptionId);
    recurring = await syncRecurringSubscription(supabase, recurring.id, verified.subscription, {
      culqi_plan_id: planId,
      culqi_customer_id: customerId,
      culqi_card_id: card.id,
      culqi_subscription_id: subscriptionId,
      culqi_card_brand: cardData.brand || null,
      culqi_card_last4: cardData.last4 || null,
    });
    await supabase.from('transacciones_pago').update({
      culqi_subscription_id: subscriptionId,
      actualizado_en: new Date().toISOString(),
    }).eq('id', transaction.id);

    let providerSubscription = verified.subscription;
    let chargeId = subscriptionChargeIds(providerSubscription).at(-1) || '';
    for (let attempt = 0; !chargeId && attempt < 8; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      providerSubscription = (await retrieveCulqiSubscription(subscriptionId)).subscription;
      chargeId = subscriptionChargeIds(providerSubscription).at(-1) || '';
    }

    if (!chargeId) {
      return {
        pending: true,
        subscription: recurring,
      };
    }

    const verifiedCharge = await retrieveCulqiCharge(chargeId);
    const completed = await completeRecurringCharge(
      supabase,
      recurring,
      providerSubscription,
      verifiedCharge.charge,
      verifiedCharge.requestId || verified.requestId,
    );
    return { pending: false, subscription: recurring, ...completed };
  } catch (error) {
    if (createdSubscriptionId && !(error instanceof ProviderError && error.requires3ds)) {
      await culqiRequest(`/recurrent/subscriptions/${encodeURIComponent(createdSubscriptionId)}`, { method: 'DELETE' }).catch(() => undefined);
    }
    if (createdCardId && !(error instanceof ProviderError && error.requires3ds)) {
      await culqiRequest(`/cards/${encodeURIComponent(createdCardId)}`, { method: 'DELETE' }).catch(() => undefined);
    }
    if (!(error instanceof ProviderError && error.requires3ds)) {
      await supabase.from('suscripciones_culqi').update({
        estado: 'fallida',
        renovacion_automatica: false,
        mensaje_error: cleanText(error instanceof Error ? error.message : error, 240),
        actualizado_en: new Date().toISOString(),
      }).eq('id', recurring.id);
    }
    throw error;
  }
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
      checkoutEmail: culqiProviderEmail(),
      sunatBetaReady: isSunatConfigurationReady(),
      paymentMethods: ['tarjeta', 'yape'],
    });
  } catch (error) {
    console.error('[PAYMENT] Public configuration error', { message: cleanText(error, 160) });
    return errorResponse('La pasarela de pago aun no esta disponible', 503);
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
    const paymentMethod = tokenId.startsWith('ype_') ? 'yape' : 'tarjeta';
    const acceptsRecurring = body.accept_recurring === true;
    const acceptsLegal = body.accept_legal === true;
    const termsVersion = cleanText(body.terms_version, 32);
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
    if (paymentMethod === 'tarjeta' && !tokenId.startsWith('tkn_')) {
      throw new ProviderError('La suscripcion mensual requiere una tarjeta valida', 'invalid_card_token', 400);
    }
    if (paymentMethod === 'tarjeta' && !acceptsRecurring) {
      throw new ProviderError('Debes autorizar el cobro mensual para suscribirte', 'recurring_terms_required', 400);
    }
    if (!acceptsLegal || termsVersion !== CURRENT_TERMS_VERSION) {
      throw new ProviderError('Debes aceptar los terminos vigentes para continuar', 'legal_terms_required', 400);
    }
    if ((Deno.env.get('APP_ENV') || 'development') !== 'production' && !tokenId.includes('_test_')) {
      throw new ProviderError('No pudimos validar el medio de pago', 'invalid_payment_token', 400);
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
        const [{ data: membership }, { data: receipt }, { data: recurring }] = await Promise.all([
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
          supabase
            .from('suscripciones_culqi')
            .select('estado, renovacion_automatica, proximo_cobro_en, culqi_card_brand, culqi_card_last4')
            .eq('id_transaccion_inicial', existing.id)
            .maybeSingle(),
        ]);
        return jsonResponse({
          success: true,
          alreadyProcessed: true,
          transactionId: existing.id,
          membership,
          receipt,
          subscription: recurring,
        });
      }
      if (existing.culqi_token_hash !== tokenHash) {
        throw new ProviderError('El intento de pago ya pertenece a otro token', 'idempotency_conflict', 409);
      }
      if (existing.estado === 'pendiente_3ds' && !authentication3ds) {
        return jsonResponse({ success: false, requires3ds: true, transactionId: existing.id });
      }
      if (existing.estado === 'procesando' && paymentMethod === 'tarjeta') {
        const { data: recurring } = await supabase
          .from('suscripciones_culqi')
          .select('estado, renovacion_automatica, proximo_cobro_en, culqi_subscription_id')
          .eq('id_transaccion_inicial', existing.id)
          .maybeSingle();
        return jsonResponse({ success: true, pending: true, transactionId: existing.id, subscription: recurring });
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
          origen_cobro: paymentMethod === 'tarjeta' ? 'suscripcion_inicial' : 'pago_unico',
          estado: 'procesando',
          descripcion: `${plan.nombre} - Simulador MTC`,
          correo_cliente: dbUser.correo_electronico,
          telefono_cliente: billing.phone || null,
          datos_facturacion: billing,
          terminos_aceptados_en: new Date().toISOString(),
          terminos_version: CURRENT_TERMS_VERSION,
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

    if (paymentMethod === 'tarjeta') {
      try {
        const recurring = await startRecurringSubscription(
          supabase,
          transaction,
          dbUser,
          plan,
          billing,
          tokenId,
          authentication3ds,
        );
        return jsonResponse({
          success: true,
          pending: recurring.pending,
          transactionId: transaction.id,
          subscription: recurring.subscription ? {
            status: recurring.subscription.estado,
            autoRenew: recurring.subscription.renovacion_automatica,
            nextBillingAt: recurring.subscription.proximo_cobro_en,
            cardBrand: recurring.subscription.culqi_card_brand,
            cardLast4: recurring.subscription.culqi_card_last4,
          } : null,
          membership: recurring.membership,
          receipt: recurring.receipt,
        });
      } catch (error) {
        if (error instanceof ProviderError && error.requires3ds) {
          await supabase
            .from('transacciones_pago')
            .update({
              estado: 'pendiente_3ds',
              culqi_outcome_code: error.providerCode || null,
              culqi_request_id: error.requestId || null,
              actualizado_en: new Date().toISOString(),
            })
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
    }

    const chargePayload: Record<string, unknown> = {
      amount: amountInCents,
      currency_code: 'PEN',
      email: culqiProviderEmail(dbUser.correo_electronico),
      source_id: tokenId,
      description: `${plan.nombre} - Simulador MTC`,
      installments: 0,
      antifraud_details: {
        first_name: cleanText(dbUser.primer_nombre || billing.customerName.split(' ')[0] || 'Cliente', 50),
        last_name: cleanText(dbUser.apellido || billing.customerName.split(' ').slice(1).join(' ') || 'Simulador', 50),
        address: billing.fiscalAddress || 'Avenida Lima 123',
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
          .update({
            estado: 'pendiente_3ds',
            culqi_outcome_code: error.providerCode || null,
            culqi_request_id: error.requestId || null,
            actualizado_en: new Date().toISOString(),
          })
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
          culqi_outcome_code: providerError.providerCode || null,
          culqi_request_id: providerError.requestId || null,
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
  return errorResponse('Esta operacion no esta disponible', 503);
}

async function failRecurringInitialPayment(supabase: any, recurring: any, message: string) {
  if (providerId(recurring.culqi_subscription_id, 'sxn')) {
    await culqiRequest(`/recurrent/subscriptions/${encodeURIComponent(recurring.culqi_subscription_id)}`, { method: 'DELETE' }).catch(() => undefined);
  }
  if (providerId(recurring.culqi_card_id, 'crd')) {
    await culqiRequest(`/cards/${encodeURIComponent(recurring.culqi_card_id)}`, { method: 'DELETE' }).catch(() => undefined);
  }

  const now = new Date().toISOString();
  const [{ error: transactionError }, { data: updated, error: recurringError }] = await Promise.all([
    supabase
      .from('transacciones_pago')
      .update({ estado: 'fallido', mensaje_error: cleanText(message, 180), actualizado_en: now })
      .eq('id', recurring.id_transaccion_inicial)
      .neq('estado', 'exitoso'),
    supabase
      .from('suscripciones_culqi')
      .update({ estado: 'fallida', renovacion_automatica: false, proximo_cobro_en: null, mensaje_error: cleanText(message, 240), actualizado_en: now })
      .eq('id', recurring.id)
      .select('*')
      .single(),
  ]);
  if (transactionError || recurringError || !updated) {
    throw new Error(`No se pudo cerrar el pago rechazado: ${transactionError?.message || recurringError?.message || 'sin datos'}`);
  }
  return updated;
}

function publicSubscription(recurring: any, payment: any = null, membership: any = null) {
  if (!recurring) return null;
  return {
    status: recurring.estado,
    autoRenew: recurring.renovacion_automatica === true,
    nextBillingAt: recurring.proximo_cobro_en,
    currentPeriod: recurring.periodo_actual,
    cardBrand: recurring.culqi_card_brand,
    cardLast4: recurring.culqi_card_last4,
    cancelledAt: recurring.cancelada_en,
    createdAt: recurring.creado_en,
    transactionId: payment?.id || recurring.id_transaccion_inicial || null,
    paymentStatus: payment?.estado || null,
    paymentError: payment?.estado === 'fallido'
      ? 'Culqi no aprobo el pago. Tu suscripcion no fue activada.'
      : null,
    membership: membership ? {
      isActive: true,
      startDate: membership.fecha_inicio,
      endDate: membership.fecha_fin,
    } : null,
  };
}

export async function handleGetCulqiSubscription(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return unauthorizedResponse();
    const supabase = getSupabaseClient();
    const { data: recurring, error } = await supabase
      .from('suscripciones_culqi')
      .select('*')
      .eq('id_usuario', user.userId)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!recurring) return jsonResponse(null);

    let current = recurring;
    if (providerId(recurring.culqi_subscription_id, 'sxn') && recurring.renovacion_automatica) {
      try {
        const provider = await retrieveCulqiSubscription(recurring.culqi_subscription_id);
        current = await syncRecurringSubscription(supabase, recurring.id, provider.subscription, {
          cancelada_en: [4, 6].includes(Number(provider.subscription?.status))
            ? recurring.cancelada_en || new Date().toISOString()
            : recurring.cancelada_en,
        });

        for (const chargeId of subscriptionChargeIds(provider.subscription)) {
          const { data: paid } = await supabase
            .from('transacciones_pago')
            .select('estado')
            .eq('culqi_charge_id', chargeId)
            .maybeSingle();
          if (paid?.estado === 'exitoso') continue;

          try {
            const verifiedCharge = await retrieveCulqiCharge(chargeId);
            await completeRecurringCharge(
              supabase,
              current,
              provider.subscription,
              verifiedCharge.charge,
              verifiedCharge.requestId,
            );
          } catch (chargeError) {
            if (chargeError instanceof ProviderError && chargeError.publicCode === 'subscription_charge_verification_failed') {
              current = await failRecurringInitialPayment(supabase, current, chargeError.message);
              break;
            }
            console.warn('[PAYMENT] Subscription charge reconciliation skipped', {
              subscriptionId: recurring.culqi_subscription_id,
              chargeId,
              message: cleanText(chargeError, 160),
            });
          }
        }
      } catch (providerError) {
        console.warn('[PAYMENT] Subscription status refresh failed', { subscriptionId: recurring.culqi_subscription_id });
      }
    }

    let [{ data: payment, error: paymentError }, { data: membership, error: membershipError }] = await Promise.all([
      supabase
        .from('transacciones_pago')
        .select('id, estado')
        .eq('id', current.id_transaccion_inicial)
        .eq('id_usuario', user.userId)
        .maybeSingle(),
      supabase
        .from('membresias_usuario')
        .select('fecha_inicio, fecha_fin')
        .eq('id_usuario', user.userId)
        .eq('esta_activa', true)
        .gte('fecha_fin', new Date().toISOString())
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (paymentError || membershipError) throw paymentError || membershipError;

    if (!membership && payment?.estado !== 'exitoso' && ['cancelada', 'fallida', 'finalizada'].includes(current.estado)) {
      current = await failRecurringInitialPayment(supabase, current, 'Culqi no aprobo el primer cobro');
      const refreshed = await supabase
        .from('transacciones_pago')
        .select('id, estado')
        .eq('id', current.id_transaccion_inicial)
        .eq('id_usuario', user.userId)
        .maybeSingle();
      if (refreshed.error) throw refreshed.error;
      payment = refreshed.data;
    }

    return jsonResponse(publicSubscription(current, payment, membership));
  } catch (error) {
    console.error('[PAYMENT] Subscription status error', { message: cleanText(error, 160) });
    return errorResponse('No pudimos consultar tu renovacion mensual', 500);
  }
}

export async function handleCancelCulqiSubscription(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return unauthorizedResponse();
    const supabase = getSupabaseClient();
    const { data: recurring, error } = await supabase
      .from('suscripciones_culqi')
      .select('*')
      .eq('id_usuario', user.userId)
      .eq('renovacion_automatica', true)
      .in('estado', ['preparando', 'creada', 'activa', 'en_cola'])
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!recurring) return errorResponse('No tienes una renovacion automatica activa', 404);

    if (providerId(recurring.culqi_subscription_id, 'sxn')) {
      const cancelled = await culqiRequest(`/recurrent/subscriptions/${encodeURIComponent(recurring.culqi_subscription_id)}`, { method: 'DELETE' });
      if (!cancelled.response.ok) {
        throw new ProviderError(
          safeProviderMessage(cancelled.data, 'Culqi no pudo cancelar la suscripcion'),
          'subscription_cancel_failed',
          502,
          false,
          providerErrorCode(cancelled.data),
          cancelled.requestId,
        );
      }
    }

    if (providerId(recurring.culqi_card_id, 'crd')) {
      await culqiRequest(`/cards/${encodeURIComponent(recurring.culqi_card_id)}`, { method: 'DELETE' }).catch(() => undefined);
    }

    const cancelledAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('suscripciones_culqi')
      .update({
        estado: 'cancelada',
        renovacion_automatica: false,
        proximo_cobro_en: null,
        cancelada_en: cancelledAt,
        actualizado_en: cancelledAt,
      })
      .eq('id', recurring.id)
      .select('*')
      .single();
    if (updateError || !updated) throw new Error(`No se pudo guardar la cancelacion: ${updateError?.message || 'sin datos'}`);

    const { data: membership } = await supabase
      .from('membresias_usuario')
      .select('fecha_fin')
      .eq('id_usuario', user.userId)
      .eq('esta_activa', true)
      .order('fecha_fin', { ascending: false })
      .limit(1)
      .maybeSingle();
    return jsonResponse({ success: true, subscription: publicSubscription(updated), accessUntil: membership?.fecha_fin || null });
  } catch (error) {
    const providerError = error instanceof ProviderError
      ? error
      : new ProviderError('No pudimos cancelar la renovacion. Intenta nuevamente.', 'subscription_cancel_failed', 500);
    console.error('[PAYMENT] Subscription cancellation error', { code: providerError.publicCode });
    return jsonResponse({ success: false, error: providerError.message, code: providerError.publicCode }, providerError.status);
  }
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

export async function handleRetryReceipt(req: Request, receiptId: string) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return unauthorizedResponse();
    if (!/^\d+$/.test(receiptId)) return errorResponse('Comprobante no valido', 400);
    const supabase = getSupabaseClient();
    const { data: receipt, error } = await supabase
      .from('comprobantes_electronicos')
      .select('*')
      .eq('id', Number(receiptId))
      .eq('id_usuario', user.userId)
      .single();
    if (error || !receipt) return errorResponse('Comprobante no encontrado', 404);
    if (receipt.estado_sunat === 'aceptado') {
      return jsonResponse({ success: true, receipt: { id: receipt.id, status: receipt.estado_sunat } });
    }

    const result = await generateAndSendTaxDocument(supabase, receipt);
    return jsonResponse({ success: result.status === 'aceptado', receipt: result });
  } catch (error) {
    const message = cleanText(error instanceof Error ? error.message : error, 300);
    console.error('[PAYMENT] Receipt retry error', { receiptId, message });
    return jsonResponse({ success: false, error: message }, 502);
  }
}

function webhookData(payload: any) {
  if (typeof payload?.data !== 'string') return payload?.data || payload;
  try {
    return JSON.parse(payload.data);
  } catch {
    return {};
  }
}

function extractWebhookChargeIds(payload: any) {
  const data = webhookData(payload);
  const ids = [...new Set([...subscriptionChargeIds(data), ...subscriptionChargeIds(data?.object)])];
  const direct = providerId(
    data?.object?.id
      || data?.id
      || payload?.object?.id
      || (payload?.object === 'charge' ? payload?.id : ''),
    'chr',
  );
  if (direct && !ids.includes(direct)) ids.push(direct);
  return ids;
}

function extractWebhookSubscriptionId(payload: any) {
  const data = webhookData(payload);
  return providerId(
    data?.culqi_subscription_id
      || data?.subscription_id
      || data?.subscription?.id
      || data?.id
      || data?.object?.id,
    'sxn',
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
  const chargeIds = extractWebhookChargeIds(payload);
  const subscriptionId = extractWebhookSubscriptionId(payload);
  const objectId = subscriptionId || chargeIds[0] || '';
  const { data: event, error: eventError } = await supabase
    .from('eventos_webhook_culqi')
    .upsert({
      event_id: eventId,
      event_type: eventType,
      culqi_object_id: objectId || null,
      payload_hash: payloadHash,
    }, { onConflict: 'event_id', ignoreDuplicates: true })
    .select('id, procesado')
    .maybeSingle();

  if (eventError) {
    console.error('[PAYMENT] Webhook registry error', { code: eventError.code });
    return errorResponse('No pudimos registrar el evento', 500);
  }
  if (!event) return jsonResponse({ received: true, duplicate: true });
  if (!subscriptionId && chargeIds.length === 0) {
    await supabase.from('eventos_webhook_culqi').update({ procesado: true, procesado_en: new Date().toISOString() }).eq('id', event.id);
    return jsonResponse({ received: true, ignored: true });
  }

  try {
    if (subscriptionId) {
      const { data: recurring, error: recurringError } = await supabase
        .from('suscripciones_culqi')
        .select('*')
        .eq('culqi_subscription_id', subscriptionId)
        .single();
      if (recurringError || !recurring) throw new Error('Suscripcion local no encontrada');
      const provider = await retrieveCulqiSubscription(subscriptionId);
      const current = await syncRecurringSubscription(supabase, recurring.id, provider.subscription, {
        cancelada_en: [4, 6].includes(Number(provider.subscription?.status))
          ? recurring.cancelada_en || new Date().toISOString()
          : recurring.cancelada_en,
      });
      if (!['cancelada', 'finalizada'].includes(current.estado)) {
        const pendingChargeIds = [...new Set([...chargeIds, ...subscriptionChargeIds(provider.subscription)])];
        for (const chargeId of pendingChargeIds) {
          const { data: paid } = await supabase
            .from('transacciones_pago')
            .select('estado')
            .eq('culqi_charge_id', chargeId)
            .maybeSingle();
          if (paid?.estado === 'exitoso') continue;
          const verifiedCharge = await retrieveCulqiCharge(chargeId);
          await completeRecurringCharge(supabase, current, provider.subscription, verifiedCharge.charge, verifiedCharge.requestId);
        }
      }
    } else {
      const chargeId = chargeIds[0];
      const verified = await retrieveCulqiCharge(chargeId);
      const transactionId = Number(verified.charge?.metadata?.transaction_id);
      if (Number.isInteger(transactionId) && transactionId > 0) {
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
      } else {
        const cardId = chargeSourceId(verified.charge);
        if (!providerId(cardId, 'crd')) throw new Error('Cargo sin referencia de tarjeta o transaccion');
        const { data: recurring, error: recurringError } = await supabase
          .from('suscripciones_culqi')
          .select('*')
          .eq('culqi_card_id', cardId)
          .in('estado', ['creada', 'activa', 'en_cola'])
          .eq('renovacion_automatica', true)
          .order('creado_en', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (recurringError || !recurring) throw new Error('Cobro recurrente sin suscripcion local');
        const provider = await retrieveCulqiSubscription(recurring.culqi_subscription_id);
        await completeRecurringCharge(supabase, recurring, provider.subscription, verified.charge, verified.requestId);
      }
    }
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
