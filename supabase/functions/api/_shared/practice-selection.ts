export type PracticeSelectionMode = 'random' | 'weak';

type AnswerDetail = {
  idPregunta?: number | string;
  id_pregunta?: number | string;
  questionId?: number | string;
  esCorrecta?: boolean;
  es_correcta?: boolean;
  sinResponder?: boolean;
  sin_responder?: boolean;
};

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

export function selectPracticeQuestionIds(
  allQuestionIds: number[],
  answerDetails: AnswerDetail[],
  requestedCount: number,
  mode: PracticeSelectionMode,
  random: () => number = Math.random,
) {
  const availableIds = [...new Set(allQuestionIds.map(Number).filter(Number.isFinite))];
  const count = Math.min(Math.max(Math.trunc(requestedCount) || 5, 1), availableIds.length);

  if (mode !== 'weak') {
    return {
      ids: shuffled(availableIds, random).slice(0, count),
      failedAvailable: 0,
      appliedMode: 'random' as PracticeSelectionMode,
    };
  }

  const availableSet = new Set(availableIds);
  const failureCounts = new Map<number, number>();

  answerDetails.forEach((answer) => {
    const questionId = Number(answer.idPregunta ?? answer.id_pregunta ?? answer.questionId);
    const isCorrect = answer.esCorrecta ?? answer.es_correcta;
    const isUnanswered = Boolean(answer.sinResponder ?? answer.sin_responder);

    if (!availableSet.has(questionId) || (isCorrect !== false && !isUnanswered)) return;
    failureCounts.set(questionId, (failureCounts.get(questionId) ?? 0) + 1);
  });

  const failedIds = shuffled([...failureCounts.entries()], random)
    .sort((left, right) => right[1] - left[1])
    .map(([questionId]) => questionId);
  const failedSet = new Set(failedIds);
  const remainingIds = shuffled(availableIds.filter((questionId) => !failedSet.has(questionId)), random);

  return {
    ids: [...failedIds, ...remainingIds].slice(0, count),
    failedAvailable: failedIds.length,
    appliedMode: failedIds.length ? 'weak' as PracticeSelectionMode : 'random' as PracticeSelectionMode,
  };
}
