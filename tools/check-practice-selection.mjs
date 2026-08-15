import assert from 'node:assert/strict';
import { selectPracticeQuestionIds } from '../supabase/functions/api/_shared/practice-selection.ts';

const alwaysFirst = () => 0;
const now = new Date('2026-08-14T18:00:00.000Z');
const oldAttempt = '2026-08-13T05:00:00.000Z';
const recentAttempt = '2026-08-14T12:00:00.000Z';

const history = [
  { idPregunta: 10, esCorrecta: false, attemptId: 1, attemptedAt: oldAttempt },
  { idPregunta: 10, esCorrecta: false, attemptId: 2, attemptedAt: oldAttempt },
  { idPregunta: 20, esCorrecta: false, attemptId: 2, attemptedAt: oldAttempt },
  { idPregunta: 30, esCorrecta: true, attemptId: 2, attemptedAt: oldAttempt },
];

const weak = selectPracticeQuestionIds([10, 20, 30, 40], history, 3, 'weak', alwaysFirst, now);
assert.ok(weak.ids.includes(10));
assert.ok(weak.ids.includes(20));
assert.equal(weak.failedAvailable, 2);
assert.equal(new Set(weak.ids).size, 3);

const random = selectPracticeQuestionIds([10, 20, 30, 40], history, 3, 'random', alwaysFirst, now);
assert.equal(random.ids.length, 3);
assert.equal(new Set(random.ids).size, 3);
assert.ok(random.ids.every((id) => [10, 20, 30, 40].includes(id)));

const noHistory = selectPracticeQuestionIds([10, 20], [], 5, 'weak', alwaysFirst, now);
assert.equal(noHistory.appliedMode, 'random');
assert.equal(noHistory.ids.length, 2);

const adaptiveIds = Array.from({ length: 80 }, (_, index) => index + 1);
const adaptiveHistory = [
  ...Array.from({ length: 24 }, (_, index) => ({
    idPregunta: index + 1,
    esCorrecta: false,
    attemptId: `failed-${index}`,
    attemptedAt: oldAttempt,
  })),
  ...Array.from({ length: 16 }, (_, index) => ({
    idPregunta: index + 25,
    esCorrecta: true,
    attemptId: `correct-${index}`,
    attemptedAt: oldAttempt,
  })),
];
const adaptive = selectPracticeQuestionIds(adaptiveIds, adaptiveHistory, 40, 'adaptive', alwaysFirst, now);
assert.deepEqual(adaptive.composition, { failedSelected: 20, newSelected: 12, reviewSelected: 8 });
assert.equal(adaptive.ids.length, 40);
assert.equal(new Set(adaptive.ids).size, 40);

const spaced = selectPracticeQuestionIds(
  [1, 2, 3],
  [{ idPregunta: 1, esCorrecta: false, attemptId: 1, attemptedAt: recentAttempt }],
  2,
  'adaptive',
  alwaysFirst,
  now,
);
assert.equal(spaced.failedAvailable, 0);
assert.equal(spaced.deferredFailures, 1);

const mastered = selectPracticeQuestionIds(
  [1, 2, 3],
  [
    { idPregunta: 1, esCorrecta: false, attemptId: 1, attemptedAt: '2026-08-10T10:00:00.000Z' },
    { idPregunta: 1, esCorrecta: true, attemptId: 2, attemptedAt: '2026-08-11T10:00:00.000Z' },
    { idPregunta: 1, esCorrecta: true, attemptId: 3, attemptedAt: '2026-08-12T10:00:00.000Z' },
  ],
  2,
  'adaptive',
  alwaysFirst,
  now,
);
assert.equal(mastered.failedAvailable, 0);
assert.equal(mastered.retiredFailures, 1);
assert.equal(mastered.composition.failedSelected, 0);

const samePracticeDoesNotMaster = selectPracticeQuestionIds(
  [1, 2, 3],
  [
    { idPregunta: 1, esCorrecta: false, attemptId: 1, attemptedAt: '2026-08-10T10:00:00.000Z' },
    { idPregunta: 1, esCorrecta: true, attemptId: 2, attemptedAt: '2026-08-11T10:00:00.000Z' },
    { idPregunta: 1, esCorrecta: true, attemptId: 2, attemptedAt: '2026-08-11T10:01:00.000Z' },
  ],
  2,
  'adaptive',
  alwaysFirst,
  now,
);
assert.equal(samePracticeDoesNotMaster.failedAvailable, 1);
assert.equal(samePracticeDoesNotMaster.retiredFailures, 0);

console.log('practice selection checks passed');
