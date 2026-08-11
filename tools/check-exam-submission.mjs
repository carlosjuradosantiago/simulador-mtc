import assert from 'node:assert/strict';
import {
  normalizeSessionQuestionIds,
  normalizeSubmittedAnswers,
} from '../supabase/functions/api/_shared/exam-submission.ts';

assert.deepEqual(normalizeSessionQuestionIds([3, '2', 3, null, -1]), [3, 2]);

const normalized = normalizeSubmittedAnswers([10, 20, 30], [
  { idPregunta: 20, idOpcionSeleccionada: 202, marcada: true },
  { idPregunta: 20, idOpcionSeleccionada: 999 },
  { idPregunta: 99, idOpcionSeleccionada: 990 },
]);

assert.deepEqual(normalized.answers, [
  { idPregunta: 10, idOpcionSeleccionada: null, marcada: false },
  { idPregunta: 20, idOpcionSeleccionada: 202, marcada: true },
  { idPregunta: 30, idOpcionSeleccionada: null, marcada: false },
]);
assert.deepEqual(normalized.duplicateQuestionIds, [20]);
assert.deepEqual(normalized.outsideQuestionIds, [99]);

console.log('Exam submission checks passed.');
