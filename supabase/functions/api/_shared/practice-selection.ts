export type PracticeSelectionMode = 'random' | 'weak' | 'adaptive';

type AnswerDetail = {
  idPregunta?: number | string;
  id_pregunta?: number | string;
  questionId?: number | string;
  esCorrecta?: boolean;
  es_correcta?: boolean;
  sinResponder?: boolean;
  sin_responder?: boolean;
  attemptId?: number | string;
  id_intento?: number | string;
  practiceSessionId?: number | string;
  attemptedAt?: string;
  respondido_en?: string;
  createdAt?: string;
  created_at?: string;
};

type QuestionProgress = {
  questionId: number;
  failures: number;
  correctStreak: number;
  lastAttemptAt: number;
  attempts: Set<string>;
};

const REVIEW_DELAY_MS = 12 * 60 * 60 * 1000;

export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

function answerTimestamp(answer: AnswerDetail) {
  const value = answer.attemptedAt ?? answer.respondido_en ?? answer.createdAt ?? answer.created_at;
  const timestamp = value ? Date.parse(value) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildQuestionProgress(answerDetails: AnswerDetail[], availableSet: Set<number>) {
  const progress = new Map<number, QuestionProgress>();
  const orderedAnswers = answerDetails
    .map((answer, index) => ({ answer, index, timestamp: answerTimestamp(answer) }))
    .sort((left, right) => left.timestamp - right.timestamp || left.index - right.index);

  orderedAnswers.forEach(({ answer, index, timestamp }) => {
    const questionId = Number(answer.idPregunta ?? answer.id_pregunta ?? answer.questionId);
    if (!availableSet.has(questionId)) return;

    const attemptKey = String(
      answer.attemptId
      ?? answer.id_intento
      ?? answer.practiceSessionId
      ?? `answer-${index}`,
    );
    const current = progress.get(questionId) ?? {
      questionId,
      failures: 0,
      correctStreak: 0,
      lastAttemptAt: 0,
      attempts: new Set<string>(),
    };
    if (current.attempts.has(attemptKey)) return;

    const isCorrect = answer.esCorrecta ?? answer.es_correcta;
    const isUnanswered = Boolean(answer.sinResponder ?? answer.sin_responder);
    current.attempts.add(attemptKey);
    current.lastAttemptAt = Math.max(current.lastAttemptAt, timestamp);
    if (isCorrect === true && !isUnanswered) {
      current.correctStreak += 1;
    } else {
      current.failures += 1;
      current.correctStreak = 0;
    }
    progress.set(questionId, current);
  });

  return progress;
}

function prioritizedFailures(items: QuestionProgress[], random: () => number) {
  return shuffled(items, random).sort((left, right) => (
    right.failures - left.failures
    || left.correctStreak - right.correctStreak
    || left.lastAttemptAt - right.lastAttemptAt
  ));
}

export function selectPracticeQuestionIds(
  allQuestionIds: number[],
  answerDetails: AnswerDetail[],
  requestedCount: number,
  mode: PracticeSelectionMode,
  random: () => number = Math.random,
  now = new Date(),
) {
  const availableIds = [...new Set(allQuestionIds.map(Number).filter(Number.isFinite))];
  const count = Math.min(Math.max(Math.trunc(requestedCount) || 5, 1), availableIds.length);
  const emptyComposition = { failedSelected: 0, newSelected: 0, reviewSelected: 0 };

  if (mode === 'random') {
    return {
      ids: shuffled(availableIds, random).slice(0, count),
      failedAvailable: 0,
      deferredFailures: 0,
      retiredFailures: 0,
      seenQuestions: 0,
      composition: emptyComposition,
      appliedMode: 'random' as PracticeSelectionMode,
    };
  }

  const availableSet = new Set(availableIds);
  const progress = buildQuestionProgress(answerDetails, availableSet);
  const nowTime = now.getTime();
  const unresolvedFailures = [...progress.values()].filter((item) => item.failures > 0 && item.correctStreak < 2);
  const dueFailures = prioritizedFailures(
    unresolvedFailures.filter((item) => !item.lastAttemptAt || nowTime - item.lastAttemptAt >= REVIEW_DELAY_MS),
    random,
  );
  const deferredFailures = prioritizedFailures(
    unresolvedFailures.filter((item) => item.lastAttemptAt && nowTime - item.lastAttemptAt < REVIEW_DELAY_MS),
    random,
  );
  const unresolvedIds = new Set(unresolvedFailures.map((item) => item.questionId));
  const newIds = shuffled(availableIds.filter((questionId) => !progress.has(questionId)), random);
  const reviewIds = shuffled(
    availableIds.filter((questionId) => progress.has(questionId) && !unresolvedIds.has(questionId)),
    random,
  );
  const selected: number[] = [];
  const selectedSet = new Set<number>();
  const composition = { ...emptyComposition };

  const take = (ids: number[], limit: number, bucket: keyof typeof composition) => {
    for (const questionId of ids) {
      if (selected.length >= count || limit <= 0) break;
      if (selectedSet.has(questionId)) continue;
      selected.push(questionId);
      selectedSet.add(questionId);
      composition[bucket] += 1;
      limit -= 1;
    }
  };

  if (mode === 'adaptive') {
    const failedTarget = Math.round(count * 0.5);
    const newTarget = Math.round(count * 0.3);
    const reviewTarget = count - failedTarget - newTarget;
    take(dueFailures.map((item) => item.questionId), failedTarget, 'failedSelected');
    take(newIds, newTarget, 'newSelected');
    take(reviewIds, reviewTarget, 'reviewSelected');
  } else {
    take(dueFailures.map((item) => item.questionId), count, 'failedSelected');
  }

  take(dueFailures.map((item) => item.questionId), count, 'failedSelected');
  take(newIds, count, 'newSelected');
  take(reviewIds, count, 'reviewSelected');
  take(deferredFailures.map((item) => item.questionId), count, 'failedSelected');
  take(availableIds, count, 'reviewSelected');

  return {
    ids: shuffled(selected, random),
    failedAvailable: dueFailures.length,
    deferredFailures: deferredFailures.length,
    retiredFailures: [...progress.values()].filter((item) => item.failures > 0 && item.correctStreak >= 2).length,
    seenQuestions: progress.size,
    composition,
    appliedMode: mode === 'weak' && unresolvedFailures.length === 0
      ? 'random' as PracticeSelectionMode
      : mode,
  };
}
