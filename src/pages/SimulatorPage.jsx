import { ArrowLeft, ArrowRight, Bell, Check, ChevronDown, CircleGauge, Clock, Flag, HelpCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BrandLogo from '../components/layout/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { OptionContent, QuestionImage } from '../components/ui/QuestionMedia.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useExam } from '../hooks/useExam.js';
import { normalizeCategoryName } from '../services/api.js';
import { cn } from '../utils/cn.js';
import { formatTime } from '../utils/formatTime.js';

function UserChip({ user }) {
  return (
    <Link to="/perfil" className="hidden items-center gap-3 xl:flex">
      <span className="relative grid h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-sky-200 via-amber-100 to-blue-400 ring-4 ring-blue-50">
        <span className="absolute left-1/2 top-2 h-4 w-4 -translate-x-1/2 rounded-full bg-amber-700" />
        <span className="absolute left-1/2 top-5 h-5 w-7 -translate-x-1/2 rounded-t-full bg-white" />
        <span className="absolute bottom-0 left-1/2 h-5 w-10 -translate-x-1/2 rounded-t-full bg-brand-dark" />
      </span>
      <span>
        <span className="block text-sm font-bold text-ink">{user?.name ?? 'Carlos Mendoza'}</span>
        <span className="block text-xs text-slate-500">Estudiante</span>
      </span>
      <ChevronDown className="h-4 w-4 text-ink" />
    </Link>
  );
}

function buildFallbackExplanation(question, correctOption) {
  const correctText = correctOption?.texto || question?.respuestaCorrecta || 'la alternativa marcada como correcta';
  return `Respuesta correcta: ${correctText}. Esta alternativa es la que se ajusta a la regla evaluada y descarta opciones incompletas, inseguras o contrarias a la norma.`;
}

