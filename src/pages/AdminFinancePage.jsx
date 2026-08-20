import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileText,
  RefreshCw,
  Scale,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaginationControls, SortableTh } from '../components/admin/AdminTableControls.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { api } from '../services/api.js';
import { cn } from '../utils/cn.js';

function dateString(date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
}

function initialRange() {
  const today = new Date();
  return { from: dateString(new Date(today.getFullYear(), today.getMonth(), 1)), to: dateString(today) };
}

function presetRange(preset) {
  const today = new Date();
  if (preset === 'today') return { from: dateString(today), to: dateString(today) };
  if (preset === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { from: dateString(yesterday), to: dateString(yesterday) };
  }
  if (preset === 'previousMonth') {
    return {
      from: dateString(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: dateString(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }
  return initialRange();
}

function formatPEN(value) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
  }).format(new Date(value));
}

function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function statusVariant(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('conciliado') || value.includes('aceptado') || value.includes('exitoso')) return 'green';
  if (value.includes('error') || value.includes('rechazado') || value.includes('diferente')) return 'red';
  if (value.includes('solo') || value.includes('pendiente') || value.includes('procesando')) return 'orange';
  return 'slate';
}

function EmptyRow({ columns, children }) {
  return <tr><td colSpan={columns} className="px-4 py-10 text-center font-semibold text-slate-500">{children}</td></tr>;
}

function ReceiptDownloads({ receipt, onError, onUpdated }) {
  const [loading, setLoading] = useState('');

  const openFile = async (type) => {
    setLoading(type);
    onError('');
    try {
      const detail = await api.getAdminReceipt(receipt.id);
      const url = detail.urls?.[type];
      if (!url) throw new Error(`El archivo ${type.toUpperCase()} aún no está disponible.`);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      onError(error.message || 'No se pudo abrir el comprobante.');
    } finally {
      setLoading('');
    }
  };

  const retry = async () => {
    setLoading('retry');
    onError('');
    try {
      const result = await api.retryAdminReceipt(receipt.id);
      if (!result.success) throw new Error('SUNAT todavía no aceptó el comprobante.');
      await onUpdated();
    } catch (error) {
      onError(error.message || 'No se pudo reintentar el comprobante.');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {!receipt.files?.pdf ? <button type="button" onClick={retry} disabled={Boolean(loading)} className="min-h-9 rounded-md border border-line bg-white px-2 text-xs font-black text-brand hover:bg-blue-50 disabled:opacity-60">{loading === 'retry' ? '...' : 'Reintentar'}</button> : null}
      {['pdf', 'xml', 'cdr'].map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => openFile(type)}
          disabled={!receipt.files?.[type] || Boolean(loading)}
          className="min-h-9 rounded-md border border-line bg-white px-2 text-xs font-black uppercase text-brand hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"
          title={receipt.files?.[type] ? `Abrir ${type.toUpperCase()}` : `${type.toUpperCase()} no disponible`}
        >
          {loading === type ? '...' : type}
        </button>
      ))}
    </div>
  );
}

