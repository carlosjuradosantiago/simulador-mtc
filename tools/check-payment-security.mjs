import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [frontend, apiClient, backend, migration, recurringMigration, legalAcceptanceMigration, legalData, environments] = await Promise.all([
  readFile(new URL('../src/pages/PlansPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/api.js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/api/handlers/pagos.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260812193000_secure_culqi_sunat_flow.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260813205555_culqi_recurring_subscriptions.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260814041608_record_payment_legal_acceptance.sql', import.meta.url), 'utf8'),
  readFile(new URL('../src/data/legal.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/config/remoteEnvironments.js', import.meta.url), 'utf8'),
]);

const processPaymentPayload = frontend.match(/api\.processPayment\(\{([\s\S]*?)\n\s*\}\);/)?.[1] || '';
assert.ok(processPaymentPayload, 'The Culqi payment request must exist.');
assert.doesNotMatch(processPaymentPayload, /^\s*(amount|currency|email)\s*:/m, 'The browser must not send trusted amount, currency, or email fields.');
assert.match(backend, /amount:\s*amountInCents/);
assert.match(backend, /email:\s*culqiProviderEmail\(dbUser\.correo_electronico\)/);
assert.match(backend, /return cleanText\(userEmail, 180\)\.toLowerCase\(\)/, 'Each Culqi customer must keep the account email.');
assert.doesNotMatch(backend, /return .*review@culqi\.com/, 'DEV users must not share one Culqi customer email.');
assert.match(frontend, /client:\s*\{ email: config\.checkoutEmail \|\| user\.email \}/);
assert.match(frontend, /https:\/\/js\.culqi\.com\/checkout-js/, 'Card data must be collected by the official Culqi Checkout.');
assert.match(frontend, /new window\.CulqiCheckout\(config\.publicKey, checkoutConfig\)/);
assert.match(frontend, /hiddenCulqiLogo:\s*false/, 'The official Culqi identity must remain visible.');
assert.doesNotMatch(frontend, /label=["'](?:Numero de tarjeta|CVV|CVC|Fecha de vencimiento)/i, 'The app must not render its own card fields.');
assert.match(frontend, /culqi\.token\.id\.startsWith\('ype_'\)/, 'Yape tokens must be recorded as Yape payments.');
assert.match(frontend, /amount:\s*paymentChoice === 'tarjeta' \? 0 : plan\.price/, 'Card subscription checkout must only tokenize the card.');
assert.match(frontend, /accept_recurring:\s*attempt\.paymentMethod === 'tarjeta'/, 'Recurring card charges require explicit consent.');
assert.match(frontend, /accept_legal:\s*acceptLegal/, 'Every payment method must send explicit legal acceptance.');
assert.match(frontend, /terms_version:\s*LEGAL_TERMS_VERSION/, 'The accepted legal version must be sent with the payment.');
assert.doesNotMatch(frontend, /window\.confirm/, 'Subscription cancellation must use the accessible in-app confirmation.');
assert.match(frontend, /Si, detener cobros/, 'Cancellation must require an explicit user action.');
assert.doesNotMatch(frontend, /Prueba segura en DEV|SUNAT BETA|no realizara un cobro real/, 'Environment details must never be shown in the customer interface.');
assert.doesNotMatch(
  backend,
  /Pago de prueba confirmado|ambiente DEV de Culqi|SUNAT BETA no tienen valor|sin valor comercial ni fiscal/,
  'Environment details must never be shown in customer payment emails.',
);
assert.match(backend, /<h1 style="margin:0;font-size:24px">Pago confirmado<\/h1>/);
assert.match(apiClient, /PAYMENTS_BASE_URL = API_BASE_URL\.replace/, 'Payments must use the isolated DEV Edge Function.');
assert.match(backend, /retrieveCulqiCharge\(created\.charge\.id\)/);
assert.match(backend, /status === 201 && !data\?\.id/, 'HTTP 201 without a charge must enter the Culqi 3DS flow.');
assert.match(frontend, /totalAmount:\s*plan\.price/, 'Culqi 3DS expects the already-normalized amount in cents.');
assert.match(frontend, /waitForPaymentConfirmation/);
assert.match(frontend, /latest\.paymentStatus === 'fallido'/);
assert.match(frontend, /No cierres ni actualices esta pagina/);
assert.match(frontend, /beforeunload/);
assert.match(frontend, /culqiRef\.current\?\.close\?\.\(\)/, 'A previous Culqi Checkout must be closed before a clean retry.');
assert.match(backend, /culqiRequest\('\/cards'/);
assert.match(backend, /culqiRequest\('\/recurrent\/subscriptions\/create'/);
assert.match(backend, /interval_unit_time:\s*3/, 'The Culqi plan must be monthly.');
assert.match(backend, /environment === 'test' \? 3 : 0/, 'DEV must respect Culqi sandbox cycles while live subscriptions renew indefinitely.');
assert.match(backend, /body\.accept_recurring === true/);
assert.match(backend, /body\.accept_legal === true/);
assert.match(backend, /termsVersion !== CURRENT_TERMS_VERSION/);
assert.match(backend, /terminos_aceptados_en:\s*new Date\(\)\.toISOString\(\)/);
assert.match(backend, /terminos_version:\s*CURRENT_TERMS_VERSION/);
assert.match(backend, /typeof payload\?\.data !== 'string'/, 'Webhook payloads serialized by Culqi must be parsed.');
assert.match(backend, /culqi_outcome_code:\s*providerError\.providerCode \|\| null/);
assert.match(backend, /data\?\.param \|\| data\?\.parameter \|\| data\?\.field/);
assert.match(backend, /console\.warn\('\[CULQI\] Charge rejected'/);
assert.match(backend, /culqi_request_id:\s*providerError\.requestId \|\| null/);
assert.match(backend, /handleCulqiWebhook/);
assert.match(backend, /paymentStatus:\s*payment\?\.estado/);
assert.match(backend, /membership:\s*membership \? \{/);
assert.match(backend, /failRecurringInitialPayment/);
assert.match(backend, /Culqi no aprobo el cobro\. Tu suscripcion no fue activada\./);
assert.match(backend, /handleSimularPago[\s\S]*Esta operacion no esta disponible/);
assert.doesNotMatch(backend, /console\.(log|error)\([^\n]*(tokenId|chargePayload|CULQI_SECRET_KEY)/);
assert.match(migration, /enable row level security/g);
assert.match(migration, /revoke all on table public\.comprobantes_electronicos from anon, authenticated/);
assert.match(migration, /culqi_token_id = null/);
assert.match(recurringMigration, /create table if not exists public\.suscripciones_culqi/);
assert.match(recurringMigration, /enable row level security/g);
assert.match(recurringMigration, /revoke all on table public\.suscripciones_culqi from public, anon, authenticated/);
assert.match(legalAcceptanceMigration, /alter table public\.transacciones_pago[\s\S]*terminos_aceptados_en timestamptz/);
assert.match(legalAcceptanceMigration, /terminos_version text/);
assert.match(legalAcceptanceMigration, /transacciones_pago_aceptacion_legal_check/);
assert.match(legalData, /LEGAL_TERMS_VERSION = '2026-08-13'/);
assert.match(backend, /CURRENT_TERMS_VERSION = '2026-08-13'/);
assert.match(environments, /development:[\s\S]*fullExamFree:\s*false/);
assert.match(environments, /production:[\s\S]*fullExamFree:\s*true/);

console.log('Culqi payment trust boundaries and DEV-only gating are intact.');
