import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { OptionContent, QuestionImage } from '../components/ui/QuestionMedia.jsx';
import { api } from '../services/api.js';
import { cn } from '../utils/cn.js';
import { getLearningTopicById } from '../utils/learningTopics.js';

const PAGE_SIZE = 10;

function getCategoryLabel(categories, category) {
  if (!category || category === 'Todas') return 'Todas las licencias';
  return categories.find((item) => String(item.id) === String(category))?.title ?? String(category);
}

function QuestionExplanation({ question }) {
  const explanation = (question.explicacion || question.fundamento || '').trim();
  const alreadyIncludesAnswer = /^respuesta correcta\s*:/i.test(explanation);
  const answer = String(question.respuestaCorrecta ?? '').replace(/[.\s]+$/, '');

  if (alreadyIncludesAnswer) return explanation;

  return (
    <>
      {answer ? <strong className="text-emerald-800">Respuesta correcta: {answer}.</strong> : null}{' '}
      {explanation || 'Esta pregunta aún no tiene una explicación registrada.'}
    </>
  );
}

function QuestionItem({ question, number }) {
  return (
    <details className="group border-b border-line">
      <summary className="flex min-h-20 cursor-pointer list-none items-center gap-4 py-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 font-black text-brand">
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-500">{question.tema || 'Reglas de tránsito'}</span>
          <span className="mt-1 block text-base font-bold leading-6 text-ink sm:text-lg">{question.texto}</span>
        </span>
        <ChevronDown className="h-6 w-6 shrink-0 text-brand transition group-open:rotate-180" />
      </summary>

      <div className="pb-6 pl-0 sm:pl-15">
        {question.imagenBase64 ? (
          <QuestionImage
            src={question.imagenBase64}
            className="mb-4 h-[220px] border border-line bg-slate-50 sm:h-[280px]"
            imgClassName="max-h-[200px] sm:max-h-[260px]"
          />
        ) : null}

        <div className="grid gap-2">
          {question.opciones.map((option, index) => (
            <div
              key={option.id}
              className={cn(
                'flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 text-base leading-6',
                option.esCorrecta
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : 'border-line bg-white text-slate-700',
              )}
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full font-black',
                  option.esCorrecta ? 'bg-success text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <OptionContent option={option} />
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-base leading-7 text-slate-700">
          <QuestionExplanation question={question} />
        </div>
      </div>
    </details>
  );
}

export default function QuestionBankPage() {
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState(searchParams.get('category') ?? 'Todas');
  const [section, setSection] = useState('Todas');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [learningTopicId, setLearningTopicId] = useState(searchParams.get('topic') ?? '');
  const [page, setPage] = useState(0);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [meta, setMeta] = useState({ totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setCategory(searchParams.get('category') ?? 'Todas');
    setSearch(searchParams.get('search') ?? '');
    setLearningTopicId(searchParams.get('topic') ?? '');
    setPage(0);
  }, [searchParams]);

  const categoryLabel = useMemo(() => getCategoryLabel(categories, category), [categories, category]);
  const activeLearningTopic = useMemo(() => getLearningTopicById(learningTopicId), [learningTopicId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    api.getQuestionBank({
      categoryId: category,
      categoryLabel,
      search,
      learningTopic: activeLearningTopic?.id ?? '',
      section,
      page,
      size: PAGE_SIZE,
    }).then((data) => {
      if (cancelled) return;
      setQuestions(data.content ?? []);
      setMeta({
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
      });
    }).catch((requestError) => {
      if (!cancelled) {
        setQuestions([]);
        setMeta({ totalElements: 0, totalPages: 0 });
        setLoadError(requestError.message);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeLearningTopic?.id, category, categoryLabel, page, search, section]);

  const updateCategory = (nextCategory) => {
    setCategory(String(nextCategory));
    setPage(0);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-50 text-success">
            <BookOpen className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">Aprender sin presión</h1>
            <p className="mt-1 text-lg text-slate-600">Abre una pregunta y mira la respuesta explicada.</p>
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-5 border-y border-line py-6" aria-label="Buscar preguntas">
        <div className="grid gap-4 md:grid-cols-[minmax(220px,320px)_1fr]">
          <label className="grid gap-2 font-bold text-ink">
            Licencia
            <select
              value={category}
              onChange={(event) => updateCategory(event.target.value)}
              className="min-h-12 rounded-lg border border-line bg-white px-4 text-base font-normal focus:border-brand focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <option value="Todas">Todas las licencias</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.title} · {item.vehicle}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 font-bold text-ink">
            Buscar una palabra
            <span className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Ejemplo: semáforo"
                className="min-h-12 w-full rounded-lg border border-line bg-white pl-12 pr-4 text-base focus:border-brand focus:outline-none focus:ring-4 focus:ring-blue-100"
              />
            </span>
          </label>
        </div>

        <div>
          <p className="mb-2 font-bold text-ink">Tipo de pregunta</p>
          <div className="inline-grid w-full grid-cols-3 rounded-lg border border-line bg-slate-50 p-1 sm:w-auto">
            {[
              { value: 'Todas', label: 'Todas' },
              { value: 'general', label: 'Generales' },
              { value: 'especifica', label: 'Específicas' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={section === item.value}
                onClick={() => {
                  setSection(item.value);
                  setPage(0);
                }}
                className={cn(
                  'min-h-10 rounded-md px-3 text-sm font-bold transition',
                  section === item.value ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:text-ink',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {activeLearningTopic ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-blue-50 px-4 py-3">
            <span className="font-bold text-brand">Tema elegido: {activeLearningTopic.label}</span>
            <Link to={`/banco-preguntas?category=${category}`} className="font-bold text-slate-600 hover:text-brand">
              Ver todos los temas
            </Link>
          </div>
        ) : null}
      </section>

      <div className="mt-7 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-black text-ink">{categoryLabel}</h2>
        <span className="text-sm font-bold text-slate-500">
          {loading ? 'Buscando...' : `${meta.totalElements} preguntas`}
        </span>
      </div>

      <section className="mt-3 border-t border-line" aria-busy={loading}>
        {loading ? <p className="py-10 text-center font-bold text-slate-500">Cargando preguntas...</p> : null}
        {!loading && loadError ? (
          <div className="py-10 text-center">
            <p className="font-bold text-danger">No pudimos cargar las preguntas.</p>
            <p className="mt-1 text-sm text-slate-500">{loadError}</p>
          </div>
        ) : null}
        {!loading && !loadError && !questions.length ? (
          <div className="py-10 text-center">
            <h2 className="text-xl font-black text-ink">No encontramos preguntas</h2>
            <p className="mt-2 text-slate-600">Prueba otra licencia o una palabra más corta.</p>
          </div>
        ) : null}
        {!loading && questions.map((question, index) => (
          <QuestionItem
            key={question.id}
            question={question}
            number={question.numeroPdf ?? page * PAGE_SIZE + index + 1}
          />
        ))}
      </section>

      {!loading && meta.totalPages > 1 ? (
        <nav className="mt-7 flex items-center justify-between gap-3" aria-label="Páginas de preguntas">
          <Button variant="secondary" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={page === 0}>
            <ChevronLeft className="h-5 w-5" />
            Anterior
          </Button>
          <span className="text-sm font-bold text-slate-600">Página {page + 1} de {meta.totalPages}</span>
          <Button
            variant="secondary"
            onClick={() => setPage((current) => Math.min(current + 1, meta.totalPages - 1))}
            disabled={page >= meta.totalPages - 1}
          >
            Siguiente
            <ChevronRight className="h-5 w-5" />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
