import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { addBusinessDays } from '../supabase/functions/api/_shared/complaint-deadline.js';

const paths = {
  index: '../index.html',
  routes: '../src/routes/AppRoutes.jsx',
  legal: '../src/data/legal.js',
  legalPage: '../src/pages/LegalPage.jsx',
  authModal: '../src/components/auth/AuthModal.jsx',
  profile: '../src/pages/ProfilePage.jsx',
  vehicleStart: '../src/components/practice/VehicleStartPanel.jsx',
  plansData: '../src/data/mockPlans.js',
  seoGenerator: './generate-seo-assets.mjs',
  subscription: '../src/pages/SubscriptionPage.jsx',
  publicHeader: '../src/components/layout/PublicHeader.jsx',
  publicFooter: '../src/components/layout/PublicFooter.jsx',
  landing: '../src/pages/LandingPage.jsx',
  sidebar: '../src/components/layout/Sidebar.jsx',
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

for (const route of ['/planes', '/suscripcion', '/contacto', '/terminos-y-condiciones', '/politica-de-cambios-y-devoluciones', '/politica-de-privacidad', '/libro-reclamaciones']) {
  assert.match(files.routes, new RegExp(`path="${route}"`), `${route} debe ser una ruta pública.`);
}
const publicRoutes = files.routes.split('<Route element={<ProtectedRoute />}>')[0];
const protectedRoutes = files.routes.split('<Route element={<ProtectedRoute />}>')[1] || '';
assert.match(publicRoutes, /path="\/libro-reclamaciones"/);
assert.match(publicRoutes, /path="\/planes"/);
assert.match(publicRoutes, /path="\/planes" element={<SubscriptionPage \/>}/);
assert.doesNotMatch(protectedRoutes, /path="\/libro-reclamaciones"/);
assert.doesNotMatch(protectedRoutes, /path="\/planes"/);
assert.match(protectedRoutes, /path="\/checkout" element={FULL_EXAM_IS_FREE/);

for (const navigation of [files.publicHeader, files.publicFooter, files.sidebar]) {
  assert.match(navigation, /['"]\/planes['"]/);
  assert.doesNotMatch(navigation, /FULL_EXAM_IS_FREE/);
}

assert.match(files.subscription, /S\/ \{MONTHLY_PLAN\.price\}/);
assert.match(files.subscription, /Prácticas cortas son gratuitas|prácticas cortas para conocer el servicio/i);
assert.match(files.subscription, /Una práctica que se adapta a ti/);
assert.match(files.subscription, /Revisa antes de finalizar/);
assert.match(files.subscription, /Preguntas claras y visuales/);
assert.match(files.subscription, /FULL_EXAM_IS_FREE \? practiceTo : checkoutTo/);
assert.match(files.subscription, /Empezar a practicar/);
assert.doesNotMatch(files.subscription, /20\/12\/8|preguntas compactadas|Control de las 40 preguntas/i);
const subscriptionBenefits = files.subscription.match(/const benefits = \[([\s\S]*?)\n\];/)?.[1] || '';
assert.equal((subscriptionBenefits.match(/title:/g) || []).length, 8);
assert.match(files.legalPage, /Crear una cuenta no autoriza ningún cobro/);
assert.match(files.legalPage, /15 días hábiles/);
assert.match(files.legalPage, /no excluye nuestra responsabilidad por dolo, culpa, falta de idoneidad/);
assert.match(files.legalPage, /no generan por sí solos una devolución/);
assert.match(files.legalPage, /cobro duplicado/);
assert.match(files.legalPage, /derechos irrenunciables/);
assert.match(files.authModal, /Al crear tu cuenta, aceptas los/);
assert.match(files.plans, /acceptLegal/);
assert.match(files.plans, /Términos y condiciones/);

const publicCommercialCopy = [files.index, files.legalPage, files.authModal, files.profile, files.vehicleStart, files.plansData, files.seoGenerator].join('\n');
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
assert.match(files.environments, /production:[\s\S]*fullExamFree:\s*false/);
assert.match(files.landing, /to="\/planes"/);
assert.match(files.landing, /Ver suscripci/);

const deadline = addBusinessDays(new Date('2026-08-14T15:00:00.000Z'), 15);
assert.equal(deadline.toISOString(), '2026-09-04T15:00:00.000Z');
assert.throws(() => addBusinessDays(new Date('invalid'), 15));

console.log('Public commerce, legal pages and complaint-book checks passed.');
