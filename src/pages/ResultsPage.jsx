import { ArrowRight, Bike, CheckCircle2, Clock, HelpCircle, RefreshCw, Target, Trophy, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { BRAND_DISCLAIMER } from '../data/brand.js';
import { api, resolveCategoryId, toResult } from '../services/api.js';

const emptyResult = {
  id: null,
  category: 'A-I',
  total: 0,
  correctas: 0,
  incorrectas: 0,
  sinResponder: 0,
  porcentaje: 0,
  aprobado: false,
  tiempoUsado: '0m 00s',
  precision: '0%',
  temas: [],
  reviewQuestions: [],
};

function getStoredResults() {
  try {
    return JSON.parse(window.localStorage.getItem('simulamanejo:results') ?? '[]');
  } catch {
    return [];
  }
}

function normalizeResult(result) {
  if (!result) {
    return null;
  }

  const temas = result.temas?.length
    ? result.temas
    : result.total
      ? [{ tema: 'General', total: result.total, correctas: result.correctas, incorrectas: result.incorrectas, sinResponder: result.sinResponder, porcentaje: result.porcentaje ?? 0 }]
      : [];

  return {
    ...emptyResult,
    ...result,
    category: result.category ?? emptyResult.category,
    precision: result.precision ?? `${result.porcentaje ?? emptyResult.porcentaje}%`,
    tiempoUsado: result.tiempoUsado ?? emptyResult.tiempoUsado,
    temas,
    reviewQuestions: result.reviewQuestions?.slice(0, 12) ?? [],
  };
}

function mergeResultWithFallback(primary, fallback) {
  if (!primary) return fallback ?? null;
  if (!fallback) return primary;

  return {
    ...fallback,
    ...primary,
    temas: primary.temas?.length ? primary.temas : fallback.temas ?? [],
    reviewQuestions: primary.reviewQuestions?.length ? primary.reviewQuestions : fallback.reviewQuestions ?? [],
    tiempoUsado: primary.tiempoUsado && primary.tiempoUsado !== emptyResult.tiempoUsado ? primary.tiempoUsado : fallback.tiempoUsado,
    precision: primary.precision ?? fallback.precision,
  };
}

function topicColor(percentage) {
  if (percentage < 60) return 'red';
  if (percentage < 80) return 'orange';
  return 'emerald';
}

function topicPracticeUrl(result, tema) {
  const categoryId = resolveCategoryId(result.category);
  const topicId = tema.id || encodeURIComponent(String(tema.tema ?? ''));
  return `/banco-preguntas?category=${categoryId}&topic=${topicId}`;
}

export default function ResultsPage() {
  const { id } = useParams();
  const reviewRef = useRef(null);
  const storedResults = getStoredResults();
  const selectedResult = id ? storedResults.find((item) => String(item.id) === String(id)) : storedResults[0];
  const [result, setResult] = useState(normalizeResult(selectedResult));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    const request = id
      ? api.getAttemptDetail(id)
      : api.getExamHistory({ page: 0, size: 1 }).then(async (history) => {
        const latestAttempt = history.content?.[0];
        if (!latestAttempt) return selectedResult ?? null;
        if (!latestAttempt.attemptId) return toResult(latestAttempt);
        return api.getAttemptDetail(latestAttempt.attemptId).catch(() => toResult(latestAttempt));
      });

    request.then((apiResult) => {
      if (!cancelled) setResult(normalizeResult(mergeResultWithFallback(apiResult, selectedResult)));
    }).catch((requestError) => {
      if (!cancelled) {
        setLoadError(requestError.message);
        setResult(normalizeResult(selectedResult));
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading && !result) {
    return (
      <div className="grid gap-4 pt-2">
        <div>
          <h1 className="text-4xl font-black">Resultado del simulacro</h1>
          <p className="mt-1 text-lg text-slate-600">Cargando resultado...</p>
        </div>
        <Card className="p-8 text-center font-bold text-slate-500">Buscando tu último intento...</Card>
      </div>
    );
  }

  if (!result) {
    const missingAttempt = Boolean(id);
    return (
      <div className="grid gap-4 pt-2">
        <div>
          <h1 className="text-4xl font-black">Resultado del simulacro</h1>
          <p className="mt-1 text-lg text-slate-600">{missingAttempt ? 'No encontramos el intento solicitado.' : 'Todavía no tienes intentos registrados.'}</p>
        </div>
        <Card className="grid gap-4 p-8 text-center">
          <div>
            <h2 className="text-2xl font-black">{missingAttempt ? 'Resultado no disponible' : 'Rinde tu primer simulacro'}</h2>
            <p className="mt-2 text-slate-600">{missingAttempt ? 'El enlace puede estar vencido, pertenecer a otro usuario o haber sido eliminado.' : 'Cuando termines un intento, tus resultados aparecerán aquí con el puntaje guardado en tu historial.'}</p>
          </div>
          {loadError ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-danger">{loadError}</p> : null}
          <div className="flex flex-wrap justify-center gap-3">
            <Button as={Link} to="/dashboard" variant="secondary">Volver al dashboard</Button>
            <Button as={Link} to="/simulacro/25">Iniciar simulacro</Button>
          </div>
        </Card>
      </div>
    );
  }

  const summary = [
    { label: 'Correctas', value: result.correctas, icon: CheckCircle2, color: 'text-success', dot: 'bg-success' },
    { label: 'Incorrectas', value: result.incorrectas, icon: XCircle, color: 'text-danger', dot: 'bg-danger' },
    { label: 'Sin responder', value: result.sinResponder, icon: HelpCircle, color: 'text-slate-400', dot: 'bg-slate-300' },
  ];

  return (
    <div className="grid gap-4 pt-2">
      <div>
        <h1 className="text-4xl font-black">Resultado del simulacro</h1>
        <p className="mt-1 text-lg text-slate-600">{loading ? 'Cargando resultado...' : 'Revisa tu desempeño y los temas que debes reforzar antes del siguiente intento.'}</p>
      </div>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="grid content-start gap-5 self-start">
          <Card className="p-5 shadow-sm">
            <div className="grid gap-5 2xl:grid-cols-[250px_1fr]">
              <div>
                <h2 className="text-xl font-black">Resultado final</h2>
                <p className="mt-3 text-7xl font-black text-warning">{result.porcentaje}%</p>
                <Badge variant={result.aprobado ? 'green' : 'orange'} className="mt-3 px-5 py-2 text-base">{result.aprobado ? 'Aprobado' : 'Por reforzar'}</Badge>
                <p className="mt-5 text-xl text-slate-600"><strong className="text-ink">{result.correctas}</strong> correctas de {result.total} preguntas</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="grid min-h-32 place-items-center p-3 text-center shadow-none">
                  <Clock className="h-12 w-12 rounded-full bg-violet-50 p-2 text-violet-600" />
                  <span><span className="block text-sm text-slate-500">Tiempo usado</span><strong className="text-2xl">{result.tiempoUsado}</strong></span>
                </Card>
                <Card className="grid min-h-32 place-items-center p-3 text-center shadow-none">
                  <Target className="h-12 w-12 rounded-full bg-orange-50 p-2 text-warning" />
                  <span><span className="block text-sm text-slate-500">Precisión</span><strong className="text-2xl">{result.precision}</strong></span>
                </Card>
                <Card className="grid min-h-32 place-items-center p-3 text-center shadow-none">
                  <Bike className="h-12 w-12 rounded-full bg-blue-50 p-2 text-brand" />
                  <span><span className="block text-sm text-slate-500">Categoría</span><strong className="text-2xl">{result.category}</strong></span>
                </Card>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 2xl:pl-[280px]">
              <Button className="min-w-64" onClick={() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><CheckCircle2 className="h-4 w-4" /> Revisar respuestas</Button>
              <Button as={Link} to={`/simulacro/${result.category}`} variant="secondary" className="min-w-64"><RefreshCw className="h-4 w-4" /> Intentarlo de nuevo</Button>
            </div>
          </Card>

          <Card className="p-5 shadow-sm">
            <h2 className="text-2xl font-black">Análisis por temas</h2>
            <p className="mt-1 text-base text-slate-500">Así fue tu desempeño en cada tema del examen.</p>
            {result.temas.length ? (
              <div className="mt-5 grid gap-3">
                {result.temas.map((tema) => (
                  <div key={tema.id ?? tema.tema} className="rounded-lg border border-line bg-white p-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)_auto] lg:items-center">
                      <div className="min-w-0">
                        <h3 className="font-black leading-snug">{tema.tema}</h3>
                        {tema.total ? <p className="mt-1 text-xs font-bold text-slate-500">{tema.correctas ?? 0}/{tema.total} correctas</p> : null}
                      </div>
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>{tema.incorrectas ?? 0} errores</span>
                          <span>{tema.sinResponder ?? 0} sin responder</span>
                          <span className="text-ink">{tema.porcentaje}%</span>
                        </div>
                        <ProgressBar value={tema.porcentaje} color={topicColor(tema.porcentaje)} />
                      </div>
                      <Button as={Link} to={topicPracticeUrl(result, tema)} size="sm" variant="secondary" className="w-full lg:w-auto">
                        Practicar tema <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">No hay desglose por temas disponible para este intento.</p>}
          </Card>

          <Card className="bg-orange-50 p-6 ring-1 ring-orange-100 shadow-sm">
            <div className="flex items-center gap-8">
              <Trophy className="h-20 w-20 text-warning" />
              <div>
                <h2 className="text-2xl font-black">Sigue practicando, estás cada vez más cerca de aprobar.</h2>
                <p className="mt-2 text-lg text-slate-600">Cada intento te acerca más a tu objetivo. ¡Tú puedes!</p>
              </div>
            </div>
          </Card>
        </div>

        <aside className="grid gap-4 self-start">
          <Card className="p-4 shadow-sm">
            <h2 className="text-xl font-black">Resumen del intento</h2>
            <div className="mt-3 grid grid-cols-[170px_1fr] items-center gap-7">
              <div className="relative grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-success) 0 ${result.porcentaje}%, var(--color-danger) ${result.porcentaje}% ${100 - (result.sinResponder / Math.max(result.total, 1)) * 100}%, #cbd5e1 0 100%)` }}>
                <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
                  <span><strong className="block text-3xl">{result.total}</strong><span className="text-sm text-slate-500">Preguntas</span></span>
                </div>
              </div>
              <div className="grid gap-5 text-lg font-semibold">
                {summary.map((item) => (
                  <span key={item.label} className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-4"><span className={`h-4 w-4 rounded-full ${item.dot}`} /> {item.label}</span><strong>{item.value}</strong></span>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-sm">
            <h2 className="text-xl font-black">Temas por reforzar</h2>
            <div className="mt-3 flex items-center gap-6">
              <Target className="h-28 w-28 rounded-full bg-orange-50 p-5 text-danger" />
              <p className="text-lg leading-7 text-slate-600">{result.reviewQuestions.length ? 'Revisa las preguntas sin responder o incorrectas antes del siguiente intento.' : 'No hay preguntas pendientes de revisión para este intento.'}<br />Te recomendamos practicar 2 simulacros adicionales antes del examen oficial.</p>
            </div>
          </Card>

          <Card className="p-4 shadow-sm">
            <h2 className="text-xl font-black">Siguiente recomendación</h2>
            <div className="mt-4 grid gap-2">
              {[
                { label: 'Ir a banco de preguntas', to: '/banco-preguntas' },
                { label: 'Ver clases', to: '/clases' },
                { label: `Practicar ${result.category}`, to: `/simulacro/${result.category}` },
              ].map((item) => (
                <Link key={item.label} to={item.to} className="flex h-10 items-center justify-between rounded-lg border border-line px-4 text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-brand">
                  {item.label}<ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </Card>

          <Card ref={reviewRef} className="overflow-hidden scroll-mt-24 shadow-sm">
            <div className="p-4 pb-2"><h2 className="text-xl font-black">Preguntas con error</h2></div>
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500"><tr><th className="px-5 py-2">N°</th><th>Tema</th><th>Estado</th></tr></thead>
              <tbody>
                {result.reviewQuestions.length ? result.reviewQuestions.map((question) => (
                  <tr key={question.id} className="border-t border-line">
                    <td className="px-5 py-3">Pregunta {question.numero}</td>
                    <td>{question.tema}</td>
                    <td><Badge variant={question.estado === 'Incorrecta' ? 'red' : 'slate'}>{question.estado}</Badge></td>
                  </tr>
                )) : (
                  <tr className="border-t border-line">
                    <td className="px-5 py-4 text-slate-500" colSpan={3}>No hay preguntas para revisar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </aside>
      </section>

      <p className="border-t border-line py-4 text-center text-sm text-slate-500">{BRAND_DISCLAIMER}</p>
    </div>
  );
}
