import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [payments, plans, subscription] = await Promise.all([
  readFile(new URL('../supabase/functions/api/handlers/pagos.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/PlansPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/MySubscriptionPage.jsx', import.meta.url), 'utf8'),
]);

assert.match(payments, /if \(!isSunatConfigurationReady\(\)\)[\s\S]*status: 'pendiente'/);
assert.match(payments, /buildPurchaseConfirmationPdf/);
assert.match(payments, /Esta constancia acredita la compra y no reemplaza la boleta o factura electronica/);
assert.match(payments, /purchase_confirmation_sent/);
assert.match(payments, /charge_verified/);
assert.match(payments, /membership_activated/);
assert.match(plans, /success\.receipt\?\.status === 'aceptado'/);
assert.match(plans, /Enviamos la constancia de compra a tu correo/);
assert.match(subscription, /Emisión electrónica pendiente/);

console.log('Purchase confirmation and deferred SUNAT issuance checks passed.');
