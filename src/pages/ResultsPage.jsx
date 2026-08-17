import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Target,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
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
  if (!result) return null;
  const temas = result.temas?.length
    ? result.temas
    : result.total
      ? [{
        tema: 'General',
        total: result.total,
        correctas: result.correctas,
        incorrectas: result.incorrectas,
        sinResponder: result.sinResponder,
        porcentaje: result.porcentaje ?? 0,
      }]
      : [];

  return {
    ...emptyResult,
    ...result,
    category: result.category ?? emptyResult.category,
    tiempoUsado: result.tiempoUsado ?? emptyResult.tiempoUsado,
    temas,
    reviewQuestions: result.reviewQuestions ?? [],
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
    tiempoUsado: primary.tiempoUsado && primary.tiempoUsado !== emptyResult.tiempoUsado
      ? primary.tiempoUsado
      : fallback.tiempoUsado,
  };
}

function resultMessage(result) {
  const adaptivePractice = result.sessionType === 'PRACTICA_ADAPTATIVA';
  const quickPractice = result.total <= 5 && !adaptivePractice;
  if (adaptivePractice) {
    return {
      title: 'Entrenamiento terminado',
      text: 'Tu plan ya aprendió qué necesitas reforzar en la próxima práctica.',
    };
  }
  if (result.correctas === result.total && result.total > 0) {
    return { title: '¡Excelente!', text: 'Respondiste todo correctamente.' };
  }
  if (quickPractice && result.correctas >= 3) {
    return { title: '¡Vas muy bien!', text: 'Ya tienes una buena base. Practica otra ronda para afirmarla.' };
  }
  if (quickPractice) {
    return { title: 'Estás aprendiendo', text: 'Revisa tus errores y vuelve a intentarlo. Aquí puedes practicar sin presión.' };
  }
  if (result.aprobado) {
    return { title: '¡Aprobaste el simulacro!', text: 'Tu resultado está listo para revisar.' };
  }
  return { title: 'Sigue practicando', text: 'Revisa tus errores antes de volver a intentar el simulacro.' };
}

