import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  ClipboardCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Button from '../components/ui/Button.jsx';
import { getCategoryById, fallbackLicenseCategories } from '../data/vehicleChoices.js';
import { useAuth } from '../hooks/useAuth.js';
import { api, resolveCategoryId } from '../services/api.js';

const PASSING_PERCENTAGE = 88;
const EMPTY_STATS = {
  totalIntentos: 0,
  freePracticeCount: 0,
  promedioGeneral: 0,
  intentosAprobados: 0,
  totalPreguntas: 0,
  respuestasCorrectas: 0,
  weakTopics: [],
};

function formatAttemptDate(value, compact = false) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PE', compact
    ? { day: '2-digit', month: 'short' }
    : { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function Metric({ label, value, detail }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-display text-3xl font-black text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const categoryId = user?.categoryConfirmed && user?.category
    ? resolveCategoryId(user.category)
    : null;
  const category = categoryId
    ? getCategoryById(fallbackLicenseCategories, categoryId)
    : null;
  const simulatorTo = categoryId
    ? `/simulacro/${categoryId}?mode=exam`
    : '/dashboard?chooseCategory=1';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');

    if (!categoryId) {
      setStats(EMPTY_STATS);
      setHistory([]);
      setLoading(false);
      return undefined;
    }

    Promise.all([
      api.getStats(categoryId),
      api.getExamHistory({ page: 0, size: 8, categoryId }),
    ]).then(([nextStats, nextHistory]) => {
      if (cancelled) return;
      setStats(nextStats);
      setHistory(nextHistory?.content ?? []);
    }).catch((error) => {
      if (!cancelled) setLoadError(error.message || 'No pudimos cargar tu avance.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const chartData = useMemo(() => history
    .slice()
    .reverse()
    .map((attempt, index) => ({
      attempt: index + 1,
      date: formatAttemptDate(attempt.startTime, true),
      percentage: Math.round(Number(attempt.accuracyPercentage) || 0),
      correct: Number(attempt.correctAnswers) || 0,
    })), [history]);

  const totalAttempts = Number(stats?.totalIntentos) || 0;
  const average = Math.round(Number(stats?.promedioGeneral) || 0);
  const approved = Number(stats?.intentosAprobados) || 0;
  const totalQuestions = Number(stats?.totalPreguntas) || 0;
  const correctAnswers = Number(stats?.respuestasCorrectas) || 0;
  const weakTopics = stats?.weakTopics ?? [];
  const hasAttempts = totalAttempts > 0;
  const statusTitle = !categoryId
    ? 'Primero elige tu licencia'
    : !hasAttempts
      ? 'Completa tu primer simulacro'
      : average >= PASSING_PERCENTAGE
        ? 'Tu promedio supera la meta'
        : `Te faltan ${PASSING_PERCENTAGE - average} puntos para la meta`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-5 border-b border-line pb-7 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="font-bold text-brand">Mi avance</p>
          <h1 className="mt-1 font-display text-3xl font-black text-ink sm:text-4xl">
            {category ? `Así vas para la licencia ${category.title}` : 'Elige tu licencia para comenzar'}
          </h1>
          <p className="mt-2 text-base leading-7 text-slate-600 sm:text-lg">
            Solo contamos tus simulacros cronometrados de 40 preguntas.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button as={Link} to={simulatorTo} size="lg">
            <CircleGauge className="h-6 w-6" />
            {category ? `Iniciar simulacro ${category.title}` : 'Elegir mi licencia'}
          </Button>
          {category ? (
            <Button as={Link} to="/dashboard?chooseCategory=1" variant="secondary" size="lg">
              Cambiar licencia
            </Button>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className="grid min-h-[360px] place-items-center text-center">
          <div>
            <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-brand" />
            <p className="mt-4 font-bold text-slate-600">Calculando tu avance...</p>
          </div>
        </div>
      ) : (
        <>
          {loadError ? (
            <p role="alert" className="mt-6 border-l-4 border-danger bg-red-50 px-4 py-3 font-bold text-danger">{loadError}</p>
          ) : null}

          <section className="mt-7 overflow-hidden rounded-lg border-2 border-brand bg-white" aria-labelledby="readiness-title">
            <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
              <div className="p-5 sm:p-7">
                <p className="flex items-center gap-2 text-sm font-black uppercase text-brand">
                  <TrendingUp className="h-5 w-5" />
                  Preparación para el simulacro
                </p>
                <h2 id="readiness-title" className="mt-2 font-display text-2xl font-black text-ink sm:text-3xl">{statusTitle}</h2>
                <p className="mt-2 text-base leading-6 text-slate-600">
                  {!categoryId
                    ? 'Con esa elección prepararemos las preguntas, prácticas y resultados de tu categoría.'
                    : hasAttempts
                      ? `Tu promedio actual es ${average}%. La referencia para aprobar es 35 de 40 respuestas, aproximadamente ${PASSING_PERCENTAGE}%.`
                      : 'Al terminarlo verás aquí tu promedio, evolución y los temas que debes reforzar.'}
                </p>
                <div className="relative mt-6 h-4 overflow-hidden rounded-full bg-slate-200" aria-label={`${average}% de promedio`}>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(average, 100)}%` }} />
                  <span className="absolute inset-y-0 w-0.5 bg-traffic-yellow" style={{ left: `${PASSING_PERCENTAGE}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
                  <span>{hasAttempts ? `${average}% actual` : 'Sin resultados todavía'}</span>
                  <span>Meta: {PASSING_PERCENTAGE}%</span>
                </div>
              </div>
              <div className="grid place-items-center bg-brand-deep p-6 text-center text-white">
                {hasAttempts ? (
                  <div>
                    <p className="text-sm font-bold text-blue-100">Promedio</p>
                    <p className="mt-1 font-display text-6xl font-black">{average}%</p>
                    <p className="mt-2 text-sm text-blue-100">en {totalAttempts} simulacros</p>
                  </div>
                ) : (
                  <div>
                    <CircleGauge className="mx-auto h-12 w-12 text-traffic-yellow" />
                    <p className="mt-3 font-display text-xl font-black">{categoryId ? 'Tu punto de partida' : 'Una sola elección'}</p>
                    <p className="mt-2 text-sm leading-6 text-blue-100">
                      {categoryId ? 'Haz un simulacro para obtener tu primera medición.' : 'Después verás únicamente el contenido de tu licencia.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 grid divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4" aria-label="Resumen de avance">
            <Metric label="Simulacros" value={totalAttempts} detail="Completados con 40 preguntas" />
            <Metric label="Aprobados" value={approved} detail="Con 35 o más respuestas correctas" />
            <Metric label="Respuestas correctas" value={hasAttempts ? correctAnswers : 'Sin datos'} detail={hasAttempts ? `De ${totalQuestions} preguntas evaluadas` : 'Aparecerán después del primer simulacro'} />
            <Metric label="Prácticas cortas" value={Number(stats?.freePracticeCount) || 0} detail="Sirven para aprender, no cambian el promedio" />
          </section>

          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
            <section aria-labelledby="evolution-title">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="evolution-title" className="font-display text-2xl font-black text-ink">Evolución de tus simulacros</h2>
                  <p className="mt-1 text-sm text-slate-600">Resultados de los últimos ocho intentos.</p>
                </div>
                <TrendingUp className="h-7 w-7 shrink-0 text-brand" />
              </div>
              {chartData.length ? (
                <div className="mt-4 h-[280px] w-full rounded-lg border border-line bg-white p-3" role="img" aria-label="Gráfico de resultados de los últimos simulacros">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-line)" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-slate-500)', fontSize: 12 }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-slate-500)', fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                      <Tooltip formatter={(value, _name, item) => [`${value}% · ${item.payload.correct}/40`, 'Resultado']} />
                      <ReferenceLine y={PASSING_PERCENTAGE} stroke="var(--color-traffic-yellow)" strokeWidth={2} strokeDasharray="5 5" />
                      <Area type="monotone" dataKey="percentage" stroke="var(--color-brand)" strokeWidth={3} fill="#dbeafe" dot={{ r: 4, fill: 'var(--color-brand)' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-4 grid min-h-[280px] place-items-center rounded-lg border border-dashed border-line bg-slate-50 p-6 text-center">
                  <div>
                    <TrendingUp className="mx-auto h-10 w-10 text-brand" />
                    <p className="mt-3 font-display text-xl font-black text-ink">Tu gráfico aparecerá aquí</p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Necesitamos al menos un simulacro cronometrado terminado.</p>
                  </div>
                </div>
              )}
            </section>

            <section aria-labelledby="weak-topics-title">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="weak-topics-title" className="font-display text-2xl font-black text-ink">Qué debes reforzar</h2>
                  <p className="mt-1 text-sm text-slate-600">Empieza por el porcentaje más bajo.</p>
                </div>
                <Target className="h-7 w-7 shrink-0 text-danger" />
              </div>
              {weakTopics.length ? (
                <div className="mt-4 divide-y divide-line border-y border-line">
                  {weakTopics.map((topic) => (
                    <div key={topic.topic} className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-ink">{topic.topic}</p>
                        <strong className="text-brand">{topic.accuracy}%</strong>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-danger" style={{ width: `${Math.max(topic.accuracy, 4)}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{topic.incorrect} respuestas por revisar</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-line bg-slate-50 p-5">
                  <p className="font-bold text-ink">Aún no detectamos un tema débil</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Completa un simulacro para analizar tus respuestas por tema.</p>
                </div>
              )}
              {categoryId ? (
                <Button as={Link} to={`/simulacro/${categoryId}?mode=quick&strategy=weak`} variant="secondary" className="mt-4 w-full">
                  <Target className="h-5 w-5" />
                  Practicar mis errores
                </Button>
              ) : null}
            </section>
          </div>

          <section className="mt-10" aria-labelledby="history-title">
            <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
              <div>
                <h2 id="history-title" className="font-display text-2xl font-black text-ink">Últimos simulacros</h2>
                <p className="mt-1 text-sm text-slate-600">Abre un intento para revisar cada respuesta.</p>
              </div>
              <ClipboardCheck className="h-7 w-7 shrink-0 text-brand" />
            </div>
            {history.length ? (
              <div className="divide-y divide-line">
                {history.map((attempt) => {
                  const passed = attempt.status === 'APROBADO';
                  return (
                    <Link key={attempt.attemptId} to={`/resultados/${attempt.attemptId}`} className="grid min-h-20 items-center gap-3 py-4 transition hover:bg-blue-50 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${passed ? 'bg-emerald-50 text-success' : 'bg-red-50 text-danger'}`}>
                          {passed ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                        </span>
                        <span className="min-w-0">
                          <strong className="block text-ink">{attempt.categoryName || category?.title || 'Simulacro MTC'}</strong>
                          <span className="mt-1 flex items-center gap-1 text-sm text-slate-500"><CalendarDays className="h-4 w-4" /> {formatAttemptDate(attempt.startTime)}</span>
                        </span>
                      </span>
                      <span className="font-display text-xl font-black text-ink">{attempt.correctAnswers}/40</span>
                      <span className="inline-flex items-center justify-end gap-1 font-bold text-brand">Revisar <ArrowRight className="h-5 w-5" /></span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="font-bold text-slate-600">Todavía no tienes simulacros terminados.</p>
                <Button as={Link} to={simulatorTo} className="mt-4">
                  <CircleGauge className="h-5 w-5" />
                  {categoryId ? 'Iniciar mi primer simulacro' : 'Elegir mi licencia'}
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
