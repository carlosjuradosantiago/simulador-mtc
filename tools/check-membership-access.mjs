import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  addCalendarMonths,
  filterFullPracticeAttempts,
  filterOfficialExamAttempts,
  FREE_FULL_EXAM_ATTEMPTS as API_FREE_FULL_EXAM_ATTEMPTS,
  hasFreeFullExamAttempt,
  isFullExamFree,
  isRealPayment,
  partitionAttempts,
} from '../supabase/functions/api/_shared/membership-access.ts';
import {
  OFFICIAL_EXAM_DURATION_SECONDS,
  OFFICIAL_EXAM_MIN_CORRECT,
  OFFICIAL_EXAM_QUESTION_COUNT,
  passesOfficialExam,
} from '../supabase/functions/api/_shared/exam-rules.ts';
import {
  FREE_FULL_EXAM_ATTEMPTS,
  FULL_EXAM_IS_FREE,
  OFFICIAL_EXAM_RULES,
  remainingFreeFullExamAttempts,
} from '../src/data/examRules.js';

assert.equal(isFullExamFree(undefined), true);
assert.equal(isFullExamFree('true'), true);
assert.equal(isFullExamFree('FALSE'), false);
assert.equal(FULL_EXAM_IS_FREE, true);
assert.equal(API_FREE_FULL_EXAM_ATTEMPTS, 2);
assert.equal(FREE_FULL_EXAM_ATTEMPTS, 2);
assert.equal(hasFreeFullExamAttempt(0), true);
assert.equal(hasFreeFullExamAttempt(1), true);
assert.equal(hasFreeFullExamAttempt(2), false);
assert.equal(remainingFreeFullExamAttempts(0), 2);
assert.equal(remainingFreeFullExamAttempts(1), 1);
assert.equal(remainingFreeFullExamAttempts(2), 0);

const historyFilters = [];
const fakeQuery = {
  eq(column, value) {
    historyFilters.push([column, value]);
    return this;
  },
};
assert.equal(filterOfficialExamAttempts(fakeQuery, 42), fakeQuery);
assert.deepEqual(historyFilters, [
  ['id_usuario', 42],
  ['tipo_intento', 'CRONOMETRADO'],
  ['total_preguntas', 40],
]);

const fullPracticeFilters = [];
const fullPracticeQuery = {
  eq(column, value) {
    fullPracticeFilters.push(['eq', column, value]);
    return this;
  },
  in(column, values) {
    fullPracticeFilters.push(['in', column, values]);
    return this;
  },
};
assert.equal(filterFullPracticeAttempts(fullPracticeQuery, 42), fullPracticeQuery);
assert.deepEqual(fullPracticeFilters, [
  ['eq', 'id_usuario', 42],
  ['in', 'tipo_intento', ['CRONOMETRADO', 'PRACTICA_ADAPTATIVA', 'PRACTICA']],
  ['eq', 'total_preguntas', 40],
]);

assert.equal(addCalendarMonths('2026-01-31T12:00:00.000Z', 1).toISOString(), '2026-02-28T12:00:00.000Z');
assert.equal(addCalendarMonths('2026-07-25T12:00:00.000Z', 1).toISOString(), '2026-08-25T12:00:00.000Z');

const attempts = partitionAttempts([
  { id: 1, tipo_intento: 'PRACTICA_CORTA', total_preguntas: 5 },
  { id: 2, tipo_intento: 'CRONOMETRADO', total_preguntas: 40 },
  { id: 3, tipo_intento: null, total_preguntas: 5 },
  { id: 4, tipo_intento: 'CRONOMETRADO', total_preguntas: 31 },
  { id: 5, tipo_intento: 'PRACTICA_ADAPTATIVA', total_preguntas: 40 },
  { id: 6, tipo_intento: 'PRACTICA_ADAPTATIVA', total_preguntas: 40, preguntas_respondidas: 2 },
]);
assert.deepEqual(attempts.timed.map(({ id }) => id), [2]);
assert.deepEqual(attempts.quick.map(({ id }) => id), [1]);
assert.deepEqual(attempts.adaptive.map(({ id }) => id), [5, 6]);
assert.deepEqual(attempts.ignored.map(({ id }) => id), [3, 4]);

assert.equal(isRealPayment({ estado: 'exitoso', metodo_pago: 'tarjeta', culqi_charge_id: 'chr_live_verified', verificado_proveedor_en: '2026-08-14T00:00:00.000Z' }), true);
assert.equal(isRealPayment({ estado: 'exitoso', metodo_pago: 'simulacion' }), false);
assert.equal(isRealPayment({ estado: 'fallido', metodo_pago: 'tarjeta' }), false);
assert.equal(isRealPayment({ estado: 'exitoso', metodo_pago: 'tarjeta', culqi_charge_id: 'chr_test_sandbox', verificado_proveedor_en: '2026-08-14T00:00:00.000Z' }), false);
assert.equal(isRealPayment({ estado: 'exitoso', metodo_pago: 'tarjeta', culqi_charge_id: 'chr_live_unverified' }), false);

