export const OFFICIAL_EXAM_QUESTION_COUNT = 40;
export const OFFICIAL_EXAM_DURATION_SECONDS = 40 * 60;
export const OFFICIAL_EXAM_MIN_CORRECT = 35;

export function passesOfficialExam(correctAnswers: number) {
  return Number(correctAnswers) >= OFFICIAL_EXAM_MIN_CORRECT;
}
