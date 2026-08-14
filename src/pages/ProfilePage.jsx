import { Calendar, Download, FileText, Mail, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { FULL_EXAM_IS_FREE } from '../data/examRules.js';
import { useAuth } from '../hooks/useAuth.js';
import { api, normalizeCategoryName } from '../services/api.js';

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(user?.stats ?? null);
  const [membership, setMembership] = useState(null);
  const [payments, setPayments] = useState([]);
  const [receiptLoading, setReceiptLoading] = useState(null);
  const [receiptError, setReceiptError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getStats().catch(() => null),
      api.getExamHistory({ page: 0, size: 100 }).catch(() => null),
    ]).then(([apiStats, history]) => {
      const resolvedQuestions = history?.content?.reduce((total, result) => total + Number(result.totalQuestions ?? result.totalPreguntas ?? 0), 0);
      if (apiStats) setStats({
        attempts: apiStats.totalIntentos ?? 0,
        average: apiStats.promedioGeneral ?? 0,
        questions: resolvedQuestions || (apiStats.totalIntentos ?? 0) * 40,
        studyTime: user?.stats?.studyTime ?? '0h 00m',
      });
    }).catch(() => null);

    if (!FULL_EXAM_IS_FREE) {
      Promise.all([
        api.getActiveMembership().catch(() => null),
        api.getPaymentHistory().catch(() => []),
      ]).then(([activeMembership, paymentHistory]) => {
        setMembership(activeMembership);
        setPayments(paymentHistory || []);
      });
    }
  }, [user?.stats?.studyTime]);

  const openReceipt = async (receiptId) => {
    setReceiptLoading(receiptId);
    setReceiptError('');
    try {
      const receipt = await api.getReceipt(receiptId);
      if (!receipt.urls?.pdf) throw new Error('El PDF todavia no esta disponible.');
      window.open(receipt.urls.pdf, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setReceiptError(error.message);
    } finally {
      setReceiptLoading(null);
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Perfil</h1>
        <p className="mt-2 text-slate-600">Datos de tu cuenta y estadísticas generales.</p>
      </div>
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-6">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-blue-100 text-3xl font-black text-brand">{user?.avatar ?? 'CM'}</span>
          <div className="flex-1">
            <h2 className="text-3xl font-black">{user?.name}</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-brand" /> {user?.email}</span>
              <span className="flex flex-wrap items-center gap-2">
                <User className="h-4 w-4 text-brand" />
                Categoría principal {user?.categoryConfirmed ? normalizeCategoryName(user?.category) : 'sin elegir'}
                <Link to="/dashboard?chooseCategory=1" className="font-bold text-brand hover:underline">Cambiar</Link>
              </span>
              <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-brand" /> Registro {user?.registeredAt}</span>
              <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-brand" /> {FULL_EXAM_IS_FREE ? 'Acceso al simulador' : `Plan ${membership?.planName ?? 'Sin membresía activa'}`}</span>
            </div>
          </div>
        </div>
      </Card>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={User} label="Simulacros rendidos" value={stats?.attempts ?? 0} tone="green" />
        <StatCard icon={User} label="Promedio" value={`${stats?.average ?? 0}%`} tone="orange" />
        <StatCard icon={User} label="Preguntas resueltas" value={stats?.questions ?? 0} tone="blue" />
        <StatCard icon={User} label="Tiempo de estudio" value={stats?.studyTime ?? '0h 00m'} tone="violet" />
      </section>
      {!FULL_EXAM_IS_FREE ? (
        <section aria-labelledby="payment-history-title">
          <h2 id="payment-history-title" className="text-2xl font-black text-ink">Pagos y comprobantes</h2>
          {receiptError ? <p className="mt-3 border-l-4 border-danger bg-red-50 px-4 py-3 text-sm font-bold text-danger" role="alert">{receiptError}</p> : null}
          {payments.length ? (
            <div className="mt-4 divide-y divide-line border-y border-line">
              {payments.map((payment) => {
                const receipt = payment.comprobantes_electronicos?.[0];
                return (
                  <div key={payment.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <FileText className="mt-0.5 h-6 w-6 shrink-0 text-brand" />
                      <div className="min-w-0">
                        <p className="font-black text-ink">{payment.planes_membresia?.nombre || 'Acceso Premium'} · S/ {Number(payment.monto).toFixed(2)}</p>
                        <p className="mt-1 text-sm text-slate-600">{new Date(payment.fecha_pago || payment.creado_en).toLocaleDateString('es-PE')} · {payment.estado === 'exitoso' ? 'Pago confirmado' : payment.estado}</p>
                        {receipt ? <p className="mt-1 text-sm text-slate-600">{receipt.tipo_comprobante} {receipt.serie}-{receipt.numero} · SUNAT {receipt.estado_sunat}</p> : null}
                      </div>
                    </div>
                    {receipt ? <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-4 font-bold text-brand hover:bg-blue-50 disabled:opacity-60" onClick={() => openReceipt(receipt.id)} disabled={receiptLoading === receipt.id}><Download className="h-5 w-5" />{receiptLoading === receipt.id ? 'Abriendo...' : 'Descargar PDF'}</button> : null}
                  </div>
                );
              })}
            </div>
          ) : <p className="mt-3 text-slate-600">Aun no tienes pagos registrados.</p>}
        </section>
      ) : null}
    </div>
  );
}
