import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  LayoutGrid,
  LockKeyhole,
  LogOut,
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
  const requestedMode = searchParams.get('mode');
  const mode = requestedMode === 'exam' ? 'exam' : requestedMode === 'adaptive' ? 'adaptive' : 'quick';
  const strategy = mode === 'adaptive' ? 'adaptive' : searchParams.get('strategy') === 'weak' ? 'weak' : 'random';
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
    feedbackByQuestion,
    savingAnswer,
    quickPractice,
    adaptivePractice,
    timedSession,
    progress,
    selectAnswer,
    goToQuestion,
    finishExam,
  } = useExam(categoria.toUpperCase(), mode, strategy);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState('');
  const [pendingAnswers, setPendingAnswers] = useState({});
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const navigatorRef = useRef(null);
  const feedbackRef = useRef(null);
  const feedbackQuestionRef = useRef(null);

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const pendingAnswer = currentQuestion ? pendingAnswers[currentQuestion.id] : null;
  const currentFeedback = currentQuestion ? feedbackByQuestion[currentQuestion.id] : null;
  const isAnswered = hasAnswer(currentAnswer);
  const isRevealed = isAnswered && Boolean(currentFeedback);
  const selectedAnswerId = isRevealed ? currentAnswer : (hasAnswer(pendingAnswer) ? pendingAnswer : currentAnswer);
  const selectedOption = currentQuestion?.opciones.find((option) => String(option.id) === String(currentAnswer));
  const correctOption = currentQuestion?.opciones.find((option) => (
    String(option.id) === String(currentFeedback?.opcionCorrecta?.id)
    || option.esCorrecta
    || option.isCorrect
  ));
  const feedbackCorrectness = currentFeedback?.esCorrecta ?? currentFeedback?.es_correcta;
  const answeredCorrectly = Boolean(
    isRevealed
    && (feedbackCorrectness ?? selectedOption?.esCorrecta ?? selectedOption?.isCorrect),
  );
  const explanation = currentFeedback?.explicacion || currentQuestion?.explicacion || currentQuestion?.fundamento || '';
  const selectedOptionIndex = currentQuestion?.opciones.indexOf(selectedOption) ?? -1;
  const correctOptionIndex = currentQuestion?.opciones.indexOf(correctOption) ?? -1;
  const selectedAnswerLabel = selectedOption
    ? `${String.fromCharCode(65 + selectedOptionIndex)}. ${selectedOption.texto || 'Respuesta con imagen'}`
    : currentFeedback?.opcionSeleccionada?.texto || 'Sin respuesta';
  const correctAnswerLabel = correctOption
    ? `${String.fromCharCode(65 + correctOptionIndex)}. ${correctOption.texto || 'Respuesta con imagen'}`
    : currentFeedback?.opcionCorrecta?.texto || currentQuestion?.respuestaCorrecta || 'No disponible';
  const isLastQuestion = currentIndex === questions.length - 1;
  const canContinue = isRevealed || hasAnswer(pendingAnswer);
  const primaryActionDisabled = !canContinue || finishing || savingAnswer;
  const examLabel = normalizeCategoryName(categoria);
  const practiceLabel = adaptivePractice
    ? 'Entrenamiento inteligente'
    : strategy === 'weak'
      ? 'Refuerzo de errores'
      : 'Preguntas aleatorias';

  useEffect(() => {
    finishedRef.current = false;
    feedbackQuestionRef.current = null;
    setFinishError('');
    setPendingAnswers({});
    setNavigatorOpen(false);
  }, [categoria, mode, strategy]);

  useEffect(() => {
    if (!navigatorOpen) return undefined;

    const closeNavigator = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && navigatorRef.current?.contains(event.target)) return;
      setNavigatorOpen(false);
    };

    document.addEventListener('pointerdown', closeNavigator);
    document.addEventListener('keydown', closeNavigator);
    return () => {
      document.removeEventListener('pointerdown', closeNavigator);
      document.removeEventListener('keydown', closeNavigator);
    };
  }, [navigatorOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [currentIndex]);

  useEffect(() => {
    if (
      !isRevealed
      || feedbackQuestionRef.current !== currentQuestion?.id
      || !feedbackRef.current
      || !window.matchMedia('(max-width: 639px)').matches
    ) return undefined;

    feedbackQuestionRef.current = null;
    const frameId = window.requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentQuestion?.id, isRevealed]);

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
    if (timedSession && timeRemaining === 0 && questions.length) {
      void handleFinish();
    }
  }, [handleFinish, questions.length, timeRemaining, timedSession]);

  const chooseAnswer = (optionId) => {
    if (savingAnswer || !currentQuestion || isRevealed) return;
    setPendingAnswers((current) => ({ ...current, [currentQuestion.id]: optionId }));
  };

  const revealAnswer = async () => {
    if (!currentQuestion || !hasAnswer(pendingAnswer)) return;
    feedbackQuestionRef.current = currentQuestion.id;
    const feedback = await selectAnswer(currentQuestion.id, pendingAnswer);
    if (!feedback) return;
    setPendingAnswers((current) => {
      const next = { ...current };
      delete next[currentQuestion.id];
      return next;
    });
  };

  const handlePrimaryAction = () => {
    if (!isRevealed) {
      void revealAnswer();
      return;
    }
    if (isLastQuestion) {
      void handleFinish();
      return;
    }
    goToQuestion(currentIndex + 1);
  };

  useEffect(() => {
    const handleEnter = (event) => {
      if (
        event.key !== 'Enter'
        || event.repeat
        || event.isComposing
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || event.shiftKey
        || primaryActionDisabled
      ) return;

      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"], a[href]')) return;

      event.preventDefault();
      handlePrimaryAction();
    };

    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
  }, [handlePrimaryAction, primaryActionDisabled]);

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
            {membershipRequired ? 'Necesitas una suscripcion activa' : 'No pudimos iniciar la práctica'}
          </h1>
          <p className="mt-3 text-lg leading-7 text-slate-600">
            {membershipRequired
              ? 'Tu suscripcion mensual no esta activa. Suscribete para volver a rendir simulacros completos.'
              : error || 'No encontramos preguntas para esta licencia.'}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {membershipRequired ? (
              <Button as={Link} to={`/checkout?category=${categoria}`}>
                Ver suscripcion
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
          <BrandLogo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
          <span className="hidden h-7 w-px bg-line sm:block" />
          <span className="hidden text-sm font-bold text-slate-600 sm:block">
            {quickPractice ? practiceLabel : 'Simulacro completo'} · {examLabel}
          </span>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Acciones de la práctica">
            <Link
              to="/clases"
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

      <main className="mx-auto w-full max-w-6xl px-4 pb-40 pt-4 sm:px-6 sm:pb-32 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-brand">
              Pregunta {currentIndex + 1} de {questions.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {adaptivePractice
                ? `${OFFICIAL_EXAM_RULES.questionCount} preguntas · ${OFFICIAL_EXAM_RULES.durationMinutes} minutos · puedes revisar y corregir antes de entregar.`
                : quickPractice
                  ? strategy === 'weak'
                  ? 'Primero verás lo que más necesitas reforzar.'
                  : 'Sin tiempo. Preguntas de toda la categoría.'
                : `${OFFICIAL_EXAM_RULES.questionCount} preguntas · ${OFFICIAL_EXAM_RULES.durationMinutes} minutos · tu resultado mide tu preparación.`}
            </p>
          </div>
          {timedSession ? (
            <div className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-50 px-4 text-lg font-black text-brand" aria-label={`Tiempo restante ${formatTime(timeRemaining)}`}>
              <Clock3 className="h-5 w-5" />
              {formatTime(timeRemaining)}
            </div>
          ) : null}
        </div>

        {quickPractice && !adaptivePractice ? (
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
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        )}

        {timedSession ? (
          <div ref={navigatorRef} className="relative mt-2 flex min-h-9 items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-500">{progress.answered} respondidas</p>
            <button
              type="button"
              onClick={() => setNavigatorOpen((open) => !open)}
              aria-expanded={navigatorOpen}
              aria-controls="question-navigator"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-black text-slate-600 hover:bg-slate-100 hover:text-brand focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Preguntas</span>
              <span>{currentIndex + 1}/{questions.length}</span>
            </button>

            {navigatorOpen ? (
              <div
                id="question-navigator"
                className="absolute right-0 top-full z-30 mt-1.5 w-full max-w-[360px] rounded-lg border border-line bg-white p-3 shadow-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-ink">Ir a una pregunta</p>
                  <p className="text-xs font-bold text-slate-500">{progress.answered}/{questions.length}</p>
                </div>
                <div className="mt-2 grid grid-cols-8 gap-1" aria-label="Preguntas del 1 al 40">
                  {questions.map((question, index) => {
                    const answered = hasAnswer(answers[question.id]);
                    const current = index === currentIndex;
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => {
                          goToQuestion(index);
                          setNavigatorOpen(false);
                        }}
                        aria-label={`Ir a la pregunta ${index + 1}${answered ? ', respondida' : ', pendiente'}`}
                        aria-current={current ? 'step' : undefined}
                        className={cn(
                          'grid h-8 min-w-0 place-items-center rounded-md border text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
                          current && 'border-brand bg-brand text-white',
                          !current && answered && 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
                          !current && !answered && 'border-transparent bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-brand',
                        )}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-3 text-[11px] font-bold text-slate-500" aria-hidden="true">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand" /> Actual</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-100" /> Respondida</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-100" /> Pendiente</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <section className="mt-4" aria-labelledby="question-title">
          {currentQuestion.imagenBase64 ? (
            <QuestionImage
              src={currentQuestion.imagenBase64}
              mediaType={currentQuestion.multimedia?.[0]?.tipoMultimedia || currentQuestion.multimedia?.[0]?.tipo_multimedia}
              className="mb-4 min-h-[170px] border border-line bg-slate-50 sm:min-h-[220px]"
              imgClassName="max-h-[190px] sm:max-h-[250px]"
            />
          ) : null}

          <h1 id="question-title" className="whitespace-pre-wrap break-words font-display text-xl font-black leading-tight text-ink sm:text-2xl lg:text-[28px]">
            {currentQuestion.texto}
          </h1>

          <div className="mt-4 grid gap-2.5">
            {currentQuestion.opciones.map((option, index) => {
              const selected = hasAnswer(selectedAnswerId) && String(selectedAnswerId) === String(option.id);
              const optionIsCorrect = (
                String(option.id) === String(currentFeedback?.opcionCorrecta?.id)
                || option.esCorrecta
                || option.isCorrect
              );
              const showCorrect = isRevealed && optionIsCorrect;
              const showIncorrect = isRevealed && selected && !optionIsCorrect;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  data-testid="answer-option"
                  disabled={isRevealed || savingAnswer}
                  onClick={() => chooseAnswer(option.id)}
                  className={cn(
                    'flex min-h-14 w-full items-start gap-3 rounded-lg border-2 border-line bg-white px-3 py-3 text-left text-base leading-6 text-ink transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-default sm:min-h-16 sm:items-center sm:px-4 sm:text-lg',
                    selected && !isRevealed && 'border-brand bg-blue-50 ring-2 ring-blue-100',
                    showCorrect && 'border-success bg-emerald-50',
                    showIncorrect && 'border-danger bg-red-50',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 font-black text-slate-600 sm:mt-0 sm:h-10 sm:w-10',
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
              ref={feedbackRef}
              data-testid="answer-feedback"
              className={cn(
                'mt-3 scroll-mt-20 border-l-4 px-4 py-4 text-base leading-6',
                answeredCorrectly
                  ? 'border-success bg-emerald-50 text-emerald-950'
                  : 'border-danger bg-red-50 text-red-950',
              )}
              aria-live="polite"
            >
              <p className="flex items-center gap-2 font-display text-lg font-black">
                {answeredCorrectly ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-danger" />}
                {answeredCorrectly ? 'Respuesta correcta' : 'Respuesta incorrecta'}
              </p>
              <div className="mt-3 grid gap-2">
                <p className="whitespace-pre-wrap break-words">
                  <strong>Marcaste:</strong> {selectedAnswerLabel}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  <strong>Respuesta correcta:</strong> {correctAnswerLabel}
                </p>
              </div>
              {explanation ? (
                <div className="mt-3 border-t border-current/15 pt-3">
                  <p className="font-bold">Explicación</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{explanation}</p>
                </div>
              ) : null}
              {!quickPractice ? (
                <p className="mt-3 flex items-center gap-2 border-t border-current/15 pt-3 text-sm font-bold">
                  <Clock3 className="h-4 w-4 shrink-0" />
                  El cronómetro sigue avanzando.
                </p>
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
            disabled={primaryActionDisabled}
            data-primary-action="true"
            className="ml-auto w-full sm:w-auto sm:min-w-72"
          >
            {finishing
              ? 'Guardando resultado...'
              : savingAnswer
                ? 'Revisando respuesta...'
                : !isRevealed
                ? 'Confirmar respuesta'
                : isLastQuestion
                  ? 'Ver mi resultado'
                  : 'Siguiente pregunta'}
            {!isRevealed && !finishing
              ? <Check className="h-6 w-6" />
              : <ArrowRight className="h-6 w-6" />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
