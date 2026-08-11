function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeSessionQuestionIds(rawIds: unknown): number[] {
  if (!Array.isArray(rawIds)) return [];
  return [...new Set(rawIds.map(positiveInteger).filter((id): id is number => id !== null))];
}

export function normalizeSubmittedAnswers(sessionQuestionIds: number[], rawAnswers: unknown[]) {
  const validQuestionIds = new Set(sessionQuestionIds);
  const answersByQuestion = new Map<number, Record<string, unknown>>();
  const outsideQuestionIds: number[] = [];
  const duplicateQuestionIds: number[] = [];

  for (const rawAnswer of Array.isArray(rawAnswers) ? rawAnswers : []) {
    if (!rawAnswer || typeof rawAnswer !== 'object') continue;
    const answer = rawAnswer as Record<string, unknown>;
    const questionId = positiveInteger(answer.idPregunta ?? answer.questionId ?? answer.id_pregunta);
    if (!questionId || !validQuestionIds.has(questionId)) {
      if (questionId) outsideQuestionIds.push(questionId);
      continue;
    }
    if (answersByQuestion.has(questionId)) {
      duplicateQuestionIds.push(questionId);
      continue;
    }
    answersByQuestion.set(questionId, answer);
  }

  return {
    answers: sessionQuestionIds.map((questionId) => {
      const answer = answersByQuestion.get(questionId);
      return {
        idPregunta: questionId,
        idOpcionSeleccionada: positiveInteger(
          answer?.idOpcionSeleccionada ?? answer?.selectedOptionId ?? answer?.id_opcion_seleccionada,
        ),
        marcada: Boolean(answer?.marcada ?? answer?.isMarked),
      };
    }),
    outsideQuestionIds,
    duplicateQuestionIds,
  };
}