export default function ResultsPage() {
  const { id } = useParams();
  const reviewRef = useRef(null);
  const storedResults = getStoredResults();
  const storedResult = id
    ? storedResults.find((item) => String(item.id) === String(id))
    : null;
  const [result, setResult] = useState(normalizeResult(storedResult));
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
        if (!latestAttempt) return storedResult ?? null;
        if (!latestAttempt.attemptId) return toResult(latestAttempt);
        return api.getAttemptDetail(latestAttempt.attemptId).catch(() => toResult(latestAttempt));
      });

    request.then((apiResult) => {
      if (!cancelled) setResult(normalizeResult(mergeResultWithFallback(apiResult, storedResult)));
    }).catch((requestError) => {
      if (!cancelled) {
        setLoadError(requestError.message);
        setResult(normalizeResult(storedResult));
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
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div>
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-brand" />
          <p className="mt-4 text-lg font-bold text-slate-600">Buscando tu resultado...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Target className="mx-auto h-14 w-14 text-brand" />
        <h1 className="mt-4 font-display text-3xl font-black text-ink">Aún no hay un resultado</h1>
        <p className="mt-3 text-lg text-slate-600">
          Termina un simulacro de 40 preguntas para medir tu avance.
        </p>
        {loadError ? <p className="mt-4 text-sm font-bold text-danger">{loadError}</p> : null}
        <Button as={Link} to="/dashboard" className="mt-7">
          <ArrowLeft className="h-5 w-5" />
          Ir al inicio
        </Button>
      </div>
    );
  }

  const message = resultMessage(result);
  const categoryId = resolveCategoryId(result.category);
  const adaptivePractice = result.sessionType === 'PRACTICA_ADAPTATIVA';
  const quickPractice = result.total <= 5 && !adaptivePractice;
  const learningPractice = quickPractice || adaptivePractice;
  const weakTopics = [...result.temas]
    .filter((topic) => Number(topic.porcentaje ?? 0) < 100)
    .sort((left, right) => Number(left.porcentaje ?? 0) - Number(right.porcentaje ?? 0))
    .slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="text-center">
        <p className="font-bold text-brand">Tu resultado</p>
        <h1 className="mt-2 font-display text-4xl font-black text-ink sm:text-5xl">{message.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg leading-7 text-slate-600">{message.text}</p>
      </header>

      <section className="mx-auto mt-8 max-w-3xl rounded-lg border-2 border-line bg-white p-5 sm:p-8" aria-label="Resumen del resultado">
        <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-sm font-bold uppercase text-slate-500">Respuestas correctas</p>
            <p className="mt-1 font-display text-6xl font-black text-brand">
              {result.correctas}
              <span className="text-3xl text-slate-400">/{result.total}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left text-sm sm:text-base">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <Check className="h-5 w-5 text-success" />
              Correctas
            </span>
            <strong>{result.correctas}</strong>
            <span className="inline-flex items-center gap-2 text-slate-600">
              <X className="h-5 w-5 text-danger" />
              Por revisar
            </span>
            <strong>{result.incorrectas + result.sinResponder}</strong>
            <span className="inline-flex items-center gap-2 text-slate-600">
              <Clock3 className="h-5 w-5 text-brand" />
              Tiempo
            </span>
            <strong>{result.tiempoUsado}</strong>
          </div>
        </div>
        <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-200" aria-label={`${result.porcentaje}% de respuestas correctas`}>
          <div className="h-full rounded-full bg-success" style={{ width: `${result.porcentaje}%` }} />
        </div>
        <p className="mt-2 text-right text-sm font-bold text-slate-600">{result.porcentaje}% correcto</p>
        {learningPractice ? (
          <p className="mt-4 border-l-4 border-brand bg-blue-50 px-4 py-3 text-left text-sm leading-6 text-slate-700">
            {adaptivePractice
              ? 'Tu siguiente entrenamiento priorizará lo que fallaste, añadirá preguntas nuevas y repasará lo aprendido. Tu nivel real se mide solo con simulacros cronometrados.'
              : 'Esta práctica sirve para aprender y no cambia tus estadísticas. Tu avance se calcula solo con simulacros cronometrados de 40 preguntas.'}
          </p>
        ) : null}
      </section>

      <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-3 sm:flex-row">
        {learningPractice ? (
          <>
            <Button
              as={Link}
              to={`/simulacro/${categoryId}?mode=exam`}
              size="lg"
              className="flex-1"
            >
              <Clock3 className="h-6 w-6" />
              Iniciar simulacro
            </Button>
            <Button as={Link} to={`/simulacro/${categoryId}?mode=adaptive&strategy=adaptive`} variant="secondary" size="lg" className="flex-1">
              <Target className="h-6 w-6" />
              Entrenamiento inteligente
            </Button>
          </>
        ) : (
          <>
            <Button as={Link} to={`/simulacro/${categoryId}?mode=adaptive&strategy=adaptive`} size="lg" className="flex-1">
              <Target className="h-6 w-6" />
              Entrenamiento inteligente
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              disabled={!result.reviewQuestions.length}
            >
              Revisar mis errores
              <ArrowRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {weakTopics.length ? (
        <section className="mx-auto mt-12 max-w-3xl" aria-labelledby="topics-title">
          <h2 id="topics-title" className="font-display text-2xl font-black text-ink">Temas para reforzar</h2>
          <p className="mt-1 text-slate-600">Empieza por el que tenga menos aciertos.</p>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {weakTopics.map((topic) => (
              <div key={topic.id ?? topic.tema} className="flex items-center gap-4 py-4">
                <Target className="h-6 w-6 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{topic.tema}</p>
                  <p className="text-sm text-slate-500">
                    {topic.correctas ?? 0} de {topic.total ?? 0} correctas
                  </p>
                </div>
                <strong className="text-lg text-slate-600">{topic.porcentaje ?? 0}%</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section ref={reviewRef} className="mx-auto mt-12 max-w-3xl scroll-mt-24" aria-labelledby="review-title">
        <h2 id="review-title" className="font-display text-2xl font-black text-ink">Revisa tus respuestas</h2>
        <p className="mt-1 text-slate-600">
          Abre cada pregunta para ver la respuesta correcta.
        </p>
        {result.reviewQuestions.length ? (
          <div className="mt-4 divide-y divide-line border-y border-line">
            {result.reviewQuestions.map((question) => (
              <details key={question.id} className="group py-1">
                <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 py-3 font-bold text-ink">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
                    <X className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    Pregunta {question.numero}: {question.tema}
                  </span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180" />
                </summary>
                <div className="pb-5 pl-12 text-base leading-7 text-slate-700">
                  {question.pregunta ? <p className="font-bold text-ink">{question.pregunta}</p> : null}
                  <p className="mt-2"><strong>Tu respuesta:</strong> {question.seleccionada || 'Sin responder'}</p>
                  <p className="mt-1 text-emerald-800"><strong>Respuesta correcta:</strong> {question.correcta || 'No disponible'}</p>
                  {question.explicacion ? <p className="mt-2">{question.explicacion}</p> : null}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-emerald-50 p-5 font-bold text-emerald-900">
            No tienes respuestas incorrectas en este intento.
          </div>
        )}
      </section>

      <div className="mt-10 text-center">
        <Link to="/dashboard" className="inline-flex min-h-12 items-center gap-2 px-4 font-bold text-brand hover:underline">
          <ArrowLeft className="h-5 w-5" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