export default function AdminFinancePage() {
  const [tab, setTab] = useState('payments');
  const [rangeInput, setRangeInput] = useState(initialRange);
  const [range, setRange] = useState(initialRange);
  const [payments, setPayments] = useState({ items: [], pagination: { page: 1, size: 20, total: 0, totalPages: 1 } });
  const [receipts, setReceipts] = useState({ items: [], pagination: { page: 1, size: 20, total: 0, totalPages: 1 } });
  const [reconciliation, setReconciliation] = useState(null);
  const [paymentQuery, setPaymentQuery] = useState({ page: 1, size: 20, sort: 'date', direction: 'desc', search: '' });
  const [receiptQuery, setReceiptQuery] = useState({ page: 1, size: 20, sort: 'date', direction: 'desc', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPayments(await api.getAdminPayments({ ...range, ...paymentQuery }));
    } catch (requestError) {
      setError(requestError.message || 'No se pudieron cargar los pagos.');
    } finally {
      setLoading(false);
    }
  }, [paymentQuery, range]);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReceipts(await api.getAdminReceipts({ ...range, ...receiptQuery }));
    } catch (requestError) {
      setError(requestError.message || 'No se pudieron cargar los comprobantes.');
    } finally {
      setLoading(false);
    }
  }, [range, receiptQuery]);

  useEffect(() => {
    if (tab === 'payments') loadPayments();
    if (tab === 'receipts') loadReceipts();
  }, [loadPayments, loadReceipts, tab]);

  const sortTable = (kind, field) => {
    const setter = kind === 'payments' ? setPaymentQuery : setReceiptQuery;
    setter((current) => ({
      ...current,
      page: 1,
      sort: field,
      direction: current.sort === field && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const applyRange = (next = rangeInput) => {
    setRange(next);
    setRangeInput(next);
    setPaymentQuery((current) => ({ ...current, page: 1 }));
    setReceiptQuery((current) => ({ ...current, page: 1 }));
    setReconciliation(null);
  };

  const reconcile = async () => {
    setReconciling(true);
    setError('');
    try {
      setReconciliation(await api.getAdminReconciliation(range));
      setTab('reconciliation');
    } catch (requestError) {
      setError(requestError.message || 'No se pudo conciliar con Culqi.');
    } finally {
      setReconciling(false);
    }
  };

  const exportReport = async (type) => {
    setExporting(type);
    setError('');
    try {
      const csv = await api.exportAdminFinance(type, range);
      downloadCsv(`${type}-${range.from}-${range.to}.csv`, csv);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo descargar el reporte.');
    } finally {
      setExporting('');
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const value = searchInput.trim();
    if (tab === 'receipts') setReceiptQuery((current) => ({ ...current, page: 1, search: value }));
    else setPaymentQuery((current) => ({ ...current, page: 1, search: value }));
  };

  const paymentSort = paymentQuery.sort;
  const receiptSort = receiptQuery.sort;

  return (
    <div className="min-h-[calc(100vh-73px)] bg-soft">
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Button as={Link} to="/admin" variant="ghost" size="sm" className="mb-2 -ml-3">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Panel administrador
            </Button>
            <h1 className="font-display text-3xl font-black text-ink">Finanzas y conciliación</h1>
            <p className="mt-2 text-slate-600">Pagos, comprobantes electrónicos y cuadre directo con Culqi.</p>
          </div>
          <Button onClick={reconcile} disabled={reconciling}>
            <Scale className={cn('h-5 w-5', reconciling && 'animate-pulse')} aria-hidden="true" />
            {reconciling ? 'Conciliando...' : 'Conciliar con Culqi'}
          </Button>
        </header>

        <section className="grid gap-3 border-y border-line bg-white px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-end" aria-label="Rango del reporte">
          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <label className="grid gap-1.5 text-sm font-bold text-ink">Desde
              <input type="date" value={rangeInput.from} max={rangeInput.to} onChange={(event) => setRangeInput((current) => ({ ...current, from: event.target.value }))} className="min-h-11 rounded-lg border border-line px-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-ink">Hasta
              <input type="date" value={rangeInput.to} min={rangeInput.from} onChange={(event) => setRangeInput((current) => ({ ...current, to: event.target.value }))} className="min-h-11 rounded-lg border border-line px-3" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['today', 'Hoy'], ['yesterday', 'Ayer'], ['month', 'Mes actual'], ['previousMonth', 'Mes anterior'],
            ].map(([value, label]) => (
              <Button key={value} variant="secondary" size="sm" onClick={() => applyRange(presetRange(value))}>{label}</Button>
            ))}
            <Button size="sm" onClick={() => applyRange()}>Aplicar rango</Button>
          </div>
        </section>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-bold text-danger" role="alert">{error}</div> : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-grid grid-cols-3 rounded-lg border border-line bg-slate-100 p-1">
            {[
              ['payments', 'Pagos'], ['receipts', 'Comprobantes'], ['reconciliation', 'Conciliación'],
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setTab(value)} className={cn('min-h-10 rounded-md px-3 text-sm font-black', tab === value ? 'bg-white text-brand shadow-sm' : 'text-slate-600')}>{label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => exportReport('payments')} disabled={Boolean(exporting)}><Download className="h-4 w-4" /> Pagos CSV</Button>
            <Button variant="secondary" size="sm" onClick={() => exportReport('receipts')} disabled={Boolean(exporting)}><Download className="h-4 w-4" /> Comprobantes CSV</Button>
            <Button variant="secondary" size="sm" onClick={() => exportReport('reconciliation')} disabled={Boolean(exporting)}><Download className="h-4 w-4" /> Cuadre CSV</Button>
          </div>
        </div>

        {tab !== 'reconciliation' ? (
          <form className="flex gap-2" onSubmit={submitSearch}>
            <label className="relative min-w-0 flex-1 sm:max-w-md">
              <span className="sr-only">Buscar en finanzas</span>
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={tab === 'receipts' ? 'Cliente, documento o serie' : 'Correo o ID de cargo Culqi'} className="min-h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3" />
            </label>
            <Button variant="secondary" size="sm" type="submit">Buscar</Button>
          </form>
        ) : null}

        {tab === 'payments' ? (
          <Card className="overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-4 py-4">
              <div className="flex items-center gap-3"><CircleDollarSign className="h-5 w-5 text-brand" /><div><h2 className="font-display text-lg font-black text-ink">Pagos registrados</h2><p className="text-sm text-slate-500">{payments.pagination.total} operaciones en el rango</p></div></div>
              <Button variant="ghost" size="sm" onClick={loadPayments} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></Button>
            </div>
            <div className="overflow-x-auto fine-scrollbar">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-3 py-3">Plan</th>
                  <SortableTh field="amount" label="Monto" activeField={paymentSort} direction={paymentQuery.direction} onSort={(field) => sortTable('payments', field)} align="right" />
                  <SortableTh field="method" label="Método" activeField={paymentSort} direction={paymentQuery.direction} onSort={(field) => sortTable('payments', field)} />
                  <SortableTh field="status" label="Estado" activeField={paymentSort} direction={paymentQuery.direction} onSort={(field) => sortTable('payments', field)} />
                  <th className="px-3 py-3">Cargo Culqi</th>
                  <SortableTh field="date" label="Fecha" activeField={paymentSort} direction={paymentQuery.direction} onSort={(field) => sortTable('payments', field)} className="pr-4" />
                </tr></thead>
                <tbody>
                  {payments.items.map((payment) => <tr key={payment.id} className="border-t border-line">
                    <td className="px-4 py-3"><strong className="block max-w-56 truncate text-ink">{payment.customerName || payment.customer || '-'}</strong>{payment.customerName ? <span className="block max-w-56 truncate text-xs text-slate-500">{payment.customer}</span> : null}</td>
                    <td className="px-3 py-3 font-bold">{payment.plan}</td>
                    <td className="px-3 py-3 text-right font-black">{formatPEN(payment.amount)}</td>
                    <td className="px-3 py-3 capitalize">{payment.method || '-'}</td>
                    <td className="px-3 py-3"><Badge variant={statusVariant(payment.status)}>{payment.status}</Badge></td>
                    <td className="max-w-48 truncate px-3 py-3 font-mono text-xs" title={payment.chargeId}>{payment.chargeId || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(payment.paidAt)}</td>
                  </tr>)}
                  {!loading && !payments.items.length ? <EmptyRow columns={7}>No hay pagos en este rango.</EmptyRow> : null}
                  {loading ? <EmptyRow columns={7}>Cargando pagos...</EmptyRow> : null}
                </tbody>
              </table>
            </div>
            <PaginationControls pagination={payments.pagination} disabled={loading} onPageChange={(page) => setPaymentQuery((current) => ({ ...current, page }))} onSizeChange={(size) => setPaymentQuery((current) => ({ ...current, page: 1, size }))} />
          </Card>
        ) : null}

        {tab === 'receipts' ? (
          <Card className="overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-4 py-4">
              <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-brand" /><div><h2 className="font-display text-lg font-black text-ink">Boletas y facturas</h2><p className="text-sm text-slate-500">Descarga individual de archivos fiscales</p></div></div>
              <Button variant="ghost" size="sm" onClick={loadReceipts} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></Button>
            </div>
            <div className="overflow-x-auto fine-scrollbar">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                  <th className="px-4 py-3">Cliente</th>
                  <SortableTh field="type" label="Tipo" activeField={receiptSort} direction={receiptQuery.direction} onSort={(field) => sortTable('receipts', field)} />
                  <SortableTh field="number" label="Número" activeField={receiptSort} direction={receiptQuery.direction} onSort={(field) => sortTable('receipts', field)} />
                  <SortableTh field="status" label="SUNAT" activeField={receiptSort} direction={receiptQuery.direction} onSort={(field) => sortTable('receipts', field)} />
                  <SortableTh field="total" label="Total" activeField={receiptSort} direction={receiptQuery.direction} onSort={(field) => sortTable('receipts', field)} align="right" />
                  <SortableTh field="date" label="Fecha" activeField={receiptSort} direction={receiptQuery.direction} onSort={(field) => sortTable('receipts', field)} />
                  <th className="px-4 py-3 text-right">Archivos</th>
                </tr></thead>
                <tbody>
                  {receipts.items.map((receipt) => <tr key={receipt.id} className="border-t border-line">
                    <td className="px-4 py-3"><strong className="block max-w-56 truncate text-ink">{receipt.customerName || receipt.customer}</strong><span className="text-xs text-slate-500">{receipt.documentNumber}</span></td>
                    <td className="px-3 py-3"><Badge variant="blue">{receipt.type}</Badge></td>
                    <td className="px-3 py-3 font-mono font-bold">{receipt.label}</td>
                    <td className="px-3 py-3"><Badge variant={statusVariant(receipt.status)}>{receipt.status}</Badge></td>
                    <td className="px-3 py-3 text-right font-black">{formatPEN(receipt.total)}</td>
                    <td className="px-3 py-3 text-slate-500">{formatDate(receipt.createdAt)}</td>
                    <td className="px-4 py-3"><ReceiptDownloads receipt={receipt} onError={setError} onUpdated={loadReceipts} /></td>
                  </tr>)}
                  {!loading && !receipts.items.length ? <EmptyRow columns={7}>No hay comprobantes en este rango.</EmptyRow> : null}
                  {loading ? <EmptyRow columns={7}>Cargando comprobantes...</EmptyRow> : null}
                </tbody>
              </table>
            </div>
            <PaginationControls pagination={receipts.pagination} disabled={loading} onPageChange={(page) => setReceiptQuery((current) => ({ ...current, page }))} onSizeChange={(size) => setReceiptQuery((current) => ({ ...current, page: 1, size }))} />
          </Card>
        ) : null}

        {tab === 'reconciliation' ? (
          <div className="grid gap-4">
            {reconciliation ? (
              <>
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Sistema', reconciliation.summary.systemCount, formatPEN(reconciliation.summary.systemTotal)],
                    ['Culqi', reconciliation.summary.culqiCount, formatPEN(reconciliation.summary.culqiTotal)],
                    ['Conciliados', reconciliation.summary.matchedCount, `${reconciliation.summary.issues} observaciones`],
                    ['Diferencia', formatPEN(reconciliation.summary.difference), reconciliation.summary.balanced ? 'Cuadre correcto' : 'Requiere revisión'],
                  ].map(([label, value, helper], index) => <div key={label} className="border-t-2 border-line bg-white px-4 py-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><strong className="mt-1 block text-2xl font-black text-ink">{value}</strong><p className={cn('mt-1 text-sm font-semibold', index === 3 && !reconciliation.summary.balanced ? 'text-danger' : 'text-slate-500')}>{helper}</p></div>)}
                </section>
                <Card className="overflow-hidden shadow-sm">
                  <div className="flex items-center gap-3 border-b border-line px-4 py-4">
                    {reconciliation.summary.balanced ? <CheckCircle2 className="h-6 w-6 text-success" /> : <TriangleAlert className="h-6 w-6 text-warning" />}
                    <div><h2 className="font-display text-lg font-black text-ink">Resultado del cuadre</h2><p className="text-sm text-slate-500">Comparación por ID de cargo, monto y moneda</p></div>
                  </div>
                  <div className="overflow-x-auto fine-scrollbar"><table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Resultado</th><th className="px-3 py-3">Cargo Culqi</th><th className="px-3 py-3">Cliente</th><th className="px-3 py-3 text-right">Sistema</th><th className="px-3 py-3 text-right">Culqi</th><th className="px-4 py-3">Fecha</th></tr></thead>
                    <tbody>{reconciliation.items.map((row, index) => <tr key={`${row.chargeId}-${index}`} className="border-t border-line"><td className="px-4 py-3"><Badge variant={statusVariant(row.status)}>{row.status}</Badge></td><td className="max-w-52 truncate px-3 py-3 font-mono text-xs" title={row.chargeId}>{row.chargeId}</td><td className="max-w-56 truncate px-3 py-3">{row.customer || '-'}</td><td className="px-3 py-3 text-right font-bold">{row.systemAmount == null ? '-' : formatPEN(row.systemAmount)}</td><td className="px-3 py-3 text-right font-bold">{row.culqiAmount == null ? '-' : formatPEN(row.culqiAmount)}</td><td className="px-4 py-3 text-slate-500">{formatDate(row.paidAt)}</td></tr>)}</tbody>
                  </table></div>
                </Card>
              </>
            ) : (
              <div className="grid min-h-64 place-items-center border border-dashed border-line bg-white px-6 text-center"><div><Scale className="mx-auto h-10 w-10 text-brand" /><h2 className="mt-3 text-xl font-black text-ink">Ejecuta el cuadre del periodo</h2><p className="mt-1 text-slate-600">Se compararán las operaciones registradas con los cargos de Culqi.</p><Button className="mt-5" onClick={reconcile} disabled={reconciling}>{reconciling ? 'Conciliando...' : 'Conciliar con Culqi'}</Button></div></div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
