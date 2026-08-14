import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Modal from '../components/ui/Modal.jsx';
import { api } from '../services/api.js';
import { cn } from '../utils/cn.js';

const emptyCounts = {
  total: 0,
  pending: 0,
  inProgress: 0,
  attended: 0,
  overdue: 0,
  withoutDeadline: 0,
};

const statusOptions = [
  ['TODOS', 'Todos'],
  ['PENDIENTE', 'Pendientes'],
  ['EN_PROCESO', 'En proceso'],
  ['VENCIDOS', 'Plazo vencido'],
  ['SIN_PLAZO', 'Sin fecha límite'],
  ['ATENDIDO', 'Atendidos'],
];

function formatDate(value, includeTime = false) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'America/Lima',
  }).format(date);
}

function formatMoney(value) {
  if (value == null) return 'No indicado';
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
}

function statusMeta(status) {
  if (status === 'ATENDIDO') return { label: 'Atendido', variant: 'green' };
  if (status === 'EN_PROCESO') return { label: 'En proceso', variant: 'blue' };
  return { label: 'Pendiente', variant: 'orange' };
}

function dueMeta(complaint) {
  if (complaint.status === 'ATENDIDO') return { label: `Respondido ${formatDate(complaint.respondedAt)}`, className: 'text-success' };
  if (complaint.dueState === 'VENCIDO') return { label: `Venció ${formatDate(complaint.responseDeadline)}`, className: 'font-bold text-danger' };
  if (complaint.dueState === 'SIN_PLAZO') return { label: 'Sin fecha límite', className: 'font-bold text-warning' };
  return { label: `Hasta ${formatDate(complaint.responseDeadline)}`, className: 'text-slate-600' };
}

function downloadCsv(csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'reclamaciones-admin.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SummaryButton({ label, value, icon: Icon, tone, active, onClick }) {
  const tones = {
    blue: 'bg-blue-50 text-brand',
    orange: 'bg-amber-50 text-warning',
    red: 'bg-red-50 text-danger',
    green: 'bg-emerald-50 text-success',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-24 items-center gap-3 rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-brand hover:bg-blue-50/40',
        active ? 'border-brand ring-2 ring-blue-100' : 'border-line',
      )}
    >
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', tones[tone])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold uppercase text-slate-500">{label}</span>
        <strong className="mt-1 block text-2xl font-black text-ink">{value}</strong>
      </span>
    </button>
  );
}

function DetailItem({ label, children, className }) {
  return (
    <div className={className}>
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-ink">{children || '-'}</dd>
    </div>
  );
}

