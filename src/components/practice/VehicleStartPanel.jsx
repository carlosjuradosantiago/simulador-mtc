import {
  ArrowRight,
  BrainCircuit,
  BookOpen,
  CheckCircle2,
  CircleGauge,
  Clock3,
  LockKeyhole,
  Shuffle,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FREE_FULL_EXAM_ATTEMPTS, OFFICIAL_EXAM_RULES } from '../../data/examRules.js';
import { fallbackLicenseCategories, getCategoryById, getVehicleChoice, vehicleChoices } from '../../data/vehicleChoices.js';
import { cn } from '../../utils/cn.js';
import Modal from '../ui/Modal.jsx';

const adaptiveHighlights = [
  [Target, 'Refuerza tus errores', 'Prioriza lo que más te cuesta.'],
  [Shuffle, 'Incorpora preguntas nuevas', 'Amplía lo que ya dominas.'],
  [BookOpen, 'Repasa lo aprendido', 'Comprueba que aún lo recuerdas.'],
];

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
  adaptiveTo,
  fullExamTo,
  fullExamHasAccess = false,
  fullExamAccessLoading = false,
  fullExamPrice = 1200,
  membershipEndDate = null,
  fullExamIsFree = false,
  freeFullExamAttemptsRemaining = 0,
  focusSelected = false,
}) {
  const [practiceMode, setPracticeMode] = useState('random');
  const [categoryVehicleId, setCategoryVehicleId] = useState(null);
  const selectedCategory = selectedCategoryId ? getCategoryById(categories, selectedCategoryId) : null;
  const selectedVehicle = selectedCategory ? getVehicleChoice(selectedCategoryId) : null;
  const categoryVehicle = vehicleChoices.find((choice) => choice.id === categoryVehicleId) ?? null;
  const weakTopic = progress?.weakTopics?.[0];
  const priceLabel = `S/${Math.round(Number(fullExamPrice || 1200) / 100)}`;
  const canStartFullExam = fullExamIsFree || fullExamHasAccess;
  const isCheckingFullExamAccess = !fullExamIsFree && fullExamAccessLoading;
  const fullExamAccessLabel = fullExamIsFree
    ? 'Simulacro completo disponible'
    : freeFullExamAttemptsRemaining > 0
      ? freeFullExamAttemptsRemaining === FREE_FULL_EXAM_ATTEMPTS
        ? `${FREE_FULL_EXAM_ATTEMPTS} prácticas completas sin costo antes de suscribirte`
        : `Te ${freeFullExamAttemptsRemaining === 1 ? 'queda' : 'quedan'} ${freeFullExamAttemptsRemaining} ${freeFullExamAttemptsRemaining === 1 ? 'práctica completa' : 'prácticas completas'} sin costo`
    : fullExamHasAccess
      ? `Acceso activo${membershipEndDate ? ` hasta ${new Date(membershipEndDate).toLocaleDateString('es-PE')}` : ''}`
      : `Suscripcion mensual ${priceLabel}`;

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
  const startButtonClass = 'inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg border-2 border-brand bg-white px-4 text-center font-display text-lg font-black text-brand transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand sm:px-6 sm:text-xl';

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pb-14 lg:pt-5">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="font-display text-3xl font-black text-ink sm:text-4xl lg:text-5xl">
          {focusSelected && selectedCategory ? `Prepárate para aprobar ${selectedCategory.title} a la primera` : 'Simulador MTC: practica el examen de reglas por categoría'}
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-base leading-6 text-slate-600 sm:text-lg sm:leading-7">
          {focusSelected && selectedCategory
            ? `Entrenamiento optimizado para reforzar tus errores y avanzar en ${selectedCategory.vehicle}.`
            : 'Elige tu licencia y entrena con preguntas completas, respuestas explicadas y simulacros de 40 preguntas en 40 minutos.'}
        </p>
        {!selectedCategory ? <div className="mx-auto mt-4 flex max-w-3xl items-start gap-3 border-y border-blue-200 bg-blue-50 px-4 py-3 text-left sm:items-center sm:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white">
            <BrainCircuit className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-black text-ink sm:text-lg">Entrenamiento optimizado para aprobar a la primera</p>
            <p className="mt-0.5 text-sm leading-5 text-slate-700 sm:text-base sm:leading-6">
              La IA detecta lo que más te cuesta y combina errores, preguntas nuevas y repaso para que llegues preparado, no para que solo memorices respuestas.
              {' '}<a href="/metodologia-simulador-mtc" className="font-bold text-brand underline underline-offset-2">Así funciona</a>.
            </p>
          </div>
        </div> : null}
      </div>

      {selectedCategory && adaptiveTo ? (
        <section className="relative mx-auto mt-6 max-w-6xl overflow-hidden rounded-lg border-2 border-brand bg-brand-deep text-white shadow-[0_8px_0_#cfe0ff]" aria-labelledby="adaptive-practice-title">
          <div className="absolute inset-x-0 top-0 h-2 bg-traffic-yellow" aria-hidden="true" />
          <div className="grid gap-6 p-5 pt-7 md:grid-cols-[minmax(0,1fr)_300px] md:items-center sm:p-7 sm:pt-9">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-black uppercase text-traffic-yellow">
                <BrainCircuit className="h-5 w-5" />
                Tu mejor ruta para aprobar
              </p>
              <h2 id="adaptive-practice-title" className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">
                Entrenamiento inteligente
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-blue-100 sm:text-lg">
                La práctica prioriza lo que necesitas reforzar, incorpora preguntas nuevas y recupera temas anteriores. Puedes revisar y corregir antes de entregar; al finalizar verás cada respuesta explicada.
              </p>
              <div className="mt-5 grid border-y border-blue-400/60 sm:grid-cols-3">
                {adaptiveHighlights.map(([Icon, title, description], index) => (
                  <div key={title} className={`flex gap-3 py-3 sm:px-4 ${index > 0 ? 'border-t border-blue-400/60 sm:border-l sm:border-t-0' : ''}`}>
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-traffic-yellow" aria-hidden="true" />
                    <span className="text-left">
                      <strong className="block font-display text-sm font-black text-white">{title}</strong>
                      <span className="mt-1 block text-xs leading-5 text-blue-100">{description}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-blue-200">
                Categoría {selectedCategory.title} · {selectedCategory.vehicle}. La mezcla se ajusta a tu historial.
              </p>
            </div>
            <div>
              {isCheckingFullExamAccess ? (
                <button type="button" disabled className="inline-flex min-h-16 w-full items-center justify-center rounded-lg bg-slate-200 px-5 font-bold text-slate-500">
                  Revisando acceso...
                </button>
              ) : (
                <Link to={adaptiveTo} className="inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-lg bg-traffic-yellow px-5 text-center font-display text-xl font-black text-ink shadow-[0_5px_0_#d99b19] transition hover:bg-[#ffc94f] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white">
                  {canStartFullExam ? <BrainCircuit className="h-7 w-7" /> : <LockKeyhole className="h-6 w-6" />}
                  {canStartFullExam ? 'Entrenar ahora' : 'Suscribirme'}
                  <ArrowRight className="h-6 w-6" />
                </Link>
              )}
              <a href="/metodologia-simulador-mtc" className="mt-4 inline-flex min-h-11 w-full items-center justify-center font-bold text-blue-100 underline underline-offset-4 hover:text-white">
                Conoce cómo se adapta
              </a>
            </div>
          </div>
        </section>
      ) : null}

      <div className={cn(
        'mx-auto grid gap-4 lg:gap-5',
        selectedCategory ? 'mt-4' : 'mt-6',
        focusSelected && selectedCategory ? 'max-w-6xl grid-cols-1' : 'max-w-6xl md:grid-cols-3',
      )}>
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
                'relative min-w-0 rounded-lg border-2 bg-white text-center transition hover:border-blue-300 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand',
                focusSelected && selectedCategory ? 'flex min-h-16 items-center gap-3 px-4 py-3 text-left' : 'flex min-h-[300px] flex-col p-4 hover:-translate-y-0.5 hover:shadow-lg sm:min-h-[330px] lg:min-h-[350px] lg:p-5',
                selected ? 'border-brand bg-blue-50/40 shadow-[0_8px_0_#cfe0ff]' : 'border-line',
                selectedCategory && !selected ? (focusSelected ? 'hidden' : 'hidden md:flex') : null,
              )}
            >
              {selected && !(focusSelected && selectedCategory) ? (
                <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-brand text-white">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
              ) : null}
              <span className={cn('items-center justify-center', focusSelected && selectedCategory ? 'hidden' : 'flex h-[205px] w-full sm:h-[220px] lg:h-[235px]')}>
                <img src={choice.image} alt={choice.imageAlt} width="900" height="600" className="h-full w-full object-contain" />
              </span>
              {focusSelected && selectedCategory ? <CheckCircle2 className="h-6 w-6 shrink-0 text-brand" /> : null}
              <span className={cn('block font-display font-black leading-tight text-ink', focusSelected && selectedCategory ? 'text-lg' : 'mt-1 text-2xl sm:text-3xl')}>{choice.title}</span>
              <span
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-bold',
                  focusSelected && selectedCategory ? 'ml-auto min-h-10 w-auto' : 'mt-auto min-h-12 w-full',
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
        <div className={cn(
          'mx-auto mt-3 grid max-w-6xl grid-cols-2 gap-2',
          focusSelected ? 'md:grid' : 'md:hidden',
        )} aria-label="Cambiar de vehículo">
          {vehicleChoices
            .filter((choice) => choice.id !== selectedVehicle?.id)
            .map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => chooseVehicle(choice)}
                className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-lg border border-line bg-white px-2 text-sm font-bold text-brand"
              >
                <span className="text-center leading-4">Cambiar a {choice.subtitle}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>
            ))}
        </div>
      ) : null}

      {selectedCategory ? (
        <>
          <div className="mx-auto mt-4 max-w-5xl border-l-4 border-brand bg-blue-50 px-4 py-3">
            <p className="font-display text-base font-black text-ink sm:text-lg">
              {selectedCategory.title} · {selectedCategory.vehicle}
            </p>
            <p className="mt-1 text-sm leading-5 text-slate-600">{selectedCategory.description}</p>
          </div>

          {fullExamTo ? (
            <section
              className="mx-auto mt-5 max-w-6xl overflow-hidden rounded-lg border border-line bg-white text-ink"
              aria-labelledby="official-exam-title"
            >
              <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center sm:p-6">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-black uppercase text-brand">
                    <Clock3 className="h-5 w-5" />
                    {progress?.recommendTimedExam ? 'Es momento de medir tu nivel' : 'Simulacro cronometrado'}
                  </p>
                  <h2 id="official-exam-title" className="mt-1 font-display text-2xl font-black sm:text-3xl">
                    Mide tu nivel con 40 preguntas
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                    Sin ayudas y con tiempo. Úsalo para comprobar cuánto avanzaste después de entrenar.
                  </p>
                  <div className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line py-3 text-center">
                    <span>
                      <strong className="block font-display text-2xl font-black">{OFFICIAL_EXAM_RULES.questionCount}</strong>
                      <span className="text-xs text-slate-500">preguntas</span>
                    </span>
                    <span>
                      <strong className="block font-display text-2xl font-black">{OFFICIAL_EXAM_RULES.durationMinutes} min</strong>
                      <span className="text-xs text-slate-500">tiempo máximo</span>
                    </span>
                    <span>
                      <strong className="block font-display text-2xl font-black">{OFFICIAL_EXAM_RULES.minimumCorrectAnswers}/40</strong>
                      <span className="text-xs text-slate-500">para aprobar</span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-600">Sí cuenta en Mi avance · {fullExamAccessLabel}</p>
                </div>
                {isCheckingFullExamAccess ? (
                  <button type="button" disabled className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-slate-100 px-5 font-bold text-slate-500">
                    Revisando acceso...
                  </button>
                ) : (
                  <Link
                    to={fullExamTo}
                    className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border-2 border-brand bg-white px-5 text-center font-display text-lg font-black text-brand transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand"
                  >
                    {canStartFullExam ? <CircleGauge className="h-7 w-7" /> : <LockKeyhole className="h-6 w-6" />}
                    {canStartFullExam ? 'Iniciar simulacro' : 'Suscribirme'}
                    <ArrowRight className="h-6 w-6" />
                  </Link>
                )}
              </div>
            </section>
          ) : null}

          <section className="mx-auto mt-6 max-w-5xl border-t border-line pt-5" aria-labelledby="quick-practice-title">
            <div>
              <p className="text-sm font-bold text-slate-500">Práctica corta</p>
              <h2 id="quick-practice-title" className="font-display text-xl font-black text-ink sm:text-2xl">Practicar sin presión</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">5 preguntas sin cronómetro. Sirve para aprender y no cambia tus estadísticas.</p>
            </div>

            <fieldset className="mt-3">
              <legend className="mb-1 font-display text-base font-black text-ink">Elige qué practicar</legend>
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
                    <strong className="block text-sm sm:text-base">Repasar solo mis falladas</strong>
                    <span className="hidden text-xs sm:block">Sin mezclar preguntas nuevas</span>
                  </span>
                </button>
              </div>
            </fieldset>

            <div className="mt-3">
              {startHref ? (
                <Link to={startHref} className={startButtonClass}>
                  <CircleGauge className="h-6 w-6 shrink-0" />
                  Practicar 5 preguntas
                  <ArrowRight className="h-6 w-6 shrink-0" />
                </Link>
              ) : (
                <button type="button" onClick={() => onStart?.(practiceMode)} className={startButtonClass}>
                  <CircleGauge className="h-6 w-6 shrink-0" />
                  Practicar 5 preguntas
                  <ArrowRight className="h-6 w-6 shrink-0" />
                </button>
              )}
              <p className="mt-1 text-center text-sm text-slate-600">
                {selectedCategory.title} · {practiceMode === 'weak' ? 'solo preguntas falladas' : 'selección aleatoria'}
              </p>
            </div>
          </section>
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
                    <p className="text-sm font-bold text-brand">Preparación según tus simulacros</p>
                    <h2 id="progress-title" className="font-display text-2xl font-black text-ink">
                      {progress.promedioGeneral}% de aciertos
                    </h2>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-600">{progress.totalIntentos} simulacros de 40</p>
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
                  Se calcula al terminar un simulacro de 40 preguntas con cronómetro.
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
          <p className="text-sm font-bold text-emerald-700">Material oficial para estudiar</p>
          <p className="font-display text-xl font-black text-ink">Balotarios oficiales del MTC</p>
        </div>
        <Link to="/materiales" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-success px-5 font-bold text-white hover:bg-emerald-700">
          Ver PDF
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
