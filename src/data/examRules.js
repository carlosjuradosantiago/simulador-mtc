export const OFFICIAL_EXAM_RULES = Object.freeze({
  questionCount: 40,
  durationMinutes: 40,
  durationSeconds: 40 * 60,
  minimumCorrectAnswers: 35,
});

export const FREE_FULL_EXAM_ATTEMPTS = 5;

export function remainingFreeFullExamAttempts(completedAttempts) {
  return Math.max(FREE_FULL_EXAM_ATTEMPTS - Math.max(Number(completedAttempts) || 0, 0), 0);
}

export const FULL_EXAM_IS_FREE = typeof __SIMULADOR_FULL_EXAM_FREE__ === 'boolean'
  ? __SIMULADOR_FULL_EXAM_FREE__
  : true;
