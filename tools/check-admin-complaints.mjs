import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [handler, adminHandler, routes, apiClient, page, email, migration] = await Promise.all([
  readFile(new URL('../supabase/functions/api/handlers/admin_reclamaciones.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/api/handlers/admin.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/api/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/api.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/AdminComplaintsPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/api/_shared/email.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260814024500_admin_complaint_management.sql', import.meta.url), 'utf8'),
]);

assert.match(adminHandler, /export async function requireAdmin/);
assert.match(handler, /await requireAdmin\(req\)/g);
assert.match(handler, /estado_reclamo: 'ATENDIDO'/);
assert.match(handler, /if \(!emailResult\?\.success\)[\s\S]*estado_reclamo: 'EN_PROCESO'/);
assert.match(handler, /respuesta_enviada_en: respondedAt/);
assert.match(handler, /\.is\('respuesta_enviada_en', null\)/);
assert.match(handler, /safeText = \/\^\[=\+\\-@\]\//);
assert.match(email, /idempotencyKey: `complaint-response\/\$\{data\.numeroReclamo\}`/);
assert.match(routes, /GET[\s\S]*\/admin\/reclamaciones/);
assert.match(routes, /Access-Control-Allow-Methods': '[^']*PATCH/);
assert.match(routes, /handleRespondAdminComplaint/);
assert.match(apiClient, /getAdminComplaints:[\s\S]*auth: true/);
assert.match(apiClient, /respondAdminComplaint:[\s\S]*auth: true/);
assert.match(page, /Enviar respuesta y cerrar/);
assert.match(page, /className="max-w-5xl"/);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all on table public\.libro_reclamaciones from anon, authenticated/);
assert.match(migration, /respuesta_email_id/);

console.log('Admin complaint management security and workflow checks passed.');
