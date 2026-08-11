import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [authModal, topbar, progressPage, settingsHandler, registrationHandler, categorySource] = await Promise.all([
  readFile(new URL('../src/components/auth/AuthModal.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/layout/Topbar.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/ProgressPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/api/handlers/settings.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/api/handlers/auth.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/data/vehicleChoices.js', import.meta.url), 'utf8'),
]);

const categoryBlock = categorySource.split('export const vehicleChoices')[0];
const categoryIds = [...categoryBlock.matchAll(/\{ id: (\d+), title:/g)].map((match) => Number(match[1]));
assert.equal(categoryIds.length, 9);
assert.equal(new Set(categoryIds).size, 9);
assert.match(authModal, /¿Qué licencia vas a sacar\?/);
assert.match(authModal, /<option value="">Elige tu categoría<\/option>/);
assert.doesNotMatch(authModal, /category: 25/);
assert.match(topbar, /\/dashboard\?chooseCategory=1/);
assert.doesNotMatch(topbar, /user\?\.category \?\? 25/);
assert.match(progressPage, /Iniciar simulacro/);
assert.match(progressPage, /AreaChart/);
assert.doesNotMatch(progressPage, />0\/40</);
assert.match(settingsHandler, /categoria_confirmada/);
assert.match(registrationHandler, /saveConfirmedCategory/);

console.log('Category preference checks passed.');