export default function SimulatorPage() {
  const { categoria = 'A1' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const finishedRef = useRef(false);
  const {
    questions,
    currentQuestion,
    currentIndex,
    answers,
    timeRemaining,
    progress,
    selectAnswer,
    goToQuestion,
    finishExam,
    loading,
    error,
  } = useExam(categoria.toUpperCase());
  const [finishing, setFinishing] = useState(false);
  const [pendingAnswers, setPendingAnswers] = useState({});

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const pendingAnswer = currentQuestion ? pendingAnswers[currentQuestion.id] : null;
  const isAnswered = currentAnswer !== null && currentAnswer !== undefined;
  const correctOption = currentQuestion?.opciones.find((option) => option.esCorrecta || option.isCorrect);
  const selectedOption = currentQuestion?.opciones.find((option) => String(option.id) === String(currentAnswer));
  const answeredCorrectly = Boolean(isAnswered && selectedOption && (selectedOption.esCorrecta || selectedOption.isCorrect));
  const explanationText = currentQuestion?.explicacion || currentQuestion?.fundamento || buildFallbackExplanation(currentQuestion, correctOption);
  const displayAnswered = progress.answered;
  const answerStats = questions.reduce((stats, question) => {
    const answerId = answers[question.id];
    if (answerId === null || answerId === undefined) return stats;
    const answerOption = question.opciones.find((option) => String(option.id) === String(answerId));
    if (answerOption?.esCorrecta || answerOption?.isCorrect) {
      stats.correct += 1;
    } else {
      stats.incorrect += 1;
    }
    return stats;
  }, { correct: 0, incorrect: 0 });
  const displayCorrect = answerStats.correct;
  const displayIncorrect = answerStats.incorrect;
  const displayPercent = progress.percent;
  const questionImage = currentQuestion?.imagenBase64;
  const examLabel = normalizeCategoryName(categoria);

  useEffect(() => {
    setPendingAnswers({});
  }, [categoria]);

  const handleSelectPendingAnswer = (questionId, optionId) => {
    setPendingAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: optionId }));
  };

  const handleEvaluateAnswer = () => {
    if (!currentQuestion || isAnswered || pendingAnswer === null || pendingAnswer === undefined) {
      return;
    }

    selectAnswer(currentQuestion.id, pendingAnswer);
    setPendingAnswers((currentAnswers) => {
      const nextAnswers = { ...currentAnswers };
      delete nextAnswers[currentQuestion.id];
      return nextAnswers;
    });
  };

  const handleFinish = async () => {
    if (finishedRef.current || finishing || loading || !questions.length) {
      return;
    }
    finishedRef.current = true;
    setFinishing(true);
    const result = await finishExam().catch(() => null);
    setFinishing(false);
    if (!result?.id) {
      finishedRef.current = false;
      return;
    }
    navigate(`/resultados/${result.id}`);
  };

  useEffect(() => {
    if (timeRemaining === 0 && questions.length) {
      handleFinish();
    }
  }, [timeRemaining, questions.length]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-white text-lg font-bold text-slate-600">Preparando simulacro real...</div>;
  }

  if (error || !currentQuestion) {
    return (
      <div className="grid min-h-screen place-items-center bg-white p-6 text-center">
        <Card className="max-w-xl p-8">
          <h1 className="text-2xl font-black">No pudimos iniciar el simulacro</h1>
          <p className="mt-3 text-slate-600">{error || 'No llegaron preguntas para esta categoría.'}</p>
          <Button as={Link} to="/dashboard" className="mt-6"><ArrowLeft className="h-4 w-4" /> Volver al dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-soft text-ink">
      <header className="relative z-40 shrink-0 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex h-12 items-center gap-2 px-2.5 lg:h-14 lg:px-4">
          <div className="-ml-4 hidden h-14 w-60 shrink-0 items-center bg-brand-deep px-5 text-white xl:w-64 lg:flex">
            <BrandLogo className="text-white" />
          </div>

          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-black shadow-sm sm:flex-none sm:min-w-52 lg:min-w-60">
            <CircleGauge className="h-4 w-4 shrink-0 text-brand-dark" />
            <span className="truncate">Simulacro {examLabel}</span>
            <ChevronDown className="ml-auto h-4 w-4 shrink-0" />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
            <div className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 text-sm font-black text-brand sm:hidden">
              <Clock className="h-4 w-4" />
              {formatTime(timeRemaining)}
            </div>
            <button type="button" className="relative hidden rounded-lg border border-line bg-white p-2 shadow-sm sm:inline-flex" aria-label="Notificaciones">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-danger text-xs font-bold text-white">2</span>
            </button>
            <UserChip user={user} />
            <Button variant="danger" size="sm" onClick={handleFinish} className="min-w-0 px-3 sm:h-10 sm:min-w-44" disabled={finishing}><Flag className="h-4 w-4" /> <span className="hidden sm:inline">{finishing ? 'Finalizando...' : 'Finalizar simulacro'}</span><span className="sm:hidden">Fin</span></Button>
          </div>
        </div>
      </header>

      <main className="grid h-[calc(100dvh-3rem-1px)] min-h-0 gap-2 p-2 lg:h-[calc(100dvh-3.5rem-1px)] lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-3 lg:p-3 xl:grid-cols-[minmax(0,1fr)_350px]">
        <Card className="flex min-h-0 flex-col overflow-hidden rounded-lg shadow-sm">
          <div className="shrink-0 border-b border-line p-2.5 sm:p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h1 className="text-lg font-black sm:text-xl">Pregunta {currentIndex + 1} <span className="font-medium text-slate-500">de {questions.length}</span></h1>
              <div className="hidden items-center gap-2 text-brand sm:flex">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium text-slate-500">Tiempo</span>
                <span className="text-xl font-black">{formatTime(timeRemaining)}</span>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0}%` }} />
            </div>
          </div>

          <div className={cn('grid max-h-[34dvh] shrink-0 gap-3 overflow-y-auto border-b border-line p-2.5 sm:p-3', questionImage && 'xl:grid-cols-[320px_1fr] xl:items-center xl:gap-4')}>
            {questionImage ? (
              <QuestionImage
                src={questionImage}
                mediaType={currentQuestion.multimedia?.[0]?.tipoMultimedia || currentQuestion.multimedia?.[0]?.tipo_multimedia}
                className="h-[150px] bg-blue-50 sm:h-[170px]"
                imgClassName="max-h-[130px] sm:max-h-[150px]"
              />
            ) : null}
            <div>
              <h2 className="text-lg font-black leading-tight sm:text-xl lg:text-2xl">{currentQuestion.texto}</h2>
              <span className="mt-2 inline-flex max-w-full rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-brand sm:text-xs"><span className="clamp-2">{currentQuestion.tema}</span></span>
            </div>
          </div>

          <div className={cn('grid min-h-0 flex-1 gap-2 overflow-y-auto px-2.5 py-2.5 sm:px-3', !isAnswered && 'auto-rows-fr')}>
            {currentQuestion.opciones.map((option, optionIndex) => {
              const selectedAnswerId = isAnswered ? currentAnswer : pendingAnswer;
              const selected = selectedAnswerId !== null && selectedAnswerId !== undefined && String(selectedAnswerId) === String(option.id);
              const optionIsCorrect = option.esCorrecta || option.isCorrect;
              const showCorrect = isAnswered && optionIsCorrect;
              const showIncorrect = isAnswered && selected && !optionIsCorrect;
              return (
                <button
                  key={option.id}
                  className={cn(
                    'flex min-h-[48px] items-start gap-2.5 rounded-lg border border-line bg-white px-2.5 py-2.5 text-left text-sm text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-default sm:min-h-[54px] sm:gap-3 sm:px-3 sm:text-[15px]',
                    !isAnswered && selected && 'border-brand bg-blue-50 ring-2 ring-blue-100',
                    showCorrect && 'border-success bg-emerald-50 ring-2 ring-emerald-100',
                    showIncorrect && 'border-danger bg-red-50 ring-2 ring-red-100',
                  )}
                  disabled={isAnswered}
                  onClick={() => handleSelectPendingAnswer(currentQuestion.id, option.id)}
                >
                  <span className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-black text-brand sm:h-9 sm:w-9',
                    !isAnswered && selected && 'bg-brand text-white',
                    showCorrect && 'bg-success text-white',
                    showIncorrect && 'bg-danger text-white',
                  )}>{String.fromCharCode(65 + optionIndex)}</span>
                  <OptionContent option={option} />
                </button>
              );
            })}

            {isAnswered ? (
              <div
                className={cn(
                  'max-h-28 overflow-y-auto rounded-lg border p-2.5 text-xs leading-snug sm:text-sm',
                  answeredCorrectly ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900',
                )}
                aria-live="polite"
              >
                <div className="mb-1 flex items-center gap-2 font-black">
                  {answeredCorrectly ? <Check className="h-4 w-4 text-success" /> : <HelpCircle className="h-4 w-4 text-danger" />}
                  {answeredCorrectly ? 'Correcto' : 'Revisa esto'}
                </div>
                <p>{explanationText}</p>
              </div>
            ) : null}
          </div>

          <div className="z-20 grid shrink-0 grid-cols-3 gap-2 border-t border-line bg-white/95 p-2.5 backdrop-blur sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
            <Button size="sm" variant="secondary" onClick={() => goToQuestion(currentIndex - 1)} disabled={currentIndex === 0} className="w-full px-2 sm:min-w-36 sm:w-auto"><ArrowLeft className="h-4 w-4" /> <span className="hidden min-[420px]:inline">Anterior</span><span className="min-[420px]:hidden">Atrás</span></Button>
            <Button size="sm" variant={isAnswered ? (answeredCorrectly ? 'success' : 'danger') : 'warning'} onClick={handleEvaluateAnswer} className="w-full px-2 sm:min-w-44 sm:w-auto" disabled={isAnswered || pendingAnswer === null || pendingAnswer === undefined}><Check className="h-4 w-4" /> {isAnswered ? 'Evaluada' : pendingAnswer === null || pendingAnswer === undefined ? 'Elige opción' : 'Marcar'}</Button>
            <Button size="sm" onClick={() => currentIndex === questions.length - 1 ? handleFinish() : goToQuestion(currentIndex + 1)} className="w-full px-2 sm:min-w-44 sm:w-auto" disabled={finishing}>
              <span className="hidden min-[420px]:inline">{currentIndex === questions.length - 1 ? finishing ? 'Finalizando...' : 'Finalizar' : 'Siguiente'}</span>
              <span className="min-[420px]:hidden">{currentIndex === questions.length - 1 ? finishing ? '...' : 'Fin' : 'Sig.'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <aside className="hidden min-h-0 gap-2 self-stretch lg:grid lg:grid-rows-[auto_minmax(0,1fr)]">
          <Card className="rounded-lg p-2.5 shadow-sm sm:p-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black sm:text-lg">Progreso</h2>
              <span className="text-2xl font-black text-brand">{displayPercent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${displayPercent}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold sm:text-sm">
              <div className="rounded-lg bg-emerald-50 px-2 py-2 text-success">
                <span className="block text-lg font-black">{displayCorrect}</span>
                Correctas
              </div>
              <div className="rounded-lg bg-red-50 px-2 py-2 text-danger">
                <span className="block text-lg font-black">{displayIncorrect}</span>
                Errores
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-2 text-slate-600">
                <span className="block text-lg font-black">{questions.length - displayAnswered}</span>
                Pendientes
              </div>
            </div>
          </Card>

          <Card className="min-h-0 overflow-hidden rounded-lg p-2.5 shadow-sm sm:p-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black sm:text-lg">Preguntas</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-brand">{currentIndex + 1}/{questions.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1"><span className="h-3.5 w-3.5 rounded-full border border-emerald-200 bg-emerald-100" /> Correcta</span>
              <span className="inline-flex items-center gap-1"><span className="h-3.5 w-3.5 rounded-full border border-red-200 bg-red-100" /> Incorrecta</span>
              <span className="inline-flex items-center gap-1"><span className="h-3.5 w-3.5 rounded-full border border-line bg-white" /> Sin responder</span>
              <span className="inline-flex items-center gap-1"><span className="h-3.5 w-3.5 rounded-full border-2 border-warning" /> Seleccionada</span>
              <span className="inline-flex items-center gap-1"><span className="h-3.5 w-3.5 rounded-full border border-brand ring-2 ring-brand/30" /> Actual</span>
            </div>
            <div className="mt-2 grid max-h-[calc(100dvh-18rem)] grid-cols-8 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-10 lg:grid-cols-8 xl:grid-cols-10">
              {questions.map((question, index) => {
                const answerId = answers[question.id];
                const answered = answerId !== null && answerId !== undefined;
                const answerOption = answered ? question.opciones.find((option) => String(option.id) === String(answerId)) : null;
                const questionCorrect = Boolean(answerOption?.esCorrecta || answerOption?.isCorrect);
                const selectedPending = !answered && pendingAnswers[question.id] !== null && pendingAnswers[question.id] !== undefined;
                const active = index === currentIndex;
                return (
                  <button
                    key={question.id}
                    onClick={() => goToQuestion(index)}
                    className={cn(
                      'grid aspect-square w-full min-w-0 place-items-center rounded-full border text-xs font-bold transition sm:text-sm',
                      answered && questionCorrect && 'border-emerald-200 bg-emerald-100 text-success',
                      answered && !questionCorrect && 'border-red-200 bg-red-100 text-danger',
                      selectedPending && 'border-orange-300 bg-orange-50 text-warning',
                      !answered && !selectedPending && 'border-line bg-white text-slate-500',
                      active && 'ring-2 ring-brand ring-offset-1 ring-offset-white',
                      active && !answered && !selectedPending && 'border-brand bg-blue-50 text-brand',
                    )}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </Card>

        </aside>
      </main>
    </div>
  );
}
