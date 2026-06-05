import { ChevronLeft, ChevronRight, Image as ImageIcon, Layers3, ListFilter, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { OptionContent, QuestionImage } from '../components/ui/QuestionMedia.jsx';
import Select from '../components/ui/Select.jsx';
import { api } from '../services/api.js';
import { cn } from '../utils/cn.js';
import { getLearningTopicById } from '../utils/learningTopics.js';

const sectionLabels = {
  general: 'General',
  especifica: 'Específica',
};

function getCategoryLabel(categories, category) {
  if (!category || category === 'Todas') return 'Todas';
  return categories.find((item) => String(item.id) === String(category))?.title ?? String(category);
}

function QuestionExplanation({ question }) {
  const explanation = (question.explicacion || question.fundamento || '').trim();
  const alreadyIncludesAnswer = /^respuesta correcta\s*:/i.test(explanation);
  const answer = String(question.respuestaCorrecta ?? '').replace(/[.\s]+$/, '');

  if (alreadyIncludesAnswer) {
    return explanation;
  }

  return (
    <>
      {answer ? <strong className="text-brand">Respuesta correcta: {answer}.</strong> : null} {explanation || 'Sin fundamento registrado para esta pregunta.'}
    </>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const end = Math.min(totalPages - 1, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page === 0}>
        <ChevronLeft className="h-4 w-4" /> Anterior
      </Button>
      <div className="flex flex-wrap justify-center gap-2">
        {start > 0 ? (
          <>
            <button className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-white text-sm font-black text-slate-600" onClick={() => onPageChange(0)}>1</button>
            {start > 1 ? <span className="grid h-10 place-items-center px-1 text-sm font-black text-slate-400">...</span> : null}
          </>
        ) : null}
        {pages.map((item) => (
          <button
            key={item}
            className={cn(
              'grid h-10 w-10 place-items-center rounded-lg border text-sm font-black transition',
              item === page ? 'border-brand bg-brand text-white' : 'border-line bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50',
            )}
            onClick={() => onPageChange(item)}
          >
            {item + 1}
          </button>
        ))}
        {end < totalPages - 1 ? (
          <>
            {end < totalPages - 2 ? <span className="grid h-10 place-items-center px-1 text-sm font-black text-slate-400">...</span> : null}
            <button className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-white text-sm font-black text-slate-600" onClick={() => onPageChange(totalPages - 1)}>{totalPages}</button>
          </>
        ) : null}
      </div>
      <Button variant="secondary" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1}>
        Siguiente <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function QuestionCard({ question, categoryLabel, index, page, pageSize, open, onToggle }) {
  const section = sectionLabels[question.tipoSeccion] ?? 'Sección oficial';
  const optionMediaCount = question.opciones.filter((option) => option.mediaData).length;

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-4 p-4 sm:grid-cols-[92px_1fr_auto] sm:p-5">
        <div className="grid h-20 w-20 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-center">
          <span>
            <span className="block text-xs font-black uppercase text-brand">Pregunta</span>
            <strong className="block text-2xl font-black text-ink">{question.numeroPdf ?? page * pageSize + index + 1}</strong>
          </span>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge>{categoryLabel === 'Todas' ? 'Banco oficial' : categoryLabel}</Badge>
            <Badge variant={question.tipoSeccion === 'especifica' ? 'violet' : 'slate'}>{section}</Badge>
            {question.imagenBase64 || optionMediaCount ? <Badge variant="orange"><ImageIcon className="h-3.5 w-3.5" /> Con imagen</Badge> : null}
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{question.tema}</p>
          <h2 className="mt-2 text-lg font-black leading-snug text-ink">{question.texto}</h2>
          {question.imagenBase64 ? (
            <QuestionImage src={question.imagenBase64} className="mt-4 max-h-64 min-h-[160px]" imgClassName="max-h-56" />
          ) : null}
        </div>

        <div className="flex items-start sm:justify-end">
          <Button variant={open ? 'primary' : 'secondary'} onClick={onToggle} className="w-full sm:w-auto">
            {open ? 'Ocultar' : 'Ver opciones'}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-slate-50 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-2">
            {question.opciones.map((option, optionIndex) => (
              <div
                key={option.id}
                className={cn(
                  'flex min-w-0 items-start gap-3 rounded-lg border bg-white p-3 text-sm leading-6',
                  option.esCorrecta ? 'border-emerald-200 bg-emerald-50' : 'border-line',
                )}
              >
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black', option.esCorrecta ? 'bg-success text-white' : 'bg-blue-50 text-brand')}>
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <div className="min-w-0 flex-1">
                  <OptionContent option={option} className={option.esCorrecta ? 'text-emerald-800' : ''} />
                  {option.esCorrecta ? <span className="mt-2 inline-flex rounded-full bg-white px-2 py-0.5 text-xs font-black text-success">Correcta</span> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-blue-100 bg-white p-4 text-sm leading-6 text-slate-700">
            <QuestionExplanation question={question} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export default function QuestionBankPage() {
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState(searchParams.get('category') ?? 'Todas');
  const [section, setSection] = useState('Todas');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [learningTopicId, setLearningTopicId] = useState(searchParams.get('topic') ?? '');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [openQuestion, setOpenQuestion] = useState(null);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [meta, setMeta] = useState({ totalElements: 0, totalPages: 0, number: 0, size: 12 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => null);
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
    api.getQuestionBank({
      categoryId: category,
      categoryLabel,
      search,
      learningTopic: activeLearningTopic?.id ?? '',
      section,
      page,
      size: pageSize,
    }).then((data) => {
      if (cancelled) return;
      setQuestions(data.content ?? []);
      setMeta({
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        number: data.number ?? page,
        size: data.size ?? pageSize,
      });
      setOpenQuestion(null);
    }).catch(() => {
      if (!cancelled) {
        setQuestions([]);
        setMeta({ totalElements: 0, totalPages: 0, number: 0, size: pageSize });
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeLearningTopic?.id, category, categoryLabel, page, pageSize, search, section]);

  const firstItem = meta.totalElements ? page * pageSize + 1 : 0;
  const lastItem = Math.min((page + 1) * pageSize, meta.totalElements);

  const updateCategory = (nextCategory) => {
    setCategory(String(nextCategory));
    setPage(0);
  };

  return (
    <div className="grid min-w-0 gap-5 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-black">Banco de preguntas</h1>
          <p className="mt-2 text-slate-600">Preguntas oficiales organizadas por categoría, sección y número de balotario.</p>
        </div>
        <div className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-bold text-slate-600">
          {loading ? 'Cargando...' : `${meta.totalElements} preguntas`}
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="grid gap-4">
          <div className="flex items-center gap-2 text-sm font-black text-ink"><Layers3 className="h-5 w-5 text-brand" /> Categoría</div>
          <div className="flex flex-wrap gap-2">
            <button
              className={cn('h-10 rounded-lg border px-4 text-sm font-black transition', category === 'Todas' ? 'border-brand bg-brand text-white' : 'border-line bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50')}
              onClick={() => updateCategory('Todas')}
            >
              Todas
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                className={cn('h-10 rounded-lg border px-4 text-sm font-black transition', String(category) === String(item.id) ? 'border-brand bg-brand text-white' : 'border-line bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50')}
                onClick={() => updateCategory(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-[1fr_190px_170px]">
            <div className="relative min-w-0">
              <Search className="absolute left-4 top-3 h-5 w-5 text-slate-400" />
              <Input
                className="w-full pl-12"
                placeholder="Buscar por texto, señal o palabra clave..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
              />
            </div>
            <Select value={section} onChange={(event) => { setSection(event.target.value); setPage(0); }}>
              <option value="Todas">Todas las secciones</option>
              <option value="general">General</option>
              <option value="especifica">Específica</option>
            </Select>
            <Select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }}>
              <option value={12}>12 por página</option>
              <option value={24}>24 por página</option>
              <option value={50}>50 por página</option>
            </Select>
          </div>

          {activeLearningTopic ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
              <span className="font-bold text-brand">Practicando tema: {activeLearningTopic.label}</span>
              <Link to={`/banco-preguntas?category=${category}`} className="font-black text-slate-600 hover:text-brand">Quitar filtro</Link>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2 font-bold"><ListFilter className="h-4 w-4 text-brand" /> {categoryLabel === 'Todas' ? 'Todas las categorías' : categoryLabel}</span>
        <span>{loading ? 'Actualizando resultados...' : `Mostrando ${firstItem}-${lastItem} de ${meta.totalElements}`}</span>
      </div>

      <div className="grid gap-4">
        {loading ? <Card className="p-5 text-center font-bold text-slate-500">Cargando preguntas...</Card> : null}
        {!loading && !questions.length ? (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-black">No encontramos preguntas</h2>
            <p className="mt-2 text-sm text-slate-600">Prueba con otra categoría, sección o palabra clave.</p>
          </Card>
        ) : null}
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            categoryLabel={categoryLabel}
            index={index}
            page={page}
            pageSize={pageSize}
            open={openQuestion === question.id}
            onToggle={() => setOpenQuestion(openQuestion === question.id ? null : question.id)}
          />
        ))}
      </div>

      {!loading ? (
        <Pagination page={page} totalPages={meta.totalPages} onPageChange={(nextPage) => setPage(Math.max(0, Math.min(nextPage, meta.totalPages - 1)))} />
      ) : null}
    </div>
  );
}
