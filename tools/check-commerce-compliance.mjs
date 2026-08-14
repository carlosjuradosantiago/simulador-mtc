import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { addBusinessDays } from '../supabase/functions/api/_shared/complaint-deadline.js';

const paths = {
  routes: '../src/routes/AppRoutes.jsx',
  legal: '../src/data/legal.js',
  legalPage: '../src/pages/LegalPage.jsx',
  authModal: '../src/components/auth/AuthModal.jsx',
  profile: '../src/pages/ProfilePage.jsx',
  vehicleStart: '../src/components/practice/VehicleStartPanel.jsx',
  plansData: '../src/data/mockPlans.js',
  seoGenerator: './generate-seo-assets.mjs',
  subscription: '../src/pages/SubscriptionPage.jsx',
  complaint: '../src/pages/ComplaintBookPage.jsx',
  plans: '../src/pages/PlansPage.jsx',
  handler: '../supabase/functions/api/handlers/libro_reclamaciones.ts',
  email: '../supabase/functions/api/_shared/email.ts',
  environments: '../src/config/remoteEnvironments.js',
};

const entries = await Promise.all(Object.entries(paths).map(async ([name, path]) => [name, await readFile(new URL(path, import.meta.url), 'utf8')]));
const files = Object.fromEntries(entries);
const allComplianceCode = Object.values(files).join('\n');

assert.match(files.legal, /CJ VERTEXLABS GROUP EIRL/);
assert.match(files.legal, /20614965836/);
assert.match(files.legal, /\+51 987 617 635/);
assert.match(files.legal, /admin@simuladormtc\.com/);
assert.match(files.legal, /price:\s*12/);

for (const route of ['/suscripcion', '/contacto', '/terminos-y-condiciones', '/politica-de-cambios-y-devoluciones', '/politica-de-privacidad', '/libro-reclamaciones']) {
  assert.match(files.routes, new RegExp(`path="${route}"`), `${route} debe ser una ruta pública.`);
}
const publicRoutes = files.routes.split('<Route element={<ProtectedRoute />}>')[0];
const protectedRoutes = files.routes.split('<Route element={<ProtectedRoute />}>')[1] || '';
assert.match(publicRoutes, /path="\/libro-reclamaciones"/);
assert.doesNotMatch(protectedRoutes, /path="\/libro-reclamaciones"/);

assert.match(files.subscription, /S\/ \{MONTHLY_PLAN\.price\}/);
assert.match(files.subscription, /Prácticas cortas son gratuitas|prácticas cortas para conocer el servicio/i);
assert.match(files.legalPage, /Crear una cuenta no autoriza ningún cobro/);
assert.match(files.legalPage, /15 días hábiles/);
assert.match(files.legalPage, /no excluye nuestra responsabilidad por dolo, culpa, falta de idoneidad/);
assert.match(files.legalPage, /no generan por sí solos una devolución/);
assert.match(files.legalPage, /cobro duplicado/);
assert.match(files.legalPage, /derechos irrenunciables/);
assert.match(files.authModal, /Al crear tu cuenta, aceptas los/);
assert.match(files.plans, /acceptLegal/);
assert.match(files.plans, /Términos y condiciones/);

const publicCommercialCopy = [files.legalPage, files.authModal, files.profile, files.vehicleStart, files.plansData, files.seoGenerator].join('\n');
assert.doesNotMatch(publicCommercialCopy, /sin límites|acceso ilimitado|simulacros ilimitados|acceso gratuito temporal/i);

assert.doesNotMatch(files.complaint, /type="file"|<Upload|30 días hábiles/);
assert.match(files.complaint, /15 días hábiles/);
assert.match(files.complaint, /autorizaEnvioCorreo:\s*true/);
assert.match(files.handler, /addBusinessDays\(fechaRegistro, 15\)/);
assert.match(files.handler, /enviarEmailConfirmacionConsumidor\(emailData\)/);
assert.doesNotMatch(files.handler, /nombreCompleto:\s*data\.nombre_completo|numeroDocumento:\s*data\.numero_documento|email:\s*data\.email/);

assert.doesNotMatch(allComplianceCode, /Simulador MTC S\.A\.C\.|20123456789|Av\. Principal 123|simuladormtc\.pe|30 días calendario/);
assert.match(files.email, /RESEND_FROM_EMAIL/);
assert.match(files.environments, /development:[\s\S]*fullExamFree:\s*false/);
assert.match(files.environments, /production:[\s\S]*fullExamFree:\s*true/);

const deadline = addBusinessDays(new Date('2026-08-14T15:00:00.000Z'), 15);
assert.equal(deadline.toISOString(), '2026-09-04T15:00:00.000Z');
assert.throws(() => addBusinessDays(new Date('invalid'), 15));

console.log('Public commerce, legal pages and complaint-book checks passed.');
