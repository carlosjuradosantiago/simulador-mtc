import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, resolveCategoryId, toQuestion, toResult } from '../services/api.js';

const EXAM_DURATION_SECONDS = 35 * 60;
const REFERENCE_INITIAL_SECONDS = 24 * 60 + 18;

export function useExam(category) {
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(REFERENCE_INITIAL_SECONDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setQuestions([]);
    setAnswers({});
    setMarked([]);
    setCurrentIndex(0);

    api.startTimedExam(resolveCategoryId(category)).then((response) => {
      if (cancelled) return;
      const rawQuestions = response.preguntas ?? response.questions ?? [];
      setSessionId(response.sessionId ?? response.idSesionPractica ?? response.id_sesion_practica ?? response.id);
      setQuestions(rawQuestions.map((question) => toQuestion(question, category)));
      setTimeRemaining(response.tiempoRestante ?? response.durationSeconds ?? EXAM_DURATION_SECONDS);
    }).catch((requestError) => {
      if (!cancelled) setError(requestError.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [category]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimeRemaining((currentTime) => Math.max(currentTime - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const currentQuestion = questions[currentIndex];

  const selectAnswer = useCallback((questionId, optionId) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: optionId }));
    if (sessionId) {
      api.savePracticeAnswer(sessionId, questionId, optionId).catch((requestError) => setError(requestError.message));
    }
  }, [sessionId]);

  const toggleMarked = useCallback((questionId) => {
    setMarked((currentMarked) =>
      currentMarked.includes(questionId)
        ? currentMarked.filter((markedId) => markedId !== questionId)
        : [...currentMarked, questionId],
    );
  }, []);

  const goToQuestion = useCallback(
    (index) => {
      if (index >= 0 && index < questions.length) {
        setCurrentIndex(index);
      }
    },
    [questions.length],
  );

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
    if (!sessionId) {
      throw new Error('No hay una sesión de simulacro activa.');
    }

    const respuestasDetalle = questions.map((question, index) => {
      const selectedOptionId = answers[question.id] ? Number(answers[question.id]) : null;
      const selectedOption = question.opciones.find((option) => String(option.id) === String(selectedOptionId));
      const correctOption = question.opciones.find((option) => option.esCorrecta || option.isCorrect);
      const sinResponder = selectedOptionId === null || selectedOptionId === undefined;

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
      respuestasDetalle,
      tiempoUsado: `${Math.floor((EXAM_DURATION_SECONDS - timeRemaining) / 60)}m ${String((EXAM_DURATION_SECONDS - timeRemaining) % 60).padStart(2, '0')}s`,
    });
    const storedResults = JSON.parse(window.localStorage.getItem('simulamanejo:results') ?? '[]');
    window.localStorage.setItem('simulamanejo:results', JSON.stringify([result, ...storedResults]));
    return result;
  }, [answers, category, marked, questions, sessionId, timeRemaining]);

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
    sessionId,
    selectAnswer,
    toggleMarked,
    goToQuestion,
    finishExam,
  };
}
