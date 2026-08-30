import {
  Activity,
  Banknote,
  Bot,
  BookOpen,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Globe2,
  MousePointerClick,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Tablet,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { PaginationControls, SortableTh } from '../components/admin/AdminTableControls.jsx';
import { api } from '../services/api.js';
import { cn } from '../utils/cn.js';

const emptyMetrics = {
  totalUsers: 0,
  usersToday: 0,
  usersThisMonth: 0,
  pageViewsToday: 0,
  pageViewsThisMonth: 0,
  pageViews30Days: 0,
  uniqueVisitorsToday: 0,
  uniqueVisitorsThisMonth: 0,
  uniqueVisitors30Days: 0,
  signedInVisitorsThisMonth: 0,
  humanVisitors30Days: 0,
  botVisitors30Days: 0,
  practiceSessionsToday: 0,
  practiceSessionsThisMonth: 0,
  timedSessionsThisMonth: 0,
  practicedUsers: 0,
  practicedButUnpaidUsers: 0,
  payingUsers: 0,
  realPayingUsers: 0,
  activeSubscriptions: 0,
  expiredSubscriptions: 0,
  subscriptionsThisMonth: 0,
  subscriptionsExpiring7Days: 0,
  activePlanValue: 0,
  revenueToday: 0,
  revenueThisMonth: 0,
  revenueTotal: 0,
  paymentsToday: 0,
  paymentsThisMonth: 0,
  paymentsTotal: 0,
  conversionFromPractice: 0,
  registeredToPaidConversion: 0,
};

const emptyOverview = {
  analyticsReady: true,
  analyticsTruncated: false,
  generatedAt: null,
  metrics: emptyMetrics,
  series: {
    dailyRevenue: [],
    monthlyRevenue: [],
    trafficDaily: [],
  },
  topPages: [],
  topSources: [],
  devices: [],
  funnel: {
    registered: 0,
    started: 0,
    completed: 0,
    repeated: 0,
    returned: 0,
    startedRate: 0,
    completedRate: 0,
    repeatedRate: 0,
    returnedRate: 0,
  },
  recentUsers: [],
  recentPayments: [],
  subscriptions: [],
};

const emptyUsers = {
  items: [],
  pagination: { page: 1, size: 10, total: 0, totalPages: 1 },
  sort: { field: 'registeredAt', direction: 'desc' },
};

const exportOptions = [
  { value: 'summary', label: 'Resumen' },
  { value: 'users', label: 'Usuarios' },
  { value: 'subscriptions', label: 'Suscripciones' },
  { value: 'payments', label: 'Pagos' },
  { value: 'traffic', label: 'Tráfico' },
];

function formatNumber(value) {
  return new Intl.NumberFormat('es-PE').format(Number(value || 0));
}

function formatPEN(value) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Lima',
  });
}

function formatDateTime(value) {
  if (!value) return 'Sin actualizar';
  return new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  });
}

function formatDevice(device) {
  const labels = {
    mobile: 'Celular',
    desktop: 'PC',
    tablet: 'Tablet',
    unknown: 'Sin identificar',
  };
  return labels[String(device || '').toLowerCase()] || device || 'Sin identificar';
}

function DeviceIcon({ device, className = 'h-4 w-4' }) {
  const icons = { mobile: Smartphone, desktop: Monitor, tablet: Tablet };
  const Icon = icons[String(device || '').toLowerCase()] || Monitor;
  return <Icon className={className} aria-hidden="true" />;
}

function formatMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return 'Sin primera práctica';
  if (minutes < 1) return 'Primera práctica inmediata';
  if (minutes < 60) return `Primera práctica en ${Math.round(minutes)} min`;
  return `Primera práctica en ${Math.round(minutes / 60)} h`;
}

function ActivationBadge({ user }) {
  if (Number(user.completedSessions) > 0) return <Badge variant="green">Completó práctica</Badge>;
  if (Number(user.startedSessions) > 0) return <Badge variant="orange">Inició y abandonó</Badge>;
  return <Badge variant="slate">Aún no inició</Badge>;
}

