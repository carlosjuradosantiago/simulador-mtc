import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const plans = read('src/pages/PlansPage.jsx');
const routes = read('src/routes/AppRoutes.jsx');
const page = read('src/pages/MySubscriptionPage.jsx');
const payments = read('supabase/functions/api/handlers/pagos.ts');

assert.match(plans, /navigate\('\/mi-suscripcion\?pago=confirmado'/, 'El pago confirmado debe salir del checkout.');
assert.match(routes, /path="\/mi-suscripcion"/, 'Falta la ruta de gestión de suscripción.');
assert.match(page, /api\.getPaymentHistory/, 'La pantalla debe mostrar pagos y comprobantes.');
assert.match(page, /api\.retryReceipt/, 'La pantalla debe poder recuperar un comprobante fallido.');
assert.match(payments, /\.eq\('id_usuario', user\.userId\)/, 'El comprobante debe estar limitado a su propietario.');
assert.match(payments, /culqi_subscription_id/, 'La suscripción debe conservar trazabilidad con Culqi.');

console.log('Subscription management checks passed.');
