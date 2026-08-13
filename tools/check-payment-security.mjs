import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [frontend, backend, migration, environments] = await Promise.all([
  readFile(new URL('../src/pages/PlansPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/api/handlers/pagos.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260812193000_secure_culqi_sunat_flow.sql', import.meta.url), 'utf8'),
  readFile(new URL('../src/config/remoteEnvironments.js', import.meta.url), 'utf8'),
]);

const processPaymentPayload = frontend.match(/api\.processPayment\(\{([\s\S]*?)\n\s*\}\);/)?.[1] || '';
assert.ok(processPaymentPayload, 'The Culqi payment request must exist.');
assert.doesNotMatch(processPaymentPayload, /^\s*(amount|currency|email)\s*:/m, 'The browser must not send trusted amount, currency, or email fields.');
assert.match(backend, /amount:\s*amountInCents/);
assert.match(backend, /email:\s*dbUser\.correo_electronico/);
assert.match(backend, /retrieveCulqiCharge\(created\.charge\.id\)/);
assert.match(backend, /handleCulqiWebhook/);
assert.match(backend, /handleSimularPago[\s\S]*simulacion fue deshabilitada/);
assert.doesNotMatch(backend, /console\.(log|error)\([^\n]*(tokenId|chargePayload|CULQI_SECRET_KEY)/);
assert.match(migration, /enable row level security/g);
assert.match(migration, /revoke all on table public\.comprobantes_electronicos from anon, authenticated/);
assert.match(migration, /culqi_token_id = null/);
assert.match(environments, /development:[\s\S]*fullExamFree:\s*false/);
assert.match(environments, /production:[\s\S]*fullExamFree:\s*true/);

console.log('Culqi payment trust boundaries and DEV-only gating are intact.');