function MetricCard({ icon: Icon, title, value, helper, tone = 'blue', loading }) {
  const tones = {
    blue: 'bg-blue-50 text-brand ring-blue-100',
    green: 'bg-emerald-50 text-success ring-emerald-100',
    orange: 'bg-amber-50 text-warning ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  };

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1', tones[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>
          {loading ? (
            <span className="mt-2 block h-8 w-24 animate-pulse rounded bg-slate-200" />
          ) : (
            <strong className="mt-1 block text-2xl font-black text-ink">{value}</strong>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{helper}</p>
    </Card>
  );
}

function SectionHeading({ icon: Icon, title, helper, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-brand">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-display text-lg font-black text-ink">{title}</h2>
          {helper ? <p className="mt-0.5 text-sm text-slate-500">{helper}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function TrafficTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-black text-ink">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="font-semibold" style={{ color: item.color }}>
          {item.dataKey === 'pageViews' ? 'Vistas' : 'Visitantes'}: {formatNumber(item.value)}
        </p>
      ))}
    </div>
  );
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-black text-ink">{label}</p>
      <p className="font-semibold text-success">{formatPEN(payload[0]?.value)}</p>
    </div>
  );
}

function statusVariant(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('activa') || normalized.includes('exitos')) return 'green';
  if (normalized.includes('vencida') || normalized.includes('cancelada')) return 'red';
  if (normalized.includes('practico') || normalized.includes('practicó')) return 'orange';
  if (normalized.includes('pago')) return 'blue';
  return 'slate';
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function EmptyTableRow({ columns, children }) {
  return (
    <tr>
      <td colSpan={columns} className="px-4 py-10 text-center font-semibold text-slate-500">{children}</td>
    </tr>
  );
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportType, setExportType] = useState('summary');
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState(emptyUsers);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersSize, setUsersSize] = useState(10);
  const [usersSort, setUsersSort] = useState('registeredAt');
  const [usersDirection, setUsersDirection] = useState('desc');
  const [usersSearchInput, setUsersSearchInput] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [usersDevice, setUsersDevice] = useState('');

  const metrics = { ...emptyMetrics, ...(overview.metrics ?? {}) };
  const trafficDaily = overview.series?.trafficDaily ?? [];
  const monthlyRevenue = overview.series?.monthlyRevenue ?? [];

  const loadOverview = useCallback(() => {
    setLoading(true);
    setError('');
    api.getAdminOverview()
      .then((data) => setOverview({
        ...emptyOverview,
        ...data,
        metrics: { ...emptyMetrics, ...(data.metrics ?? {}) },
        series: { ...emptyOverview.series, ...(data.series ?? {}) },
      }))
      .catch((requestError) => setError(requestError.message || 'No se pudo cargar el panel administrador.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const loadUsers = useCallback(() => {
    setUsersLoading(true);
    setUsersError('');
    api.getAdminUsers({
      page: usersPage,
      size: usersSize,
      sort: usersSort,
      direction: usersDirection,
      search: usersSearch,
      device: usersDevice,
    })
      .then(setUsers)
      .catch((requestError) => setUsersError(requestError.message || 'No se pudo cargar la lista de usuarios.'))
      .finally(() => setUsersLoading(false));
  }, [usersDevice, usersDirection, usersPage, usersSearch, usersSize, usersSort]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const sortUsers = (field) => {
    if (usersSort === field) {
      setUsersDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setUsersSort(field);
      setUsersDirection(field === 'name' || field === 'email' || field === 'status' ? 'asc' : 'desc');
    }
    setUsersPage(1);
  };

  const refreshAll = () => {
    loadOverview();
    loadUsers();
  };

  const kpis = useMemo(() => [
    {
      icon: MousePointerClick,
      title: 'Visitantes hoy',
      value: formatNumber(metrics.uniqueVisitorsToday),
      helper: `${formatNumber(metrics.uniqueVisitorsThisMonth)} visitantes únicos este mes`,
      tone: 'blue',
    },
    {
      icon: Users,
      title: 'Usuarios',
      value: formatNumber(metrics.totalUsers),
      helper: `${formatNumber(metrics.usersThisMonth)} registros nuevos este mes`,
      tone: 'violet',
    },
    {
      icon: Target,
      title: 'Prácticas del mes',
      value: formatNumber(metrics.practiceSessionsThisMonth),
      helper: `${formatNumber(metrics.timedSessionsThisMonth)} simulacros cronometrados`,
      tone: 'orange',
    },
    {
      icon: CreditCard,
      title: 'Suscripciones activas',
      value: formatNumber(metrics.activeSubscriptions),
      helper: `${formatNumber(metrics.subscriptionsExpiring7Days)} vencen en los próximos 7 días`,
      tone: 'green',
    },
    {
      icon: Banknote,
      title: 'Ingreso del mes',
      value: formatPEN(metrics.revenueThisMonth),
      helper: `${formatNumber(metrics.paymentsThisMonth)} pagos reales confirmados`,
      tone: 'green',
    },
    {
      icon: TrendingUp,
      title: 'Conversión a pago',
      value: `${metrics.registeredToPaidConversion || 0}%`,
      helper: `${formatNumber(metrics.realPayingUsers)} usuarios realizaron un pago real`,
      tone: 'blue',
    },
  ], [metrics]);

  const exportReport = async () => {
    setExporting(true);
    setError('');
    try {
      const csv = await api.exportAdminReport(exportType);
      downloadCsv(`simulador-mtc-${exportType}.csv`, csv);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo exportar el reporte.');
    } finally {
      setExporting(false);
    }
  };

  const activationFunnel = { ...emptyOverview.funnel, ...(overview.funnel ?? {}) };
  const funnelRows = [
    { label: 'Registrados', value: activationFunnel.registered, rate: 100, detail: 'cohorte analizada' },
    { label: 'Iniciaron', value: activationFunnel.started, rate: activationFunnel.startedRate, detail: 'abrieron una práctica' },
    { label: 'Terminaron', value: activationFunnel.completed, rate: activationFunnel.completedRate, detail: 'completaron al menos una' },
    { label: 'Repitieron', value: activationFunnel.repeated, rate: activationFunnel.repeatedRate, detail: 'hicieron otra práctica' },
    { label: 'Regresaron', value: activationFunnel.returned, rate: activationFunnel.returnedRate, detail: 'volvieron otro día' },
  ];
  const deviceRows = overview.devices ?? [];

  return (
    <div className="min-h-[calc(100vh-73px)] bg-soft">
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-brand">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              Administración
              <Badge variant="green">ADMIN</Badge>
            </div>
            <h1 className="font-display text-3xl font-black text-ink">Control del simulador</h1>
            <p className="mt-2 max-w-3xl text-slate-600">Usuarios, actividad, prácticas, pagos y vigencia de suscripciones en un solo lugar.</p>
            <p className="mt-2 text-xs font-semibold text-slate-500" aria-live="polite">
              Actualizado: {loading ? 'consultando datos...' : formatDateTime(overview.generatedAt)}
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            <label className="sr-only" htmlFor="admin-export-type">Tipo de reporte</label>
            <select
              id="admin-export-type"
              value={exportType}
              onChange={(event) => setExportType(event.target.value)}
              className="min-h-11 min-w-40 flex-1 rounded-lg border border-line bg-white px-3 font-bold text-ink focus:border-brand sm:flex-none"
            >
              {exportOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button variant="secondary" size="sm" onClick={exportReport} disabled={exporting}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {exporting ? 'Exportando...' : 'Exportar'}
            </Button>
            <Button as={Link} to="/admin/reclamaciones" variant="secondary" size="sm">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Reclamaciones
            </Button>
            <Button as={Link} to="/admin/finanzas" variant="secondary" size="sm">
              <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
              Finanzas
            </Button>
            <Button as={Link} to="/admin/preguntas" variant="secondary" size="sm">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Preguntas
            </Button>
            <Button variant="secondary" size="sm" onClick={refreshAll} disabled={loading || usersLoading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
              Actualizar
            </Button>
          </div>
        </header>

        {!overview.analyticsReady ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Las métricas de tráfico aún no están disponibles. Usuarios, prácticas, pagos y suscripciones continúan visibles.
          </div>
        ) : null}
        {overview.analyticsTruncated ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            El tráfico superó 10,000 eventos en 30 días. Los valores mostrados corresponden a los eventos más recientes.
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-danger" role="alert">{error}</div>
        ) : null}

        <section aria-label="Indicadores principales" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {kpis.map((item) => <MetricCard key={item.title} {...item} loading={loading} />)}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.75fr)_minmax(280px,0.75fr)]">
          <Card className="overflow-hidden shadow-sm">
            <SectionHeading
              icon={Activity}
              title="Actividad de los últimos 14 días"
              helper={`${formatNumber(metrics.pageViews30Days)} vistas y ${formatNumber(metrics.uniqueVisitors30Days)} visitantes en 30 días`}
              action={(
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" />Vistas</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" />Visitantes</span>
                </div>
              )}
            />
            <div className="h-[270px] px-2 pb-4 pt-5 sm:px-4">
              {trafficDaily.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trafficDaily} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#d9e2ee" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={18} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <ChartTooltip content={<TrafficTooltip />} />
                    <Bar dataKey="pageViews" fill="#1769e0" radius={[4, 4, 0, 0]} maxBarSize={34} />
                    <Line dataKey="visitors" type="monotone" stroke="#149b5a" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-sm font-semibold text-slate-500">Aún no hay actividad suficiente para el gráfico.</div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden shadow-sm">
            <SectionHeading icon={Target} title="Activación" helper="Desde registro hasta retorno" />
            <ol className="grid gap-3 px-4 py-4 sm:px-5">
              {funnelRows.map((row) => {
                const rate = Math.min(100, Math.max(0, Number(row.rate) || 0));
                return (
                  <li key={row.label}>
                    <div className="mb-1 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-ink">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.detail}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <strong className="block text-lg font-black text-ink">{formatNumber(row.value)}</strong>
                        <span className="text-xs font-bold text-slate-500">{rate}%</span>
                      </div>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label={`${row.label}: ${rate}%`}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={rate}
                    >
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${rate}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card className="overflow-hidden shadow-sm">
            <SectionHeading
              icon={Smartphone}
              title="Dispositivos"
              helper="Visitantes humanos, últimos 30 días"
              action={<Badge variant="slate"><Bot className="h-3.5 w-3.5" aria-hidden="true" />{formatNumber(metrics.botVisitors30Days)} bots</Badge>}
            />
            <div className="grid gap-3 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                <span className="font-bold text-emerald-800">Visitantes humanos</span>
                <strong className="text-lg font-black text-emerald-900">{formatNumber(metrics.humanVisitors30Days)}</strong>
              </div>
              {deviceRows.map((row) => (
                <div key={row.device} className="rounded-lg border border-line px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-bold text-ink">
                      <DeviceIcon device={row.device} />
                      {formatDevice(row.device)}
                    </span>
                    <strong className="text-lg font-black text-ink">{Number(row.share) || 0}%</strong>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {formatNumber(row.visitors)} visitantes · {formatNumber(row.pageViews)} vistas · {formatNumber(row.identifiedUsers)} identificados
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <span className="block h-full rounded-full bg-success" style={{ width: `${Math.min(100, Number(row.share) || 0)}%` }} />
                  </div>
                </div>
              ))}
              {!loading && !deviceRows.length ? <p className="py-5 text-center text-sm font-semibold text-slate-500">Aún no hay dispositivos identificados.</p> : null}
            </div>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
          <Card className="overflow-hidden shadow-sm">
            <SectionHeading
              icon={Banknote}
              title="Ingresos reales"
              helper={`${formatPEN(metrics.revenueTotal)} acumulado · ${formatNumber(metrics.paymentsTotal)} pagos`}
              action={<Badge variant="green">{formatPEN(metrics.revenueToday)} hoy</Badge>}
            />
            <div className="h-[260px] px-2 pb-4 pt-5 sm:px-4">
              {monthlyRevenue.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#d9e2ee" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => `S/${value}`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<RevenueTooltip />} />
                    <Bar dataKey="revenue" fill="#149b5a" radius={[5, 5, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-sm font-semibold text-slate-500">Aún no hay pagos reales registrados.</div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden shadow-sm">
            <SectionHeading
              icon={Eye}
              title="Páginas más visitadas"
              helper="Rutas agrupadas sin parámetros, últimos 30 días"
              action={<Badge variant="blue">{overview.topPages?.length ?? 0} rutas</Badge>}
            />
            <div className="max-h-[260px] overflow-auto fine-scrollbar">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ruta</th>
                    <th className="px-3 py-3 text-right">Vistas</th>
                    <th className="px-3 py-3 text-right">Personas</th>
                    <th className="px-4 py-3 text-right">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.topPages ?? []).map((page) => (
                    <tr key={page.path} className="border-t border-line">
                      <td className="max-w-[250px] truncate px-4 py-3 font-bold text-ink" title={page.path}>{page.path}</td>
                      <td className="px-3 py-3 text-right font-bold">{formatNumber(page.views)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{formatNumber(page.visitors)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{page.share}%</td>
                    </tr>
                  ))}
                  {!overview.topPages?.length ? <EmptyTableRow columns={4}>Aún no hay rutas registradas.</EmptyTableRow> : null}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <Card className="overflow-hidden shadow-sm">
          <SectionHeading
            icon={Globe2}
            title="De dónde llegan las visitas"
            helper="Buscadores, asistentes de IA, campañas y accesos directos de los últimos 30 días"
            action={<Badge variant="blue">{overview.topSources?.length ?? 0} fuentes</Badge>}
          />
          <div className="overflow-x-auto fine-scrollbar">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fuente</th>
                  <th className="px-3 py-3 text-right">Vistas</th>
                  <th className="px-3 py-3 text-right">Visitantes</th>
                  <th className="px-4 py-3 text-right">Participación</th>
                </tr>
              </thead>
              <tbody>
                {(overview.topSources ?? []).map((source) => (
                  <tr key={source.source} className="border-t border-line">
                    <td className="px-4 py-3 font-bold text-ink">{source.source}</td>
                    <td className="px-3 py-3 text-right font-bold">{formatNumber(source.views)}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{formatNumber(source.visitors)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{source.share}%</td>
                  </tr>
                ))}
                {!overview.topSources?.length ? <EmptyTableRow columns={4}>Aún no hay fuentes registradas.</EmptyTableRow> : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden shadow-sm">
          <SectionHeading
            icon={CalendarClock}
            title="Suscripciones"
            helper={`${formatNumber(metrics.subscriptionsThisMonth)} nuevas este mes · valor de planes activos ${formatPEN(metrics.activePlanValue)}`}
            action={<Badge variant="green">{formatNumber(metrics.activeSubscriptions)} activas</Badge>}
          />
          <div className="overflow-x-auto fine-scrollbar">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Inicio</th>
                  <th className="px-3 py-3">Vencimiento</th>
                  <th className="px-3 py-3">Restante</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {(overview.subscriptions ?? []).map((subscription) => (
                  <tr key={subscription.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <strong className="block max-w-[250px] truncate text-ink">{subscription.customerName || subscription.customer}</strong>
                      {subscription.customerName ? <span className="block max-w-[250px] truncate text-xs text-slate-500">{subscription.customer}</span> : null}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-700">{subscription.plan}</td>
                    <td className="px-3 py-3"><Badge variant={statusVariant(subscription.status)}>{subscription.status}</Badge></td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(subscription.startedAt)}</td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(subscription.endsAt)}</td>
                    <td className="px-3 py-3 font-bold">{subscription.status === 'Activa' ? `${subscription.daysRemaining} días` : '-'}</td>
                    <td className="px-4 py-3 text-right font-black">{formatPEN(subscription.amount)}</td>
                  </tr>
                ))}
                {!overview.subscriptions?.length ? <EmptyTableRow columns={7}>Aún no hay suscripciones registradas.</EmptyTableRow> : null}
              </tbody>
            </table>
          </div>
        </Card>

        <section className="grid gap-4">
          <Card className="overflow-hidden shadow-sm">
            <SectionHeading
              icon={Users}
              title="Usuarios"
              helper={`${formatNumber(metrics.usersToday)} registros hoy · orden y paginación en el servidor`}
              action={<Badge variant="blue">{formatNumber(users.pagination?.total)} registrados</Badge>}
            />
            <form
              className="grid gap-3 border-b border-line p-3 sm:grid-cols-[minmax(240px,1fr)_180px_auto] sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                setUsersPage(1);
                setUsersSearch(usersSearchInput.trim());
              }}
            >
              <label className="grid min-w-0 gap-1 text-xs font-bold text-slate-600">
                Buscar usuario
                <span className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={usersSearchInput}
                    onChange={(event) => setUsersSearchInput(event.target.value)}
                    placeholder="Nombre o correo"
                    className="min-h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </span>
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-600" htmlFor="admin-users-device">
                Dispositivo
                <select
                  id="admin-users-device"
                  value={usersDevice}
                  onChange={(event) => {
                    setUsersDevice(event.target.value);
                    setUsersPage(1);
                  }}
                  className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Todos</option>
                  <option value="mobile">Celular</option>
                  <option value="desktop">PC</option>
                  <option value="tablet">Tablet</option>
                  <option value="unknown">Sin identificar</option>
                </select>
              </label>
              <Button variant="secondary" size="sm" type="submit" className="min-h-11">Buscar</Button>
            </form>
            {usersError ? <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-danger" role="alert">{usersError}</p> : null}
            <div className="hidden overflow-x-auto fine-scrollbar md:block">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <caption className="sr-only">Usuarios registrados, activación, retención y dispositivo</caption>
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <SortableTh field="name" label="Usuario" activeField={usersSort} direction={usersDirection} onSort={sortUsers} className="pl-4" />
                    <SortableTh field="status" label="Estado" activeField={usersSort} direction={usersDirection} onSort={sortUsers} />
                    <th className="px-3 py-3">Dispositivo</th>
                    <SortableTh field="practices" label="Activación" activeField={usersSort} direction={usersDirection} onSort={sortUsers} />
                    <th className="px-3 py-3">Retención</th>
                    <th className="px-3 py-3">Última actividad</th>
                    <SortableTh field="paid" label="Pagado" activeField={usersSort} direction={usersDirection} onSort={sortUsers} align="right" />
                    <SortableTh field="registeredAt" label="Registro" activeField={usersSort} direction={usersDirection} onSort={sortUsers} className="pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {(users.items ?? []).map((user) => (
                    <tr key={user.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <strong className="block max-w-[220px] truncate text-ink">{user.name}</strong>
                            <span className="block max-w-[220px] truncate text-xs text-slate-500">{user.email}</span>
                          </div>
                          {user.role === 'ADMIN' ? <Badge variant="violet">ADMIN</Badge> : null}
                        </div>
                      </td>
                      <td className="px-3 py-3"><Badge variant={statusVariant(user.status)}>{user.status}</Badge></td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2 font-bold text-slate-700">
                          <DeviceIcon device={user.firstDevice} />
                          {formatDevice(user.firstDevice)}
                        </span>
                        {user.lastDevice && user.lastDevice !== user.firstDevice ? (
                          <span className="mt-1 block text-xs text-slate-500">Último: {formatDevice(user.lastDevice)}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <ActivationBadge user={user} />
                        <span className="mt-1 block text-xs font-semibold text-slate-500">
                          {formatNumber(user.completedSessions)}/{formatNumber(user.startedSessions)} terminadas · {formatNumber(user.attempts)} intentos
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">{formatMinutes(user.minutesToFirstPractice)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={user.returnedAfterRegistration ? 'green' : 'slate'}>
                          {user.returnedAfterRegistration ? 'Regresó otro día' : 'Sin retorno'}
                        </Badge>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">{formatNumber(user.activeDays)} días activos</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{formatDateTime(user.lastActiveAt)}</td>
                      <td className="px-3 py-3 text-right font-bold">{formatPEN(user.paidAmount)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(user.registeredAt)}</td>
                    </tr>
                  ))}
                  {!usersLoading && !users.items?.length ? <EmptyTableRow columns={8}>No hay usuarios que coincidan con el filtro.</EmptyTableRow> : null}
                  {usersLoading ? <EmptyTableRow columns={8}>Cargando usuarios...</EmptyTableRow> : null}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden" aria-live="polite">
              {(users.items ?? []).map((user) => (
                <article key={user.id} className="rounded-xl border border-line bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-black text-ink">{user.name}</h3>
                      <p className="mt-0.5 break-all text-sm text-slate-600">{user.email}</p>
                    </div>
                    {user.role === 'ADMIN' ? <Badge variant="violet">ADMIN</Badge> : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
                    <Badge variant="blue">
                      <DeviceIcon device={user.firstDevice} className="h-3.5 w-3.5" />
                      {formatDevice(user.firstDevice)}
                    </Badge>
                    <ActivationBadge user={user} />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-bold text-slate-500">Sesiones</dt>
                      <dd className="mt-0.5 font-black text-ink">{formatNumber(user.completedSessions)}/{formatNumber(user.startedSessions)} terminadas</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">Intentos</dt>
                      <dd className="mt-0.5 font-black text-ink">{formatNumber(user.attempts)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">Retención</dt>
                      <dd className="mt-0.5 font-black text-ink">{formatNumber(user.activeDays)} días activos</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">Pagado</dt>
                      <dd className="mt-0.5 font-black text-ink">{formatPEN(user.paidAmount)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs font-bold text-slate-500">Primera práctica</dt>
                      <dd className="mt-0.5 font-semibold text-slate-700">{formatMinutes(user.minutesToFirstPractice)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">Última actividad</dt>
                      <dd className="mt-0.5 font-semibold text-slate-700">{formatDateTime(user.lastActiveAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">Registro</dt>
                      <dd className="mt-0.5 font-semibold text-slate-700">{formatDate(user.registeredAt)}</dd>
                    </div>
                  </dl>

                  <p className={cn(
                    'mt-4 rounded-lg px-3 py-2 text-sm font-bold',
                    user.returnedAfterRegistration ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600',
                  )}>
                    {user.returnedAfterRegistration ? 'Regresó otro día' : 'Todavía no regresó otro día'}
                  </p>
                </article>
              ))}
              {!usersLoading && !users.items?.length ? <p className="py-8 text-center text-sm font-semibold text-slate-500">No hay usuarios que coincidan con el filtro.</p> : null}
              {usersLoading ? <p className="py-8 text-center text-sm font-semibold text-slate-500">Cargando usuarios...</p> : null}
            </div>
            <PaginationControls
              pagination={users.pagination}
              onPageChange={setUsersPage}
              onSizeChange={(size) => {
                setUsersSize(size);
                setUsersPage(1);
              }}
              disabled={usersLoading}
            />
          </Card>

          <Card className="overflow-hidden shadow-sm">
            <SectionHeading
              icon={FileSpreadsheet}
              title="Pagos reales recientes"
              helper="Las simulaciones no se contabilizan como ingreso"
              action={<Badge variant="green">{formatNumber(metrics.paymentsTotal)} pagos</Badge>}
            />
            <div className="max-h-[470px] overflow-auto fine-scrollbar">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3 text-right">Monto</th>
                    <th className="px-3 py-3">Método</th>
                    <th className="px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.recentPayments ?? []).map((payment) => (
                    <tr key={payment.id} className="border-t border-line">
                      <td className="max-w-[220px] truncate px-4 py-3 text-slate-700" title={payment.customer}>{payment.customer || `Usuario ${payment.userId}`}</td>
                      <td className="px-3 py-3"><Badge variant="blue">{payment.plan}</Badge></td>
                      <td className="px-3 py-3 text-right font-black">{formatPEN(payment.amount)}</td>
                      <td className="px-3 py-3 capitalize text-slate-600">{payment.method}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(payment.paidAt)}</td>
                    </tr>
                  ))}
                  {!overview.recentPayments?.length ? <EmptyTableRow columns={5}>Aún no hay pagos reales confirmados.</EmptyTableRow> : null}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section aria-label="Resumen contable" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Banknote, label: 'Ingreso acumulado', value: formatPEN(metrics.revenueTotal) },
            { icon: CreditCard, label: 'Valor de planes activos', value: formatPEN(metrics.activePlanValue) },
            { icon: UserCheck, label: 'Visitantes con sesión', value: formatNumber(metrics.signedInVisitorsThisMonth) },
            { icon: Eye, label: 'Vistas este mes', value: formatNumber(metrics.pageViewsThisMonth) },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 border-t-2 border-line bg-white px-4 py-4">
              <item.icon className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-slate-500">{item.label}</p>
                <strong className="mt-1 block truncate text-lg font-black text-ink">{item.value}</strong>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
