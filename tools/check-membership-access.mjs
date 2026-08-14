import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  addCalendarMonths,
  filterOfficialExamAttempts,
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
import { FULL_EXAM_IS_FREE, OFFICIAL_EXAM_RULES } from '../src/data/examRules.js';

assert.equal(isFullExamFree(undefined), true);
assert.equal(isFullExamFree('true'), true);
assert.equal(isFullExamFree('FALSE'), false);
assert.equal(FULL_EXAM_IS_FREE, true);

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

assert.equal(addCalendarMonths('2026-01-31T12:00:00.000Z', 1).toISOString(), '2026-02-28T12:00:00.000Z');
assert.equal(addCalendarMonths('2026-07-25T12:00:00.000Z', 1).toISOString(), '2026-08-25T12:00:00.000Z');

const attempts = partitionAttempts([
  { id: 1, tipo_intento: 'PRACTICA_CORTA', total_preguntas: 5 },
  { id: 2, tipo_intento: 'CRONOMETRADO', total_preguntas: 40 },
  { id: 3, tipo_intento: null, total_preguntas: 5 },
  { id: 4, tipo_intento: 'CRONOMETRADO', total_preguntas: 31 },
]);
assert.deepEqual(attempts.timed.map(({ id }) => id), [2]);
assert.deepEqual(attempts.quick.map(({ id }) => id), [1]);
assert.deepEqual(attempts.ignored.map(({ id }) => id), [3, 4]);

assert.equal(isRealPayment({ estado: 'exitoso', metodo_pago: 'tarjeta' }), true);
assert.equal(isRealPayment({ estado: 'exitoso', metodo_pago: 'simulacion' }), false);
assert.equal(isRealPayment({ estado: 'fallido', metodo_pago: 'tarjeta' }), false);

assert.equal(OFFICIAL_EXAM_RULES.questionCount, OFFICIAL_EXAM_QUESTION_COUNT);
assert.equal(OFFICIAL_EXAM_RULES.durationSeconds, OFFICIAL_EXAM_DURATION_SECONDS);
assert.equal(OFFICIAL_EXAM_RULES.minimumCorrectAnswers, OFFICIAL_EXAM_MIN_CORRECT);
assert.equal(passesOfficialExam(34), false);
assert.equal(passesOfficialExam(35), true);

const plansPage = readFileSync(new URL('../src/pages/PlansPage.jsx', import.meta.url), 'utf8');
const simulatorPage = readFileSync(new URL('../src/pages/SimulatorPage.jsx', import.meta.url), 'utf8');
assert.match(plansPage, /Suscribete nuevamente para volver a rendir simulacros completos/);
assert.match(plansPage, /Con Yape, tu suscripcion mensual queda activa durante un mes/);
assert.doesNotMatch(plansPage, /Un mes, sin renovacion|no realiza cobros futuros|Pagar \$\{priceLabel\(plan\.price\)\} con Yape/);
assert.match(simulatorPage, /Necesitas una suscripcion activa/);
assert.match(simulatorPage, /Suscribete para volver a rendir simulacros completos/);

console.log('membership access checks passed');