export default function AdminComplaintsPage() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState(emptyCounts);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [status, setStatus] = useState('TODOS');
  const [type, setType] = useState('TODOS');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [detailError, setDetailError] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminComplaints({
        page: pagination.page,
        pageSize: pagination.pageSize,
        status,
        type,
        search,
      });
      setItems(data.items ?? []);
      setCounts({ ...emptyCounts, ...(data.counts ?? {}) });
      setPagination((current) => ({ ...current, ...(data.pagination ?? {}) }));
    } catch (requestError) {
      setError(requestError.message || 'No se pudieron cargar las reclamaciones.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, search, status, type]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const changeStatusFilter = (nextStatus) => {
    setStatus(nextStatus);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const openComplaint = async (id) => {
    setDetailLoading(true);
    setDetailError('');
    setResponseText('');
    try {
      const complaint = await api.getAdminComplaint(id);
      setSelected(complaint);
      setResponseText(complaint.response || '');
    } catch (requestError) {
      setError(requestError.message || 'No se pudo abrir la reclamación.');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (nextStatus) => {
    if (!selected) return;
    setSaving(true);
    setDetailError('');
    try {
      const updated = await api.updateAdminComplaintStatus(selected.id, nextStatus);
      setSelected(updated);
      await loadComplaints();
    } catch (requestError) {
      setDetailError(requestError.message || 'No se pudo cambiar el estado.');
    } finally {
      setSaving(false);
    }
  };

  const sendResponse = async () => {
    if (!selected || responseText.trim().length < 10) return;
    setSaving(true);
    setDetailError('');
    try {
      const updated = await api.respondAdminComplaint(selected.id, responseText.trim());
      setSelected(updated);
      setResponseText(updated.response || '');
      await loadComplaints();
    } catch (requestError) {
      setDetailError(requestError.message || 'No se pudo enviar la respuesta.');
    } finally {
      setSaving(false);
    }
  };

  const exportComplaints = async () => {
    setExporting(true);
    setError('');
    try {
      downloadCsv(await api.exportAdminComplaints());
    } catch (requestError) {
      setError(requestError.message || 'No se pudo exportar el libro.');
    } finally {
      setExporting(false);
    }
  };

  const closeDetail = () => {
    if (saving) return;
    setSelected(null);
    setDetailError('');
    setResponseText('');
  };

  const applySearch = (event) => {
    event.preventDefault();
    setPagination((current) => ({ ...current, page: 1 }));
    setSearch(searchInput.trim());
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-soft">
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 font-bold text-brand hover:underline">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Volver al panel
            </Link>
            <div className="mt-2 flex items-center gap-2 text-sm font-black uppercase text-brand">
              <BookOpen className="h-5 w-5" aria-hidden="true" /> Administración
            </div>
            <h1 className="mt-1 font-display text-3xl font-black text-ink">Libro de Reclamaciones</h1>
            <p className="mt-2 max-w-3xl text-slate-600">Revisa cada solicitud, controla el plazo y responde al consumidor desde un solo lugar.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button variant="secondary" size="sm" onClick={exportComplaints} disabled={exporting}>
              <Download className="h-4 w-4" aria-hidden="true" /> {exporting ? 'Exportando...' : 'Exportar'}
            </Button>
            <Button variant="secondary" size="sm" onClick={loadComplaints} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" /> Actualizar
            </Button>
          </div>
        </header>

        <section aria-label="Resumen de reclamaciones" className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <SummaryButton label="Total" value={counts.total} icon={BookOpen} tone="slate" active={status === 'TODOS'} onClick={() => changeStatusFilter('TODOS')} />
          <SummaryButton label="Pendientes" value={counts.pending} icon={Clock3} tone="orange" active={status === 'PENDIENTE'} onClick={() => changeStatusFilter('PENDIENTE')} />
          <SummaryButton label="En proceso" value={counts.inProgress} icon={RefreshCw} tone="blue" active={status === 'EN_PROCESO'} onClick={() => changeStatusFilter('EN_PROCESO')} />
          <SummaryButton label="Vencidos" value={counts.overdue} icon={AlertTriangle} tone="red" active={status === 'VENCIDOS'} onClick={() => changeStatusFilter('VENCIDOS')} />
          <SummaryButton label="Sin plazo" value={counts.withoutDeadline} icon={AlertTriangle} tone="orange" active={status === 'SIN_PLAZO'} onClick={() => changeStatusFilter('SIN_PLAZO')} />
          <SummaryButton label="Atendidos" value={counts.attended} icon={CheckCircle2} tone="green" active={status === 'ATENDIDO'} onClick={() => changeStatusFilter('ATENDIDO')} />
        </section>

        {error ? <div className="border-l-4 border-danger bg-red-50 px-4 py-3 font-bold text-danger" role="alert">{error}</div> : null}

        <Card className="overflow-hidden shadow-sm">
          <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[minmax(240px,1fr)_190px_170px] sm:p-5">
            <form className="flex min-w-0 gap-2" onSubmit={applySearch}>
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Buscar reclamación</span>
                <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="min-h-12 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-base outline-none focus:border-brand focus:ring-4 focus:ring-blue-100"
                  placeholder="Código, nombre, correo o documento"
                  maxLength={80}
                />
              </label>
              <Button type="submit" size="sm" aria-label="Buscar"><Search className="h-5 w-5" /></Button>
            </form>
            <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
              Estado
              <select value={status} onChange={(event) => changeStatusFilter(event.target.value)} className="min-h-12 rounded-lg border border-line bg-white px-3 text-base font-semibold normal-case text-ink focus:border-brand">
                {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
              Tipo
              <select value={type} onChange={(event) => { setType(event.target.value); setPagination((current) => ({ ...current, page: 1 })); }} className="min-h-12 rounded-lg border border-line bg-white px-3 text-base font-semibold normal-case text-ink focus:border-brand">
                <option value="TODOS">Todos</option>
                <option value="RECLAMO">Reclamos</option>
                <option value="QUEJA">Quejas</option>
              </select>
            </label>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Solicitud</th>
                  <th className="px-3 py-3">Consumidor</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Plazo</th>
                  <th className="px-4 py-3 text-right">Abrir</th>
                </tr>
              </thead>
              <tbody>
                {items.map((complaint) => {
                  const currentStatus = statusMeta(complaint.status);
                  const due = dueMeta(complaint);
                  return (
                    <tr key={complaint.id} className="border-t border-line hover:bg-blue-50/40">
                      <td className="px-4 py-3"><strong className="block text-ink">{complaint.number}</strong><span className="text-xs text-slate-500">{formatDate(complaint.registeredAt, true)}</span></td>
                      <td className="max-w-[280px] px-3 py-3"><strong className="block truncate text-ink">{complaint.fullName}</strong><span className="block truncate text-xs text-slate-500">{complaint.email}</span></td>
                      <td className="px-3 py-3"><Badge variant={complaint.complaintType === 'RECLAMO' ? 'violet' : 'slate'}>{complaint.complaintType}</Badge></td>
                      <td className="px-3 py-3"><Badge variant={currentStatus.variant}>{currentStatus.label}</Badge></td>
                      <td className={cn('px-3 py-3', due.className)}>{due.label}</td>
                      <td className="px-4 py-3 text-right"><Button variant="secondary" size="sm" onClick={() => openComplaint(complaint.id)} disabled={detailLoading}><Eye className="h-4 w-4" aria-hidden="true" /> Ver</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-line md:hidden">
            {items.map((complaint) => {
              const currentStatus = statusMeta(complaint.status);
              const due = dueMeta(complaint);
              return (
                <article key={complaint.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><strong className="block text-ink">{complaint.number}</strong><p className="mt-1 truncate text-sm font-semibold text-slate-700">{complaint.fullName}</p><p className="truncate text-xs text-slate-500">{complaint.email}</p></div>
                    <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><Badge variant={complaint.complaintType === 'RECLAMO' ? 'violet' : 'slate'}>{complaint.complaintType}</Badge><span className={due.className}>{due.label}</span></div>
                  <Button className="mt-4 w-full" variant="secondary" size="sm" onClick={() => openComplaint(complaint.id)} disabled={detailLoading}><Eye className="h-4 w-4" /> Ver y responder</Button>
                </article>
              );
            })}
          </div>

          {loading ? <div className="grid min-h-48 place-items-center border-t border-line text-sm font-bold text-slate-500"><LoaderCircle className="h-6 w-6 animate-spin text-brand" aria-hidden="true" /> Cargando reclamaciones...</div> : null}
          {!loading && !items.length ? <div className="grid min-h-48 place-items-center border-t border-line px-4 text-center font-semibold text-slate-500">No hay reclamaciones con estos filtros.</div> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-4 text-sm sm:px-5">
            <p className="font-semibold text-slate-500">{pagination.total} registros · página {pagination.page} de {pagination.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))} disabled={loading || pagination.page <= 1} aria-label="Página anterior"><ChevronLeft className="h-5 w-5" /></Button>
              <Button variant="secondary" size="sm" onClick={() => setPagination((current) => ({ ...current, page: Math.min(current.totalPages, current.page + 1) }))} disabled={loading || pagination.page >= pagination.totalPages} aria-label="Página siguiente"><ChevronRight className="h-5 w-5" /></Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={Boolean(selected)} title={selected ? `${selected.complaintType === 'QUEJA' ? 'Queja' : 'Reclamo'} ${selected.number}` : 'Reclamación'} onClose={closeDetail} showAction={false} className="max-w-5xl" childrenClassName="text-base leading-7">
        {selected ? (
          <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusMeta(selected.status).variant}>{statusMeta(selected.status).label}</Badge>
                <span className={cn('text-sm', dueMeta(selected).className)}>{dueMeta(selected).label}</span>
              </div>
              {selected.status !== 'ATENDIDO' ? (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => updateStatus('PENDIENTE')} disabled={saving || selected.status === 'PENDIENTE'}>Pendiente</Button>
                  <Button variant="secondary" size="sm" onClick={() => updateStatus('EN_PROCESO')} disabled={saving || selected.status === 'EN_PROCESO'}>En proceso</Button>
                </div>
              ) : null}
            </div>

            {(selected.dueState === 'VENCIDO' || selected.dueState === 'SIN_PLAZO') && selected.status !== 'ATENDIDO' ? (
              <div className="flex gap-3 border-l-4 border-danger bg-red-50 px-4 py-3 text-sm text-red-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><p><strong>Atención prioritaria.</strong> Esta solicitud necesita respuesta inmediata.</p></div>
            ) : null}

            <section aria-labelledby="consumer-title">
              <h3 id="consumer-title" className="flex items-center gap-2 font-display text-xl font-black text-ink"><UserRound className="h-6 w-6 text-brand" /> Consumidor</h3>
              <dl className="mt-4 grid gap-4 border-y border-line py-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem label="Nombre" className="lg:col-span-2">{selected.fullName}</DetailItem>
                <DetailItem label="Documento">{selected.documentType} {selected.documentNumber}</DetailItem>
                <DetailItem label="Fecha del hecho">{formatDate(selected.incidentDate)}</DetailItem>
                <DetailItem label="Correo"><a className="inline-flex items-center gap-1 text-brand hover:underline" href={`mailto:${selected.email}`}><Mail className="h-4 w-4" />{selected.email}</a></DetailItem>
                <DetailItem label="Teléfono"><a className="inline-flex items-center gap-1 text-brand hover:underline" href={`tel:${selected.phone}`}><Phone className="h-4 w-4" />{selected.phone}</a></DetailItem>
                <DetailItem label="Dirección" className="sm:col-span-2"><span className="inline-flex items-start gap-1"><MapPin className="mt-1 h-4 w-4 shrink-0 text-brand" />{[selected.address, selected.district, selected.province, selected.department].filter(Boolean).join(', ')}</span></DetailItem>
              </dl>
            </section>

            <section aria-labelledby="request-title">
              <h3 id="request-title" className="font-display text-xl font-black text-ink">Solicitud</h3>
              <dl className="mt-4 grid gap-4 border-y border-line py-4 sm:grid-cols-3">
                <DetailItem label="Servicio" className="sm:col-span-2">{selected.serviceDescription}</DetailItem>
                <DetailItem label="Monto relacionado">{formatMoney(selected.amount)}</DetailItem>
                <DetailItem label="Detalle" className="sm:col-span-3"><p className="whitespace-pre-wrap font-normal leading-7 text-slate-700">{selected.details}</p></DetailItem>
                <DetailItem label="Solución solicitada" className="sm:col-span-3"><p className="whitespace-pre-wrap font-normal leading-7 text-slate-700">{selected.request}</p></DetailItem>
              </dl>
            </section>

            {selected.status === 'ATENDIDO' ? (
              <section aria-labelledby="answer-title" className="border-l-4 border-success bg-emerald-50 px-4 py-4">
                <h3 id="answer-title" className="flex items-center gap-2 font-display text-xl font-black text-emerald-950"><CheckCircle2 className="h-6 w-6" /> Respuesta enviada</h3>
                <p className="mt-3 whitespace-pre-wrap text-slate-700">{selected.response}</p>
                <p className="mt-4 text-sm font-semibold text-emerald-900">Enviada el {formatDate(selected.responseSentAt || selected.respondedAt, true)} por {selected.respondedBy || 'Administrador'}.</p>
                {selected.responseEmailId ? <p className="mt-1 break-all text-xs text-emerald-800">Constancia de correo: {selected.responseEmailId}</p> : null}
              </section>
            ) : (
              <section aria-labelledby="answer-title">
                <h3 id="answer-title" className="flex items-center gap-2 font-display text-xl font-black text-ink"><Send className="h-6 w-6 text-brand" /> Responder y cerrar</h3>
                <p className="mt-2 text-sm text-slate-600">La respuesta se enviará a <strong>{selected.email}</strong>. El reclamo se marcará como atendido únicamente después de confirmar el envío.</p>
                <label className="mt-4 grid gap-2 font-bold text-ink">
                  Respuesta formal
                  <textarea
                    value={responseText}
                    onChange={(event) => setResponseText(event.target.value)}
                    maxLength={4000}
                    className="min-h-40 rounded-lg border border-line bg-white p-4 font-normal text-ink outline-none focus:border-brand focus:ring-4 focus:ring-blue-100"
                    placeholder="Explica las medidas adoptadas o fundamenta la respuesta al consumidor."
                  />
                  <span className="text-right text-xs font-semibold text-slate-500">{responseText.length}/4000</span>
                </label>
                {selected.lastEmailError ? <div className="mt-3 border-l-4 border-danger bg-red-50 px-4 py-3 text-sm text-red-900"><strong>Último envío fallido:</strong> {selected.lastEmailError}</div> : null}
                {detailError ? <div className="mt-3 border-l-4 border-danger bg-red-50 px-4 py-3 text-sm font-bold text-danger" role="alert">{detailError}</div> : null}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={closeDetail} disabled={saving}>Cancelar</Button>
                  <Button variant="success" onClick={sendResponse} disabled={saving || responseText.trim().length < 10}>
                    {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} {saving ? 'Enviando...' : 'Enviar respuesta y cerrar'}
                  </Button>
                </div>
              </section>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
