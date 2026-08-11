import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleGauge,
  Clock3,
  LockKeyhole,
  Pause,
  Play,
  Shuffle,
  Target,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import yellowRoute from '../../assets/decorative/yellow-route.webp';
import { OFFICIAL_EXAM_RULES } from '../../data/examRules.js';
import { fallbackLicenseCategories, getCategoryById, getVehicleChoice, vehicleChoices } from '../../data/vehicleChoices.js';
import { cn } from '../../utils/cn.js';
import Modal from '../ui/Modal.jsx';

function CategoryButton({ category, selected, onClick, showDescription = false }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-16 w-full min-w-0 items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand',
        selected
          ? 'border-brand bg-blue-50 text-brand'
          : 'border-line bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50',
      )}
    >
      {selected ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : null}
      <span className="min-w-0">
        <strong className="block font-display text-lg font-black leading-5">{category.title} · {category.shortLabel}</strong>
        {showDescription ? <span className="mt-1 block text-sm font-medium leading-5 text-slate-600">{category.description}</span> : null}
      </span>
    </button>
  );
}

export default function VehicleStartPanel({
  categories = fallbackLicenseCategories,
  selectedCategoryId = null,
  progress,
  onCategoryChange,
  onStart,
  startTo,
  fullExamTo,
  fullExamHasAccess = false,
  fullExamAccessLoading = false,
  fullExamPrice = 1200,
  membershipEndDate = null,
}) {
  const [practiceMode, setPracticeMode] = useState('random');
  const [categoryVehicleId, setCategoryVehicleId] = useState(null);
  const [speechState, setSpeechState] = useState('idle');
  const speechRef = useRef(null);
  const selectedCategory = selectedCategoryId ? getCategoryById(categories, selectedCategoryId) : null;
  const selectedVehicle = selectedCategory ? getVehicleChoice(selectedCategoryId) : null;
  const categoryVehicle = vehicleChoices.find((choice) => choice.id === categoryVehicleId) ?? null;
  const weakTopic = progress?.weakTopics?.[0];
  const priceLabel = `S/${Math.round(Number(fullExamPrice || 1200) / 100)}`;

  useEffect(() => {
    speechRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeechState('idle');

    return () => {
      speechRef.current = null;
      window.speechSynthesis?.cancel();
    };
  }, [selectedCategory?.id]);

  const readPrompt = () => {
    if (!('speechSynthesis' in window)) return;

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
    const message = new SpeechSynthesisUtterance(
      selectedCategory
        ? `¿Qué examen vas a rendir? Elegiste ${selectedCategory.vehicle}, licencia ${selectedCategory.title}.`
        : '¿Qué examen vas a rendir? Elige un vehículo y después la categoría que aparece en tu licencia.',
    );
    message.lang = 'es-PE';
    message.rate = 0.9;
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

  const chooseVehicle = (choice) => {
    setCategoryVehicleId(choice.id);
  };

  const chooseCategory = (categoryId) => {
    onCategoryChange?.(categoryId);
    setCategoryVehicleId(null);
  };

  const startHref = selectedCategory && startTo
    ? `${startTo}${startTo.includes('?') ? '&' : '?'}strategy=${practiceMode}`
    : null;
  const startButtonClass = 'relative z-10 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-lg bg-traffic-yellow px-4 text-center font-display text-xl font-black text-ink shadow-[0_7px_0_#d99b19] transition hover:-translate-y-0.5 hover:bg-[#ffc94f] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand active:translate-y-1 active:shadow-[0_3px_0_#d99b19] sm:gap-4 sm:px-6 sm:text-2xl';

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pb-14 lg:pt-5">
      <div className="mx-auto max-w-5xl text-center">
        <div className="flex items-center justify-center gap-3 sm:flex-nowrap">
          <h1 className="font-display text-3xl font-black text-ink sm:whitespace-nowrap sm:text-4xl lg:text-5xl">¿Qué examen vas a rendir?</h1>
          <button
            type="button"
            aria-label={
              speechState === 'speaking'
                ? 'Pausar instrucciones'
                : speechState === 'paused'
                  ? 'Continuar instrucciones'
                  : 'Escuchar las instrucciones'
            }
            onClick={readPrompt}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-3 font-bold text-brand transition hover:border-brand hover:bg-blue-50"
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
        <p className="mx-auto mt-2 max-w-2xl text-base leading-6 text-slate-600 sm:text-lg sm:leading-7">
          Elige tu vehículo y después la categoría exacta de tu licencia.
        </p>
      </div>

      <div className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-3 lg:gap-5">
        {vehicleChoices.map((choice) => {
          const selected = choice.id === selectedVehicle?.id;
          return (
            <button
              key={choice.id}
              type="button"
              aria-pressed={selected}
              aria-haspopup="dialog"
              aria-expanded={categoryVehicleId === choice.id}
              onClick={() => chooseVehicle(choice)}
              className={cn(
                'relative flex min-h-[300px] min-w-0 flex-col rounded-lg border-2 bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand sm:min-h-[330px] lg:min-h-[350px] lg:p-5',
                selected ? 'border-brand bg-blue-50/40 shadow-[0_8px_0_#cfe0ff]' : 'border-line',
              )}
            >
              {selected ? (
                <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-brand text-white">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
              ) : null}
              <span className="flex h-[205px] w-full items-center justify-center sm:h-[220px] lg:h-[235px]">
                <img src={choice.image} alt={choice.imageAlt} width="900" height="600" className="h-full w-full object-contain" />
              </span>
              <span className="mt-1 block font-display text-2xl font-black leading-tight text-ink sm:text-3xl">{choice.title}</span>
              <span
                className={cn(
                  'mt-auto inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 font-bold',
                  selected ? 'bg-brand text-white' : 'bg-slate-100 text-brand',
                )}
              >
                {selected ? `${selectedCategory.title} · ${selectedCategory.shortLabel}` : 'Elegir categoría'}
                <ArrowRight className="h-5 w-5 shrink-0" />
              </span>
            </button>
          );
        })}
      </div>

      {selectedCategory ? (
        <>
          <div className="mx-auto mt-4 max-w-5xl border-l-4 border-brand bg-blue-50 px-4 py-3">
            <p className="font-display text-base font-black text-ink sm:text-lg">
              {selectedCategory.title} · {selectedCategory.vehicle}
            </p>
            <p className="mt-1 text-sm leading-5 text-slate-600">{selectedCategory.description}</p>
          </div>

          <fieldset className="mx-auto mt-3 max-w-5xl">
        <legend className="mb-1 font-display text-base font-black text-ink sm:text-lg">¿Qué quieres practicar?</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            aria-pressed={practiceMode === 'random'}
            onClick={() => setPracticeMode('random')}
            className={cn(
              'flex min-h-14 items-center justify-center gap-2 rounded-lg px-2 py-2 text-left transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-4',
              practiceMode === 'random' ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:bg-white/70',
            )}
          >
            <Shuffle className="h-6 w-6 shrink-0" />
            <span>
              <strong className="block text-sm sm:text-base">Preguntas aleatorias</strong>
              <span className="hidden text-xs sm:block">Mezcla toda la categoría</span>
            </span>
          </button>
          <button
            type="button"
            aria-pressed={practiceMode === 'weak'}
            onClick={() => setPracticeMode('weak')}
            className={cn(
              'flex min-h-14 items-center justify-center gap-2 rounded-lg px-2 py-2 text-left transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-4',
              practiceMode === 'weak' ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:bg-white/70',
            )}
          >
            <Target className="h-6 w-6 shrink-0" />
            <span>
              <strong className="block text-sm sm:text-base">Reforzar mis errores</strong>
              <span className="hidden text-xs sm:block">Primero lo que más fallaste</span>
            </span>
          </button>
        </div>
      </fieldset>

      <div className="relative mx-auto mt-4 max-w-5xl">
        <img
          src={yellowRoute}
          alt=""
          width="1400"
          height="280"
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-10 z-0 hidden h-24 w-[62%] object-contain object-left mix-blend-multiply lg:block"
        />

        {startHref ? (
          <Link to={startHref} className={startButtonClass}>
            <CircleGauge className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
            Empezar práctica {selectedCategory.title}
            <ArrowRight className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
          </Link>
        ) : (
          <button type="button" onClick={() => onStart?.(practiceMode)} className={startButtonClass}>
            <CircleGauge className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
            Empezar práctica {selectedCategory.title}
            <ArrowRight className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
          </button>
        )}

        <p className="mt-1 text-center text-sm text-slate-600">
          5 preguntas de {selectedCategory.title} · gratis siempre · {practiceMode === 'weak' ? 'refuerzo de errores' : 'selección aleatoria'}
        </p>
      </div>

      {fullExamTo ? (
        <section className="mx-auto mt-7 grid max-w-5xl gap-4 border-y border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" aria-labelledby="official-exam-title">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-50 text-brand">
              <Clock3 className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-brand">La prueba que mide tu preparación</p>
              <h2 id="official-exam-title" className="font-display text-xl font-black text-ink sm:text-2xl">
                Simulacro completo
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-600 sm:text-base">
                {OFFICIAL_EXAM_RULES.questionCount} preguntas · {OFFICIAL_EXAM_RULES.durationMinutes} minutos · apruebas con {OFFICIAL_EXAM_RULES.minimumCorrectAnswers} correctas
              </p>
              <p className="mt-1 text-sm font-bold text-slate-700">
                {fullExamAccessLoading
                  ? 'Revisando tu acceso...'
                  : fullExamHasAccess
                    ? `Acceso activo${membershipEndDate ? ` hasta ${new Date(membershipEndDate).toLocaleDateString('es-PE')}` : ''}`
                    : `${priceLabel} por 1 mes de acceso`}
              </p>
            </div>
          </div>
          {fullExamAccessLoading ? (
            <button type="button" disabled className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-slate-100 px-5 font-bold text-slate-500">
              Revisando acceso...
            </button>
          ) : (
            <Link
              to={fullExamTo}
              className={cn(
                'inline-flex min-h-14 items-center justify-center gap-2 rounded-lg px-5 font-bold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand',
                fullExamHasAccess
                  ? 'bg-brand text-white shadow-[0_4px_0_#0f4eae] hover:bg-blue-700'
                  : 'border-2 border-brand bg-white text-brand hover:bg-blue-50',
              )}
            >
              {fullExamHasAccess ? <CircleGauge className="h-6 w-6" /> : <LockKeyhole className="h-5 w-5" />}
              {fullExamHasAccess ? 'Rendir simulacro' : 'Activar y rendir'}
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </section>
      ) : null}
        </>
      ) : (
        <p className="mx-auto mt-5 max-w-2xl text-center text-base font-bold text-slate-600">
          Toca un vehículo para elegir la categoría que aparece en tu licencia.
        </p>
      )}

      {progress ? (
        <section className="mx-auto mt-8 max-w-5xl border-y border-line py-5" aria-labelledby="progress-title">
          {progress.totalIntentos > 0 ? (
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-brand">Preparación para el examen</p>
                    <h2 id="progress-title" className="font-display text-2xl font-black text-ink">
                      {progress.promedioGeneral}% de aciertos
                    </h2>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-600">{progress.totalIntentos} simulacros</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200" aria-label={`${progress.promedioGeneral}% de progreso`}>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(progress.promedioGeneral, 100)}%` }} />
                </div>
                <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-slate-700">
                  <Target className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                  {weakTopic
                    ? <span><strong>Refuerza:</strong> {weakTopic.topic} ({weakTopic.accuracy}% de aciertos)</span>
                    : <span>Aún no detectamos un tema débil. Sigue practicando.</span>}
                </p>
              </div>
              <Link to="/resultados" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-brand px-5 font-bold text-brand hover:bg-blue-50">
                <TrendingUp className="h-5 w-5" />
                Ver mi avance
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <TrendingUp className="h-8 w-8 shrink-0 text-brand" />
              <div className="flex-1">
                <h2 id="progress-title" className="font-display text-xl font-black text-ink">Aún no medimos tu preparación</h2>
                <p className="text-sm text-slate-600">
                  Se calcula al terminar un simulacro completo de 40 preguntas.
                  {progress.freePracticeCount > 0 ? ` Ya completaste ${progress.freePracticeCount} prácticas libres.` : ''}
                </p>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <div className="mx-auto mt-8 flex max-w-5xl flex-col gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success text-white">
          <BookOpen className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-emerald-700">También puedes aprender sin tiempo</p>
          <p className="font-display text-xl font-black text-ink">Señales y reglas de tránsito</p>
        </div>
        <Link to="/banco-preguntas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-success px-5 font-bold text-white hover:bg-emerald-700">
          Ver temas
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      <Modal
        open={Boolean(categoryVehicle)}
        title={categoryVehicle ? `Elige tu licencia de ${categoryVehicle.title}` : 'Elige tu licencia'}
        onClose={() => setCategoryVehicleId(null)}
        showAction={false}
        className="max-w-lg"
      >
        <p className="mb-4 text-base leading-6 text-slate-600">
          Toca la categoría que aparece escrita en tu licencia.
        </p>
        <div className="grid gap-2">
          {categoryVehicle?.categoryIds.map((categoryId) => {
            const category = getCategoryById(categories, categoryId);
            return (
              <CategoryButton
                key={category.id}
                category={category}
                selected={String(category.id) === String(selectedCategoryId)}
                onClick={() => chooseCategory(category.id)}
                showDescription
              />
            );
          })}
        </div>
      </Modal>
    </section>
  );
}
