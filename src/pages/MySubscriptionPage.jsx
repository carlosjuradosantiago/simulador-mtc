import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  FileCode2,
  FileText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { api, resolveCategoryId } from '../services/api.js';

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date(value));
}

function paymentReceipt(payment) {
  const relation = payment?.comprobantes_electronicos;
  return Array.isArray(relation) ? relation[0] : relation;
}

export default function MySubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [membership, setMembership] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const categoryId = resolveCategoryId(user?.category);

  const load = async () => {
    setError('');
    const [current, history, activeMembership] = await Promise.all([
      api.getSubscription().catch(() => null),
      api.getPaymentHistory().catch(() => []),
      api.getActiveMembership().catch(() => null),
    ]);
    setSubscription(current);
    setPayments(history || []);
    setMembership(activeMembership);
  };

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, []);

  const openReceipt = async (receipt, type) => {
    setWorking(`${receipt.id}-${type}`);
    setError('');
    try {
      if (receipt.estado_sunat !== 'aceptado') {
        const retried = await api.retryReceipt(receipt.id);
        if (!retried.success) throw new Error('SUNAT todavía no aceptó el comprobante. Puedes volver a intentarlo en unos minutos.');
        await load();
      }
      const detail = await api.getReceipt(receipt.id);
      const url = detail.urls?.[type];
      if (!url) throw new Error(`El archivo ${type.toUpperCase()} todavía no está disponible.`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (requestError) {
      setError(requestError.message || 'No se pudo abrir el comprobante.');
    } finally {
      setWorking('');
    }
  };

  const cancelRenewal = async () => {
    setWorking('cancel');
    setError('');
    try {
      const result = await api.cancelSubscription();
      setSubscription(result.subscription);
      setCancelOpen(false);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo cancelar la renovación.');
    } finally {
      setWorking('');
    }
  };

  if (loading) {
    return <div className="grid min-h-[55vh] place-items-center"><RefreshCw className="h-9 w-9 animate-spin text-brand" aria-label="Cargando suscripción" /></div>;
  }

  const active = membership?.isActive === true || subscription?.membership?.isActive === true;
  const autoRenew = subscription?.autoRenew === true;
  const paymentConfirmed = searchParams.get('pago') === 'confirmado';

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <header className="border-b border-line pb-6">
        <p className="font-bold text-brand">Cuenta y facturación</p>
        <h1 className="mt-2 font-display text-3xl font-black text-ink sm:text-4xl">Mi suscripción</h1>
        <p className="mt-2 text-slate-600">Revisa tu vigencia, próxima renovación y comprobantes.</p>
      </header>

      {paymentConfirmed ? (
        <div className="mt-6 flex gap-3 border-l-4 border-success bg-emerald-50 px-4 py-4 text-emerald-950" role="status">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
          <div><p className="font-black">Pago confirmado</p><p className="mt-1">Tu suscripción ya está activa.</p></div>
        </div>
      ) : null}
      {error ? <p className="mt-5 border-l-4 border-danger bg-red-50 px-4 py-3 font-bold text-danger" role="alert">{error}</p> : null}

      <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]" aria-labelledby="subscription-status-title">
        <div className="border-y border-line py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-slate-500">Premium mensual</p>
              <h2 id="subscription-status-title" className="mt-1 text-2xl font-black text-ink">{active ? 'Suscripción activa' : 'Sin suscripción activa'}</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-black ${active ? 'bg-emerald-50 text-success' : 'bg-slate-100 text-slate-600'}`}>
              {active ? 'Activa' : 'Inactiva'}
            </span>
          </div>

          {subscription || membership ? (
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <div><dt className="text-sm font-bold text-slate-500">Acceso vigente hasta</dt><dd className="mt-1 flex items-center gap-2 font-black text-ink"><CalendarDays className="h-5 w-5 text-brand" />{formatDate(membership?.endDate || subscription.membership?.endDate)}</dd></div>
              <div><dt className="text-sm font-bold text-slate-500">Renovación</dt><dd className="mt-1 font-black text-ink">{autoRenew ? `Automática · ${formatDate(subscription.nextBillingAt)}` : 'No automática'}</dd></div>
              <div><dt className="text-sm font-bold text-slate-500">Medio de pago</dt><dd className="mt-1 flex items-center gap-2 font-black text-ink"><CreditCard className="h-5 w-5 text-brand" />{subscription?.cardBrand ? `${subscription.cardBrand} terminada en ${subscription.cardLast4}` : 'Pago por un mes'}</dd></div>
              <div><dt className="text-sm font-bold text-slate-500">Estado del cobro</dt><dd className="mt-1 font-black text-ink">{subscription?.paymentStatus === 'exitoso' ? 'Confirmado por Culqi' : subscription?.paymentStatus || subscription?.status || 'Confirmado'}</dd></div>
            </dl>
          ) : <p className="mt-5 text-slate-600">Aún no registras una suscripción.</p>}
        </div>

        <aside className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-2">
          <div className="flex items-start gap-3 text-sm leading-6 text-slate-600"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" /><p>Los cobros se procesan de forma segura mediante Culqi.</p></div>
          {active ? <Button className="mt-5 w-full" onClick={() => navigate(`/simulacro/${categoryId}?mode=exam`)}>Rendir simulacro</Button> : <Button as={Link} to="/planes" className="mt-5 w-full">Ver plan</Button>}
          {autoRenew ? <button type="button" className="mt-3 min-h-11 w-full rounded-lg border border-line px-3 font-bold text-brand hover:bg-blue-50" onClick={() => setCancelOpen(true)}>Cancelar renovación</button> : null}
        </aside>
      </section>

      <section className="mt-9" aria-labelledby="receipts-title">
        <h2 id="receipts-title" className="font-display text-2xl font-black text-ink">Pagos y comprobantes</h2>
        <p className="mt-1 text-slate-600">Descarga la representación en PDF y el archivo XML cuando SUNAT los acepte.</p>
        {payments.length ? (
          <div className="mt-5 divide-y divide-line border-y border-line">
            {payments.map((payment) => {
              const receipt = paymentReceipt(payment);
              const accepted = receipt?.estado_sunat === 'aceptado';
              return (
                <article key={payment.id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex min-w-0 gap-3">
                    <FileText className="mt-0.5 h-6 w-6 shrink-0 text-brand" />
                    <div className="min-w-0">
                      <p className="font-black text-ink">{payment.planes_membresia?.nombre || 'Plan Premium'} · S/ {Number(payment.monto).toFixed(2)}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatDate(payment.fecha_pago || payment.creado_en)} · {payment.estado === 'exitoso' ? 'Pago confirmado' : payment.estado}</p>
                      {receipt ? <p className="mt-1 text-sm font-semibold text-slate-600">{receipt.tipo_comprobante} {receipt.serie}-{receipt.numero} · {accepted ? 'Aceptada por SUNAT' : 'Emisión pendiente'}</p> : <p className="mt-1 text-sm text-slate-500">Comprobante en preparación</p>}
                    </div>
                  </div>
                  {receipt ? (
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 font-bold text-brand hover:bg-blue-50 disabled:opacity-60" onClick={() => openReceipt(receipt, 'pdf')} disabled={Boolean(working)}>
                        {accepted ? <Download className="h-5 w-5" /> : <RefreshCw className={`h-5 w-5 ${working === `${receipt.id}-pdf` ? 'animate-spin' : ''}`} />}
                        {accepted ? 'PDF' : 'Reintentar emisión'}
                      </button>
                      {accepted ? <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60" onClick={() => openReceipt(receipt, 'xml')} disabled={Boolean(working)}><FileCode2 className="h-5 w-5" />XML</button> : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : <p className="mt-5 border-y border-line py-8 text-center text-slate-500">Aún no tienes pagos registrados.</p>}
      </section>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancelar renovación automática" showAction={false}>
        <p className="text-slate-600">No se realizarán nuevos cobros. Mantendrás el acceso hasta el final del periodo ya pagado.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" className="min-h-12 rounded-lg border border-line px-4 font-bold text-slate-700" onClick={() => setCancelOpen(false)}>Conservar suscripción</button>
          <Button variant="danger" onClick={cancelRenewal} disabled={working === 'cancel'}>{working === 'cancel' ? 'Cancelando...' : 'Confirmar cancelación'}</Button>
        </div>
      </Modal>
    </div>
  );
}
