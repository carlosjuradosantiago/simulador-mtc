export const OFFICIAL_EXAM_RULES = Object.freeze({
  questionCount: 40,
  durationMinutes: 40,
  durationSeconds: 40 * 60,
  minimumCorrectAnswers: 35,
});

export const FULL_EXAM_IS_FREE = import.meta.env?.VITE_FULL_EXAM_FREE_ACCESS !== 'false';