assert.equal(OFFICIAL_EXAM_RULES.questionCount, OFFICIAL_EXAM_QUESTION_COUNT);
assert.equal(OFFICIAL_EXAM_RULES.durationSeconds, OFFICIAL_EXAM_DURATION_SECONDS);
assert.equal(OFFICIAL_EXAM_RULES.minimumCorrectAnswers, OFFICIAL_EXAM_MIN_CORRECT);
assert.equal(passesOfficialExam(34), false);
assert.equal(passesOfficialExam(35), true);

const plansPage = readFileSync(new URL('../src/pages/PlansPage.jsx', import.meta.url), 'utf8');
const simulatorPage = readFileSync(new URL('../src/pages/SimulatorPage.jsx', import.meta.url), 'utf8');
const publicHeader = readFileSync(new URL('../src/components/layout/PublicHeader.jsx', import.meta.url), 'utf8');
const publicFooter = readFileSync(new URL('../src/components/layout/PublicFooter.jsx', import.meta.url), 'utf8');
const vehicleStartPanel = readFileSync(new URL('../src/components/practice/VehicleStartPanel.jsx', import.meta.url), 'utf8');
const routes = readFileSync(new URL('../src/routes/AppRoutes.jsx', import.meta.url), 'utf8');
const seoGenerator = readFileSync(new URL('./generate-seo-assets.mjs', import.meta.url), 'utf8');
const apiRouter = readFileSync(new URL('../supabase/functions/api/index.ts', import.meta.url), 'utf8');
const timedExamHandler = readFileSync(new URL('../supabase/functions/api/handlers/preguntas.ts', import.meta.url), 'utf8');
const adaptivePracticeHandler = readFileSync(new URL('../supabase/functions/api/handlers/practica.ts', import.meta.url), 'utf8');
const dashboardPage = readFileSync(new URL('../src/pages/DashboardPage.jsx', import.meta.url), 'utf8');
const landingPage = readFileSync(new URL('../src/pages/LandingPage.jsx', import.meta.url), 'utf8');
assert.match(plansPage, /Suscribete nuevamente para volver a rendir simulacros completos/);
assert.match(plansPage, /Con Yape, tu suscripcion mensual queda activa durante un mes/);
assert.doesNotMatch(plansPage, /Un mes, sin renovacion|no realiza cobros futuros|Pagar \$\{priceLabel\(plan\.price\)\} con Yape/);
assert.match(simulatorPage, /Necesitas una suscripcion activa/);
assert.match(simulatorPage, /Suscribete para volver a rendir simulacros completos/);
assert.match(publicHeader, /to="\/planes"[\s\S]*Planes/);
assert.doesNotMatch(publicHeader, /FULL_EXAM_IS_FREE/);
assert.match(publicHeader, /Cómo funciona/);
assert.match(publicFooter, /\['Planes', '\/planes'\]/);
assert.doesNotMatch(publicFooter, /FULL_EXAM_IS_FREE/);
assert.match(routes, /path="\/planes" element=\{<SubscriptionPage \/>\}/);
assert.match(routes, /path="\/suscripcion" element=\{<Navigate to="\/planes" replace \/>\}/);
assert.match(routes, /path="\/checkout" element=\{FULL_EXAM_IS_FREE/);
assert.doesNotMatch(routes.split('<Route element={<ProtectedRoute />}>')[1] || '', /path="\/planes"/);
assert.doesNotMatch(plansPage, /nunca recibimos|numero completo de tu tarjeta|formulario protegido/i);
assert.match(vehicleStartPanel, /Simulacro completo disponible/);
assert.match(vehicleStartPanel, /Pruebas 1 y 2 sin costo; la 3\.ª requiere suscripción/);
assert.doesNotMatch(seoGenerator, /suscripción mensual por S\/ 12/);
for (const source of [publicHeader, publicFooter, vehicleStartPanel, seoGenerator]) {
  assert.doesNotMatch(source, /20\/12\/8/);
}
assert.match(apiRouter, /path\.startsWith\('\/pagos\/'\) && isFullExamFree/);
assert.match(timedExamHandler, /getFullPracticeAccess/);
assert.match(timedExamHandler, /freeAttemptLimit: FREE_FULL_EXAM_ATTEMPTS/);
assert.match(adaptivePracticeHandler, /cantidadPreguntas === 40/);
assert.match(adaptivePracticeHandler, /getFullPracticeAccess/);
assert.match(adaptivePracticeHandler, /freeAttemptLimit: FREE_FULL_EXAM_ATTEMPTS/);
assert.match(dashboardPage, /freeFullExamAttemptsRemaining/);
assert.match(landingPage, /FREE_FULL_EXAM_ATTEMPTS/);
assert.match(simulatorPage, /<Navigate to=\{`\/checkout\?category=\$\{categoria\}`\} replace \/>/);

console.log('membership access checks passed');
