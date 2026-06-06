import {
  Banknote,
  CalendarDays,
  Download,
  FileSpreadsheet,
  LineChart,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { api } from '../services/api.js';
import { cn } from '../utils/cn.js';

const emptyOverview = {
  analyticsReady: true,
  metrics: {
    totalUsers: 0,
    usersToday: 0,
    usersThisMonth: 0,
    pageViewsToday: 0,
    pageViewsThisMonth: 0,
    uniqueVisitorsToday: 0,
    uniqueVisitorsThisMonth: 0,
    practiceSessionsToday: 0,
    practiceSessionsThisMonth: 0,
    practicedUsers: 0,
    practicedButUnpaidUsers: 0,
    payingUsers: 0,
    revenueToday: 0,
    revenueThisMonth: 0,
    revenueTotal: 0,
    paymentsToday: 0,
    paymentsThisMonth: 0,
    paymentsTotal: 0,
    conversionFromPractice: 0,
  },
  series: {
    dailyRevenue: [],
    monthlyRevenue: [],
  },
  marketProjection: {
    conservativeMarket: 230880,
    broadMarket: 522000,
    conversionRate: 1,
    monthlyPlanPrice: 12,
    conservativeSubscribers: 2309,
    broadSubscribers: 5220,
    conservativeMonthlySubscribers: 192.42,
    broadMonthlySubscribers: 435,
    conservativeMonthlyRevenue: 2309,
    broadMonthlyRevenue: 5220,
    conservativeAnnualRevenue: 27708,
    broadAnnualRevenue: 62640,
  },
  recentUsers: [],
  recentPayments: [],
};

function formatNumber(value) {
  return new Intl.NumberFormat('es-PE').format(Number(value || 0));
}

function formatPEN(value) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function MetricCard({ icon: Icon, title, value, helper, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-brand',
    green: 'bg-emerald-50 text-success',
    orange: 'bg-orange-50 text-warning',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-right">
          <span className="block text-sm font-semibold text-slate-500">{title}</span>
          <strong className="mt-1 block text-2xl font-black text-ink">{value}</strong>
        </span>
      </div>
      {helper ? <p className="mt-3 text-xs font-semibold text-slate-500">{helper}</p> : null}
    </Card>
  );
}

function RevenueBars({ title, items, emptyLabel }) {
  const maxRevenue = Math.max(...items.map((item) => Number(item.revenue || 0)), 1);

  return (
    <Card className="p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">{title}</h2>
        <Badge variant="blue">{items.length} periodos</Badge>
      </div>
      {items.length ? (
        <div className="grid h-52 grid-cols-[repeat(auto-fit,minmax(34px,1fr))] items-end gap-2">
          {items.map((item) => (
            <div key={item.key} className="grid min-w-0 gap-2 text-center">
              <div className="flex h-36 items-end rounded-lg bg-slate-100 px-1">
                <div
                  className="w-full rounded-md bg-brand"
                  style={{ height: `${Math.max(8, (Number(item.revenue || 0) / maxRevenue) * 100)}%` }}
                  title={`${item.label}: ${formatPEN(item.revenue)}`}
                />
              </div>
              <span className="truncate text-[11px] font-bold text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid h-52 place-items-center rounded-lg bg-slate-50 text-sm font-semibold text-slate-500">{emptyLabel}</div>
      )}
    </Card>
  );
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

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');

  const metrics = overview.metrics ?? emptyOverview.metrics;
  const projection = overview.marketProjection ?? emptyOverview.marketProjection;
  const dailyRevenue = overview.series?.dailyRevenue ?? [];
  const monthlyRevenue = overview.series?.monthlyRevenue ?? [];

  const kpis = useMemo(() => [
    {
      icon: MousePointerClick,
      title: 'Visitantes únicos hoy',
      value: formatNumber(metrics.uniqueVisitorsToday),
      helper: `${formatNumber(metrics.pageViewsToday)} vistas registradas hoy`,
      tone: 'blue',
    },
    {
      icon: Users,
      title: 'Usuarios registrados',
      value: formatNumber(metrics.totalUsers),
      helper: `${formatNumber(metrics.usersThisMonth)} nuevos este mes`,
      tone: 'violet',
    },
    {
      icon: UserCheck,
      title: 'Practicaron sin pagar',
      value: formatNumber(metrics.practicedButUnpaidUsers),
      helper: `${formatNumber(metrics.practicedUsers)} usuarios practicaron en total`,
      tone: 'orange',
    },
    {
      icon: Banknote,
      title: 'Ingreso de hoy',
      value: formatPEN(metrics.revenueToday),
      helper: `${formatNumber(metrics.paymentsToday)} pagos exitosos`,
      tone: 'green',
    },
    {
      icon: CalendarDays,
      title: 'Ingreso del mes',
      value: formatPEN(metrics.revenueThisMonth),
      helper: `${formatNumber(metrics.paymentsThisMonth)} pagos este mes`,
      tone: 'green',
    },
    {
      icon: TrendingUp,
      title: 'Conversión práctica',
      value: `${metrics.conversionFromPractice ?? 0}%`,
      helper: `${formatNumber(metrics.payingUsers)} usuarios con pago o membresía`,
      tone: 'blue',
    },
  ], [metrics]);

  const loadOverview = () => {
    setLoading(true);
    setError('');
    api.getAdminOverview()
      .then((data) => setOverview({ ...emptyOverview, ...data }))
      .catch((requestError) => setError(requestError.message || 'No se pudo cargar el panel admin.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const exportReport = async (type) => {
    setExporting(type);
    setError('');
    try {
      const csv = await api.exportAdminReport(type);
      downloadCsv(`simulador-mtc-${type}.csv`, csv);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo exportar el reporte.');
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="grid gap-5 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-brand">Administrador</p>
          <h1 className="text-3xl font-black">Dashboard de negocio</h1>
          <p className="mt-2 max-w-3xl text-slate-600">Control de tráfico, práctica, usuarios, pagos e indicadores contables para tomar decisiones.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={loadOverview} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Actualizar
          </Button>
          {[
            ['summary', 'Resumen'],
            ['users', 'Usuarios'],
            ['payments', 'Pagos'],
          ].map(([type, label]) => (
            <Button key={type} variant="secondary" onClick={() => exportReport(type)} disabled={Boolean(exporting)}>
              <Download className="h-4 w-4" />
              {exporting === type ? 'Exportando...' : label}
            </Button>
          ))}
        </div>
      </div>

      {!overview.analyticsReady ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800">
          El tracking de visitas empieza cuando la migración de eventos esté aplicada. El resto de métricas sale de usuarios, prácticas y pagos.
        </div>
      ) : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-danger">{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((item) => <MetricCard key={item.title} {...item} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <RevenueBars title="Ingresos diarios" items={dailyRevenue} emptyLabel="Aún no hay pagos en los últimos días." />
        <RevenueBars title="Ingresos mensuales" items={monthlyRevenue} emptyLabel="Aún no hay pagos mensuales registrados." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black"><LineChart className="h-5 w-5 text-brand" /> Proyección de mercado</h2>
            <Badge variant="green">1% de conversión</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-line bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">Mercado conservador</p>
              <strong className="mt-2 block text-3xl font-black">{formatNumber(projection.conservativeSubscribers)}</strong>
              <p className="mt-1 text-sm text-slate-600">1% de {formatNumber(projection.conservativeMarket)} licencias nuevas/año.</p>
              <p className="mt-3 font-black text-success">{formatNumber(projection.conservativeMonthlySubscribers)} usuarios/mes promedio</p>
              <p className="text-sm font-semibold text-slate-500">{formatPEN(projection.conservativeMonthlyRevenue)} mensuales promedio; {formatPEN(projection.conservativeAnnualRevenue)} al año si todos pagan 1 mes.</p>
            </div>
            <div className="rounded-lg border border-line bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">Mercado amplio</p>
              <strong className="mt-2 block text-3xl font-black">{formatNumber(projection.broadSubscribers)}</strong>
              <p className="mt-1 text-sm text-slate-600">1% de {formatNumber(projection.broadMarket)} licencias clase A emitidas/año.</p>
              <p className="mt-3 font-black text-success">{formatNumber(projection.broadMonthlySubscribers)} usuarios/mes promedio</p>
              <p className="text-sm font-semibold text-slate-500">{formatPEN(projection.broadMonthlyRevenue)} mensuales promedio; {formatPEN(projection.broadAnnualRevenue)} al año si todos pagan 1 mes.</p>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500">Cálculo basado en ticket mensual de {formatPEN(projection.monthlyPlanPrice)} y cifras MTC 2024.</p>
        </Card>

        <Card className="p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black"><FileSpreadsheet className="h-5 w-5 text-brand" /> Control contable</h2>
          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
              <span className="font-semibold text-slate-600">Ingreso total registrado</span>
              <strong>{formatPEN(metrics.revenueTotal)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
              <span className="font-semibold text-slate-600">Pagos exitosos totales</span>
              <strong>{formatNumber(metrics.paymentsTotal)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
              <span className="font-semibold text-slate-600">Sesiones de práctica este mes</span>
              <strong>{formatNumber(metrics.practiceSessionsThisMonth)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
              <span className="font-semibold text-slate-600">Vistas de página este mes</span>
              <strong>{formatNumber(metrics.pageViewsThisMonth)}</strong>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-line p-4">
            <h2 className="text-lg font-black">Usuarios recientes</h2>
            <Badge variant="blue">{overview.recentUsers?.length ?? 0}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Usuario</th><th>Estado</th><th>Prácticas</th><th>Pagado</th><th>Registro</th></tr>
              </thead>
              <tbody>
                {(overview.recentUsers ?? []).map((user) => (
                  <tr key={user.id} className="border-t border-line">
                    <td className="px-4 py-3"><strong className="block">{user.name}</strong><span className="text-xs text-slate-500">{user.email}</span></td>
                    <td><Badge variant={user.status === 'Pago' ? 'green' : user.status === 'Practico sin pagar' ? 'orange' : 'slate'}>{user.status}</Badge></td>
                    <td className="font-bold">{formatNumber(user.practiceSessions)}</td>
                    <td className="font-bold">{formatPEN(user.paidAmount)}</td>
                    <td className="text-slate-500">{formatDate(user.registeredAt)}</td>
                  </tr>
                ))}
                {!overview.recentUsers?.length ? <tr><td colSpan={5} className="px-4 py-8 text-center font-semibold text-slate-500">Aún no hay usuarios para mostrar.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-line p-4">
            <h2 className="text-lg font-black">Pagos recientes</h2>
            <Badge variant="green">{overview.recentPayments?.length ?? 0}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Cliente</th><th>Plan</th><th>Monto</th><th>Método</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                {(overview.recentPayments ?? []).map((payment) => (
                  <tr key={payment.id} className="border-t border-line">
                    <td className="px-4 py-3 text-slate-700">{payment.customer || `Usuario ${payment.userId}`}</td>
                    <td><Badge variant="blue">{payment.plan}</Badge></td>
                    <td className="font-black">{formatPEN(payment.amount)}</td>
                    <td className="capitalize text-slate-600">{payment.method}</td>
                    <td className="text-slate-500">{formatDate(payment.paidAt)}</td>
                  </tr>
                ))}
                {!overview.recentPayments?.length ? <tr><td colSpan={5} className="px-4 py-8 text-center font-semibold text-slate-500">Aún no hay pagos exitosos.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
