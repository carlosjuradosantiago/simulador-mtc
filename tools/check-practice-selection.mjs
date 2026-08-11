import assert from 'node:assert/strict';
import { selectPracticeQuestionIds } from '../supabase/functions/api/_shared/practice-selection.ts';

const alwaysFirst = () => 0;
const history = [
  { idPregunta: 10, esCorrecta: false },
  { idPregunta: 10, esCorrecta: false },
  { idPregunta: 20, esCorrecta: false },
  { idPregunta: 30, esCorrecta: true },
];

const weak = selectPracticeQuestionIds([10, 20, 30, 40], history, 3, 'weak', alwaysFirst);
assert.equal(weak.ids[0], 10);
assert.ok(weak.ids.includes(20));
assert.equal(weak.failedAvailable, 2);
assert.equal(new Set(weak.ids).size, 3);

const random = selectPracticeQuestionIds([10, 20, 30, 40], history, 3, 'random', alwaysFirst);
assert.equal(random.ids.length, 3);
assert.equal(new Set(random.ids).size, 3);
assert.ok(random.ids.every((id) => [10, 20, 30, 40].includes(id)));

const noHistory = selectPracticeQuestionIds([10, 20], [], 5, 'weak', alwaysFirst);
assert.equal(noHistory.appliedMode, 'random');
assert.equal(noHistory.ids.length, 2);

console.log('practice selection checks passed');
