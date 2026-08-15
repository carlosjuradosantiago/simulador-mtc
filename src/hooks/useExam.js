import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OFFICIAL_EXAM_RULES } from '../data/examRules.js';
import { api, resolveCategoryId, toQuestion, toResult } from '../services/api.js';

const QUICK_PRACTICE_QUESTIONS = 5;
const ADAPTIVE_PRACTICE_QUESTIONS = 40;
const inFlightStarts = new Map();

function getStartRequest(key, createRequest) {
  const existing = inFlightStarts.get(key);
  if (existing) return existing;

  const request = createRequest();
  inFlightStarts.set(key, request);
  request.then(
    () => {
      if (inFlightStarts.get(key) === request) inFlightStarts.delete(key);
    },
    () => {
      if (inFlightStarts.get(key) === request) inFlightStarts.delete(key);
    },
  );
  return request;
}

function elapsedLabel(startedAt) {
  const seconds = Math.max(Math.round((Date.now() - startedAt) / 1000), 0);
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

export function useExam(category, mode = 'quick', strategy = 'random') {
  const quickPractice = mode !== 'exam';
  const adaptivePractice = mode === 'adaptive';
  const practiceStrategy = adaptivePractice ? 'adaptive' : strategy === 'weak' ? 'weak' : 'random';
  const practiceQuestionCount = adaptivePractice ? ADAPTIVE_PRACTICE_QUESTIONS : QUICK_PRACTICE_QUESTIONS;
  const startedAtRef = useRef(Date.now());
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(quickPractice ? null : OFFICIAL_EXAM_RULES.durationSeconds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [feedbackByQuestion, setFeedbackByQuestion] = useState({});
  const [savingAnswer, setSavingAnswer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setErrorStatus(null);
    setSaveError('');
    setQuestions([]);
    setAnswers({});
    setMarked([]);
    setFeedbackByQuestion({});
    setSavingAnswer(false);
    setCurrentIndex(0);
    setSessionId(null);
    setTimeRemaining(quickPractice ? null : OFFICIAL_EXAM_RULES.durationSeconds);
    startedAtRef.current = Date.now();

    const categoryId = resolveCategoryId(category);
    const request = getStartRequest(
      `${categoryId}:${mode}:${practiceStrategy}`,
      () => (
        quickPractice
          ? api.startPractice(categoryId, practiceQuestionCount, practiceStrategy)
          : api.startTimedExam(categoryId)
      ),
    );

    request.then((response) => {
      if (cancelled) return;
      const rawQuestions = response.preguntas ?? response.questions ?? [];
      const questionLimit = quickPractice ? practiceQuestionCount : rawQuestions.length;
      setSessionId(response.practiceSessionId ?? response.sessionId ?? response.idSesionPractica ?? response.id_sesion_practica ?? response.id);
      setQuestions(rawQuestions.slice(0, questionLimit).map((question) => toQuestion(question, category)));
      if (!quickPractice) {
        setTimeRemaining(response.tiempoRestante ?? response.durationSeconds ?? OFFICIAL_EXAM_RULES.durationSeconds);
      }
    }).catch((requestError) => {
      if (!cancelled) {
        setError(requestError.message);
        setErrorStatus(requestError.status ?? null);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [category, mode, practiceQuestionCount, practiceStrategy, quickPractice]);

  useEffect(() => {
    if (quickPractice || !questions.length) return undefined;
    const intervalId = window.setInterval(() => {
      setTimeRemaining((currentTime) => Math.max((currentTime ?? 0) - 1, 0));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [questions.length, quickPractice]);

  const currentQuestion = questions[currentIndex];

  const selectAnswer = useCallback(async (questionId, optionId) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: optionId }));
    if (!sessionId) return null;

    setSavingAnswer(true);
    try {
      const feedback = await api.savePracticeAnswer(sessionId, questionId, optionId);
      setFeedbackByQuestion((current) => ({ ...current, [questionId]: feedback }));
      setSaveError('');
      return feedback;
    } catch {
      setSaveError(quickPractice
        ? 'No pudimos guardar esta respuesta todavía. Puedes continuar con la práctica.'
        : 'No pudimos revisar esta respuesta. Revisa tu conexión y vuelve a intentarlo.');
      return null;
    } finally {
      setSavingAnswer(false);
    }
  }, [quickPractice, sessionId]);

  const toggleMarked = useCallback((questionId) => {
    setMarked((currentMarked) => (
      currentMarked.includes(questionId)
        ? currentMarked.filter((markedId) => markedId !== questionId)
        : [...currentMarked, questionId]
    ));
  }, []);

  const goToQuestion = useCallback((index) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index);
  }, [questions.length]);

  const progress = useMemo(() => {
    const answered = Object.keys(answers).length;
    return {
      answered,
      unanswered: questions.length - answered,
      marked: marked.length,
      percent: questions.length ? Math.round((answered / questions.length) * 100) : 0,
    };
  }, [answers, marked.length, questions.length]);

  const finishExam = useCallback(async () => {
    if (!sessionId) throw new Error('No hay una sesión activa.');

    const respuestasDetalle = questions.map((question, index) => {
      const rawSelectedOptionId = answers[question.id];
      const selectedOptionId = rawSelectedOptionId === null || rawSelectedOptionId === undefined
        ? null
        : Number(rawSelectedOptionId);
      const selectedOption = question.opciones.find((option) => String(option.id) === String(selectedOptionId));
      const correctOption = question.opciones.find((option) => option.esCorrecta || option.isCorrect);
      const sinResponder = selectedOptionId === null;

      return {
        idPregunta: question.id,
        numero: index + 1,
        tema: question.tema || 'General',
        temaOficial: question.tema || 'General',
        textoPregunta: question.texto,
        fundamento: question.fundamento || null,
        clase: question.clase || null,
        tipoSeccion: question.tipoSeccion || null,
        idOpcionSeleccionada: selectedOptionId,
        opcionSeleccionadaTexto: selectedOption?.texto ?? null,
        idOpcionCorrecta: correctOption?.id ?? null,
        opcionCorrectaTexto: correctOption?.texto ?? null,
        esCorrecta: !sinResponder && Boolean(selectedOption?.esCorrecta || selectedOption?.isCorrect),
        sinResponder,
        explicacion: question.explicacion || question.fundamento || null,
        marcada: marked.includes(question.id),
      };
    });

    const response = await api.submitExam(
      sessionId,
      respuestasDetalle.map((answer) => ({
        idPregunta: answer.idPregunta,
        idOpcionSeleccionada: answer.idOpcionSeleccionada,
        marcada: answer.marcada,
      })),
    );
    const backendResult = response.resultado ?? response;
    const result = toResult({
      ...backendResult,
      id: backendResult.intentoId ?? backendResult.id,
      category,
      respuestasDetalle: backendResult.respuestasDetalle ?? respuestasDetalle,
      tiempoUsado: elapsedLabel(startedAtRef.current),
    });
    const storedResults = JSON.parse(window.localStorage.getItem('simulamanejo:results') ?? '[]');
    window.localStorage.setItem('simulamanejo:results', JSON.stringify([result, ...storedResults]));
    return result;
  }, [answers, category, marked, questions, sessionId]);

  return {
    questions,
    currentQuestion,
    currentIndex,
    answers,
    marked,
    timeRemaining,
    progress,
    loading,
    error,
    errorStatus,
    saveError,
    feedbackByQuestion,
    savingAnswer,
    sessionId,
    quickPractice,
    adaptivePractice,
    practiceStrategy,
    selectAnswer,
    toggleMarked,
    goToQuestion,
    finishExam,
  };
}
