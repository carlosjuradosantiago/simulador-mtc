import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const router = read('supabase/functions/api/index.ts');
const admin = read('supabase/functions/api/handlers/admin.ts');
const finance = read('supabase/functions/api/handlers/admin_finance.ts');
const questionBank = read('supabase/functions/api/handlers/question-bank.ts');
const migration = read('supabase/migrations/20260814050548_admin_operational_views.sql');
const api = read('src/services/api.js');
const routes = read('src/routes/AppRoutes.jsx');
const dashboard = read('src/pages/AdminDashboardPage.jsx');
const financePage = read('src/pages/AdminFinancePage.jsx');
const questionsPage = read('src/pages/AdminQuestionBankPage.jsx');

for (const path of [
  '/admin/users',
  '/admin/finanzas/pagos',
  '/admin/finanzas/comprobantes',
  '/admin/finanzas/conciliacion',
  '/admin/finanzas/exportar',
]) assert.match(router, new RegExp(path.replaceAll('/', '\\/')));

assert.match(admin, /const sortColumns:[\s\S]*registeredAt: 'registered_at'/);
assert.match(admin, /\.range\(offset, offset \+ size - 1\)/);
assert.match(admin, /requireAdmin\(req\)/);
assert.match(migration, /security_invoker\s*=\s*true/);
assert.match(migration, /revoke all[\s\S]*anon, authenticated, service_role/);
assert.match(migration, /grant select[\s\S]*service_role/);

assert.match(finance, /Authorization: `Bearer \$\{secretKey\}`/);
assert.match(finance, /creation_date_from/);
assert.match(finance, /Solo en sistema/);
assert.match(finance, /Solo en Culqi/);
assert.match(finance, /Monto diferente/);
assert.match(finance, /createSignedUrl\(String\(path\), 600\)/);
assert.match(finance, /text\/csv/);
assert.doesNotMatch(api, /CULQI_SECRET_KEY/);

assert.match(questionBank, /numeroPdf: 'numero_pdf'/);
assert.match(questionBank, /\.order\(sortColumns\[sort\]/);
assert.match(questionBank, /requireAdmin\(req\)/);
assert.match(api, /getAdminUsers/);
assert.match(api, /getAdminReconciliation/);
assert.match(api, /exportAdminFinance/);
assert.match(routes, /path="\/admin\/finanzas"/);
assert.match(routes, /path="\/admin\/preguntas"/);
assert.match(dashboard, /SortableTh/);
assert.match(dashboard, /PaginationControls/);
assert.match(financePage, /Conciliar con Culqi/);
assert.match(financePage, /Pagos CSV/);
assert.match(financePage, /Comprobantes CSV/);
assert.match(financePage, /Cuadre CSV/);
assert.match(questionsPage, /QuestionImage/);
assert.match(questionsPage, /Explicación registrada/);
assert.match(questionsPage, /N\.º oficial/);
assert.match(questionsPage, /ID interno/);

console.log('Admin operations check passed');
