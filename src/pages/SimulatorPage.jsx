import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  LockKeyhole,
  LogOut,
  Pause,
  Play,
  Volume2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/layout/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import { OptionContent, QuestionImage } from '../components/ui/QuestionMedia.jsx';
import { FULL_EXAM_IS_FREE, OFFICIAL_EXAM_RULES } from '../data/examRules.js';
import { useExam } from '../hooks/useExam.js';
import { normalizeCategoryName } from '../services/api.js';
import { cn } from '../utils/cn.js';
import { formatTime } from '../utils/formatTime.js';

function hasAnswer(answerId) {
  return answerId !== null && answerId !== undefined;
}

export default function SimulatorPage() {
  const { categoria = '25' } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'exam' ? 'exam' : 'quick';
  const strategy = searchParams.get('strategy') === 'weak' ? 'weak' : 'random';
  const navigate = useNavigate();
  const finishedRef = useRef(false);
  const {
    questions,
    currentQuestion,
    currentIndex,
    answers,
    timeRemaining,
    loading,
    error,
    errorStatus,
    saveError,
    quickPractice,
    selectAnswer,
    goToQuestion,
    finishExam,
  } = useExam(categoria.toUpperCase(), mode, strategy);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState('');
  const [pendingAnswers, setPendingAnswers] = useState({});
  const [speechState, setSpeechState] = useState('idle');
  const speechRef = useRef(null);

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const pendingAnswer = currentQuestion ? pendingAnswers[currentQuestion.id] : null;
  const isAnswered = hasAnswer(currentAnswer);
  const isRevealed = quickPractice && isAnswered;
  const selectedAnswerId = isRevealed ? currentAnswer : (hasAnswer(pendingAnswer) ? pendingAnswer : currentAnswer);
  const selectedOption = currentQuestion?.opciones.find((option) => String(option.id) === String(currentAnswer));
  const correctOption = currentQuestion?.opciones.find((option) => option.esCorrecta || option.isCorrect);
  const answeredCorrectly = Boolean(isRevealed && selectedOption && (selectedOption.esCorrecta || selectedOption.isCorrect));
  const explanation = currentQuestion?.explicacion || currentQuestion?.fundamento || '';
  const isLastQuestion = currentIndex === questions.length - 1;
  const canContinue = quickPractice ? (isRevealed || hasAnswer(pendingAnswer)) : isAnswered;
  const examLabel = normalizeCategoryName(categoria);
  const practiceLabel = strategy === 'weak' ? 'Refuerzo de errores' : 'Preguntas aleatorias';

  useEffect(() => {
    finishedRef.current = false;
    setFinishError('');
    setPendingAnswers({});
  }, [categoria, mode, strategy]);

  useEffect(() => {
    speechRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeechState('idle');

    return () => {
      speechRef.current = null;
      window.speechSynthesis?.cancel();
    };
  }, [currentQuestion?.id]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [currentIndex]);

  const handleFinish = useCallback(async () => {
    if (finishedRef.current || finishing || loading || !questions.length) return;

    finishedRef.current = true;
    setFinishing(true);
    setFinishError('');
    try {
      const result = await finishExam();
      if (!result?.id) throw new Error('No se recibió el resultado.');
      navigate(`/resultados/${result.id}`);
    } catch {
      finishedRef.current = false;
      setFinishing(false);
      setFinishError('No pudimos guardar tu resultado. Revisa tu conexión y vuelve a intentarlo.');
    }
  }, [finishExam, finishing, loading, navigate, questions.length]);

  useEffect(() => {
    if (!quickPractice && timeRemaining === 0 && questions.length) {
      void handleFinish();
    }
  }, [handleFinish, questions.length, quickPractice, timeRemaining]);

  const toggleSpeech = () => {
    if (!currentQuestion || !('speechSynthesis' in window)) return;

    if (speechState === 'speaking') {
      window.speechSynthesis.pause();
      setSpeechState('paused');
      return;
    }
    if (speechState === 'paused') {
      window.speechSynthesis.resume();
      setSpeechState('speaking');
      return;
    }

    window.speechSynthesis.cancel();
    const options = currentQuestion.opciones
      .map((option, index) => `${String.fromCharCode(65 + index)}. ${option.texto ?? ''}`)
      .join('. ');
    const message = new SpeechSynthesisUtterance(`${currentQuestion.texto}. ${options}`);
    message.lang = 'es-PE';
    message.rate = 0.88;
    message.onstart = () => {
      if (speechRef.current === message) setSpeechState('speaking');
    };
    message.onend = () => {
      if (speechRef.current === message) {
        speechRef.current = null;
        setSpeechState('idle');
      }
    };
    message.onerror = message.onend;
    speechRef.current = message;
    setSpeechState('speaking');
    window.speechSynthesis.speak(message);
  };

  const chooseAnswer = (optionId) => {
    if (isRevealed || !currentQuestion) return;
    if (quickPractice) {
      setPendingAnswers((current) => ({ ...current, [currentQuestion.id]: optionId }));
      return;
    }
    selectAnswer(currentQuestion.id, optionId);
  };

  const revealAnswer = () => {
    if (!currentQuestion || !hasAnswer(pendingAnswer)) return;
    selectAnswer(currentQuestion.id, pendingAnswer);
    setPendingAnswers((current) => {
      const next = { ...current };
      delete next[currentQuestion.id];
      return next;
    });
  };

  const handlePrimaryAction = () => {
    if (quickPractice && !isRevealed) {
      revealAnswer();
      return;
    }
    if (isLastQuestion) {
      void handleFinish();
      return;
    }
    goToQuestion(currentIndex + 1);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-white px-6 text-center">
        <div>
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-brand" />
          <p className="mt-4 text-lg font-bold text-slate-600">Preparando tus preguntas...</p>
        </div>
      </div>
    );
  }

  if (error || !currentQuestion) {
    const membershipRequired = !FULL_EXAM_IS_FREE && errorStatus === 402;
    return (
      <div className="grid min-h-screen place-items-center bg-white p-6 text-center">
        <div className="max-w-lg">
          {membershipRequired
            ? <LockKeyhole className="mx-auto h-12 w-12 text-brand" />
            : <X className="mx-auto h-12 w-12 text-danger" />}
          <h1 className="mt-4 font-display text-3xl font-black text-ink">
            {membershipRequired ? 'Activa el simulacro completo' : 'No pudimos iniciar la práctica'}
          </h1>
          <p className="mt-3 text-lg leading-7 text-slate-600">
            {error || 'No encontramos preguntas para esta licencia.'}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {membershipRequired ? (
              <Button as={Link} to={`/checkout?category=${categoria}`}>
                Activar por S/12
                <ArrowRight className="h-5 w-5" />
              </Button>
            ) : null}
            <Button as={Link} to="/dashboard" variant={membershipRequired ? 'secondary' : 'primary'}>
              <ArrowLeft className="h-5 w-5" />
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <BrandLogo />
          <span className="hidden h-7 w-px bg-line sm:block" />
          <span className="hidden text-sm font-bold text-slate-600 sm:block">
            {quickPractice ? practiceLabel : 'Simulacro completo'} · {examLabel}
          </span>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Acciones de la práctica">
            <Link
              to="/banco-preguntas"
              aria-label="Ayuda"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-bold text-brand hover:bg-blue-50"
            >
              <CircleHelp className="h-5 w-5" />
              <span className="hidden sm:inline">Ayuda</span>
            </Link>
            <Link
              to="/dashboard"
              aria-label="Salir de la práctica"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-bold text-slate-600 hover:bg-slate-100 hover:text-ink"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Salir</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-brand">
              Pregunta {currentIndex + 1} de {questions.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {quickPractice
                ? strategy === 'weak'
                  ? 'Primero verás lo que más necesitas reforzar.'
                  : 'Sin tiempo. Preguntas de toda la categoría.'
                : `${OFFICIAL_EXAM_RULES.questionCount} preguntas · ${OFFICIAL_EXAM_RULES.durationMinutes} minutos · tu resultado mide tu preparación.`}
            </p>
          </div>
          {!quickPractice ? (
            <div className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-50 px-4 text-lg font-black text-brand" aria-label={`Tiempo restante ${formatTime(timeRemaining)}`}>
              <Clock3 className="h-5 w-5" />
              {formatTime(timeRemaining)}
            </div>
          ) : null}
        </div>

        {quickPractice ? (
          <div className="mt-3 flex gap-2" aria-label={`Pregunta ${currentIndex + 1} de ${questions.length}`}>
            {questions.map((question, index) => (
              <span
                key={question.id}
                className={cn(
                  'h-2.5 flex-1 rounded-full',
                  index < currentIndex && 'bg-success',
                  index === currentIndex && 'bg-brand',
                  index > currentIndex && 'bg-slate-200',
                )}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand transition-[width]"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        )}

        <section className="mt-4" aria-labelledby="question-title">
          {currentQuestion.imagenBase64 ? (
            <QuestionImage
              src={currentQuestion.imagenBase64}
              mediaType={currentQuestion.multimedia?.[0]?.tipoMultimedia || currentQuestion.multimedia?.[0]?.tipo_multimedia}
              className="mb-4 min-h-[170px] border border-line bg-slate-50 sm:min-h-[220px]"
              imgClassName="max-h-[190px] sm:max-h-[250px]"
            />
          ) : null}

          <div className="flex items-start gap-3">
            <h1 id="question-title" className="min-w-0 flex-1 whitespace-pre-wrap break-words font-display text-xl font-black leading-tight text-ink sm:text-2xl lg:text-[28px]">
              {currentQuestion.texto}
            </h1>
            <button
              type="button"
              onClick={toggleSpeech}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-3 font-bold text-brand hover:border-brand hover:bg-blue-50"
              aria-label={
                speechState === 'speaking'
                  ? 'Pausar audio'
                  : speechState === 'paused'
                    ? 'Continuar audio'
                    : 'Escuchar pregunta y respuestas'
              }
            >
              {speechState === 'speaking'
                ? <Pause className="h-5 w-5" />
                : speechState === 'paused'
                  ? <Play className="h-5 w-5" />
                  : <Volume2 className="h-5 w-5" />}
              <span className="hidden sm:inline">
                {speechState === 'speaking' ? 'Pausar' : speechState === 'paused' ? 'Continuar' : 'Escuchar'}
              </span>
            </button>
          </div>

          <div className="mt-4 grid gap-2.5">
            {currentQuestion.opciones.map((option, index) => {
              const selected = hasAnswer(selectedAnswerId) && String(selectedAnswerId) === String(option.id);
              const optionIsCorrect = option.esCorrecta || option.isCorrect;
              const showCorrect = isRevealed && optionIsCorrect;
              const showIncorrect = isRevealed && selected && !optionIsCorrect;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  data-testid="answer-option"
                  disabled={isRevealed}
                  onClick={() => chooseAnswer(option.id)}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-3 rounded-lg border-2 border-line bg-white px-3 py-2.5 text-left text-base leading-6 text-ink transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-default sm:min-h-16 sm:px-4 sm:text-lg',
                    selected && !isRevealed && 'border-brand bg-blue-50 ring-2 ring-blue-100',
                    showCorrect && 'border-success bg-emerald-50',
                    showIncorrect && 'border-danger bg-red-50',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 font-black text-slate-600 sm:h-10 sm:w-10',
                      selected && !isRevealed && 'bg-brand text-white',
                      showCorrect && 'bg-success text-white',
                      showIncorrect && 'bg-danger text-white',
                    )}
                  >
                    {showCorrect ? <Check className="h-5 w-5" /> : showIncorrect ? <X className="h-5 w-5" /> : String.fromCharCode(65 + index)}
                  </span>
                  <OptionContent option={option} />
                </button>
              );
            })}
          </div>

          {isRevealed ? (
            <div
              className={cn(
                'mt-3 border-l-4 px-4 py-3 text-base leading-6',
                answeredCorrectly
                  ? 'border-success bg-emerald-50 text-emerald-950'
                  : 'border-danger bg-red-50 text-red-950',
              )}
              aria-live="polite"
            >
              <p className="flex items-center gap-2 font-display text-lg font-black">
                {answeredCorrectly ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-danger" />}
                {answeredCorrectly ? '¡Muy bien!' : 'Mira la respuesta correcta'}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words">
                <strong>Respuesta correcta:</strong> {correctOption?.texto || currentQuestion.respuestaCorrecta}
              </p>
              {explanation ? (
                <div className="mt-3 border-t border-current/15 pt-3">
                  <p className="font-bold">Explicación</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{explanation}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {saveError || finishError ? (
          <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 font-bold text-amber-950" role="alert">
            {finishError || saveError}
          </p>
        ) : null}

      </main>

      <footer
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 shadow-[0_-8px_24px_rgba(16,35,63,0.08)] backdrop-blur"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 pt-3 sm:px-6">
          {currentIndex > 0 ? (
            <button
              type="button"
              onClick={() => goToQuestion(currentIndex - 1)}
              title="Pregunta anterior"
              className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-lg px-3 font-bold text-slate-600 hover:bg-slate-100 hover:text-ink sm:px-4"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
          ) : null}
          <Button
            size="lg"
            onClick={handlePrimaryAction}
            disabled={!canContinue || finishing}
            className="ml-auto w-full sm:w-auto sm:min-w-72"
          >
            {finishing
              ? 'Guardando resultado...'
              : quickPractice && !isRevealed
                ? 'Responder'
                : isLastQuestion
                  ? 'Ver mi resultado'
                  : 'Siguiente pregunta'}
            <ArrowRight className="h-6 w-6" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
