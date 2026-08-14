import { ArrowDownAZ, ArrowLeft, ArrowUpAZ, CheckCircle2, Image as ImageIcon, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaginationControls } from '../components/admin/AdminTableControls.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { OptionContent, QuestionImage } from '../components/ui/QuestionMedia.jsx';
import { api } from '../services/api.js';
import { cn } from '../utils/cn.js';

const sortOptions = [
  ['numeroPdf', 'Número oficial'],
  ['id', 'ID interno'],
  ['tema', 'Tema'],
  ['dificultad', 'Dificultad'],
];

function categoryLabel(categories, id) {
  if (!id) return 'Todas las categorías';
  return categories.find((category) => String(category.id) === String(id))?.title || `Categoría ${id}`;
}

function QuestionReview({ question }) {
  const explanation = String(question.explicacion || question.fundamento || '').trim();

  return (
    <article className="border-b border-line bg-white px-4 py-6 last:border-b-0 sm:px-6">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="blue">{question.numeroPdf ? `N.º oficial ${question.numeroPdf}` : 'Sin N.º oficial'}</Badge>
            <Badge variant="slate">ID interno {question.id}</Badge>
            <Badge variant="violet">{question.tema || 'Sin tema'}</Badge>
            {question.tipoSeccion ? <Badge variant="orange">{question.tipoSeccion}</Badge> : null}
          </div>
          <h2 className="whitespace-pre-wrap break-words font-display text-xl font-black leading-8 text-ink sm:text-2xl">{question.texto}</h2>

          <div className="mt-5 grid gap-2">
            {(question.opciones || []).map((option, optionIndex) => (
              <div key={option.id} className={cn('flex min-h-14 items-start gap-3 rounded-lg border px-3 py-3', option.esCorrecta ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-line bg-white text-slate-700')}>
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full font-black', option.esCorrecta ? 'bg-success text-white' : 'bg-slate-100 text-slate-600')}>
                  {option.esCorrecta ? <CheckCircle2 className="h-5 w-5" aria-label="Correcta" /> : String.fromCharCode(65 + optionIndex)}
                </span>
                <OptionContent option={option} />
              </div>
            ))}
          </div>

          <div className="mt-4 border-l-4 border-brand bg-blue-50 px-4 py-3 text-sm leading-6 text-slate-700 sm:text-base">
            <strong className="block text-ink">Explicación registrada</strong>
            <p className="mt-1 whitespace-pre-wrap break-words">{explanation || 'Esta pregunta no tiene explicación registrada.'}</p>
          </div>
          {question.fundamento && question.fundamento !== question.explicacion ? (
            <p className="mt-3 text-sm leading-6 text-slate-600"><strong>Fundamento:</strong> {question.fundamento}</p>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-24">
          {question.imagenBase64 ? (
            <QuestionImage src={question.imagenBase64} alt={`Imagen de la pregunta ${question.numeroPdf ?? question.id}`} className="min-h-[240px] bg-slate-50 sm:min-h-[300px]" imgClassName="max-h-[360px]" />
          ) : (
            <div className="grid min-h-[180px] place-items-center rounded-lg border border-dashed border-line bg-slate-50 px-6 text-center text-sm font-semibold text-slate-500">
              <span><ImageIcon className="mx-auto mb-2 h-7 w-7" aria-hidden="true" />Pregunta sin imagen</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AdminQuestionBankPage() {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [section, setSection] = useState('Todas');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('numeroPdf');
  const [direction, setDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, size: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const selectedCategoryLabel = useMemo(() => categoryLabel(categories, category), [categories, category]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getQuestionBank({
        categoryId: category || undefined,
        categoryLabel: selectedCategoryLabel,
        search,
        section,
        page: page - 1,
        size,
        sort,
        direction,
      });
      setQuestions(data.content || []);
      setPagination({ page, size, total: data.totalElements || 0, totalPages: Math.max(data.totalPages || 0, 1) });
    } catch (requestError) {
      setQuestions([]);
      setPagination({ page, size, total: 0, totalPages: 1 });
      setError(requestError.message || 'No se pudo cargar el banco de preguntas.');
    } finally {
      setLoading(false);
    }
  }, [category, direction, page, search, section, selectedCategoryLabel, size, sort]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const resetPage = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-soft">
      <div className="mx-auto grid max-w-[1280px] gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="border-b border-line pb-5">
          <Button as={Link} to="/admin" variant="ghost" size="sm" className="mb-2 -ml-3"><ArrowLeft className="h-4 w-4" /> Panel administrador</Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h1 className="font-display text-3xl font-black text-ink">Banco de preguntas</h1><p className="mt-2 text-slate-600">Revisa el texto completo, alternativas, respuesta, explicación e imagen por categoría.</p></div>
            <Button variant="secondary" size="sm" onClick={loadQuestions} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />Actualizar</Button>
          </div>
        </header>

        <Card className="grid min-w-0 gap-4 overflow-hidden p-4 shadow-sm lg:grid-cols-[minmax(180px,0.7fr)_minmax(180px,0.6fr)_minmax(240px,1fr)_minmax(180px,0.7fr)_auto] lg:items-end">
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-ink">Categoría
            <select value={category} onChange={(event) => resetPage(setCategory, event.target.value)} className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-line bg-white px-3 font-semibold"><option value="">Todas</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.vehicle}</option>)}</select>
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-ink">Sección
            <select value={section} onChange={(event) => resetPage(setSection, event.target.value)} className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-line bg-white px-3 font-semibold"><option value="Todas">Todas</option><option value="general">General</option><option value="especifica">Específica</option></select>
          </label>
          <form className="grid min-w-0 gap-1.5" onSubmit={(event) => { event.preventDefault(); resetPage(setSearch, searchInput.trim()); }}>
            <span className="text-sm font-bold text-ink">Buscar</span>
            <span className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Texto, tema o fundamento" className="min-h-11 w-full rounded-lg border border-line pl-10 pr-3" /></span>
          </form>
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-ink">Ordenar por
            <select value={sort} onChange={(event) => resetPage(setSort, event.target.value)} className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-line bg-white px-3 font-semibold">{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => resetPage(setDirection, direction === 'asc' ? 'desc' : 'asc')} title={direction === 'asc' ? 'Orden ascendente' : 'Orden descendente'}>{direction === 'asc' ? <ArrowDownAZ className="h-5 w-5" /> : <ArrowUpAZ className="h-5 w-5" />}</Button>
            <Button size="sm" onClick={() => { setPage(1); setSearch(searchInput.trim()); }}>Aplicar</Button>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"><div className="min-w-0"><h2 className="break-words font-display text-xl font-black text-ink">{selectedCategoryLabel}</h2><p className="text-sm text-slate-500">{pagination.total} preguntas encontradas</p></div><Badge variant="blue">Página {pagination.page} de {pagination.totalPages}</Badge></div>
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-bold text-danger" role="alert">{error}</div> : null}

        <Card className="overflow-hidden shadow-sm" aria-busy={loading}>
          {loading ? <p className="px-4 py-16 text-center font-bold text-slate-500">Cargando preguntas...</p> : null}
          {!loading && !questions.length ? <p className="px-4 py-16 text-center font-bold text-slate-500">No hay preguntas que coincidan con los filtros.</p> : null}
          {!loading && questions.map((question) => <QuestionReview key={question.id} question={question} />)}
          <PaginationControls pagination={pagination} disabled={loading} onPageChange={setPage} onSizeChange={(nextSize) => { setSize(nextSize); setPage(1); }} />
        </Card>
      </div>
    </div>
  );
}
