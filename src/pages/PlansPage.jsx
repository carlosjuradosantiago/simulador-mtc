import { ArrowLeft, Banknote, CheckCircle2, CreditCard, Gift, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { BRAND_NAME } from '../data/brand.js';
import { formatCurrency, planBenefits, plans as fallbackPlans } from '../data/mockPlans.js';
import { api } from '../services/api.js';
import { cn } from '../utils/cn.js';

const methods = [
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'billetera', label: 'Billetera digital', icon: Wallet },
  { id: 'transferencia', label: 'Transferencia', icon: Banknote },
];

const confidenceItems = [
  { title: '7 días de garantía', text: 'Si no estás satisfecho, te devolvemos tu dinero.', icon: ShieldCheck },
  { title: 'Cancela cuando quieras', text: 'Sin permanencia. Puedes cancelar desde tu cuenta.', icon: CheckCircle2 },
  { title: 'Pago 100% seguro', text: 'Tus datos están protegidos con cifrado bancario.', icon: Lock },
];

export default function PlansPage() {
  const plansRef = useRef(null);
  const initialPlan = useMemo(() => JSON.parse(window.localStorage.getItem('simulamanejo:selectedPlan') ?? 'null') ?? fallbackPlans.find((plan) => plan.recommended) ?? fallbackPlans[0], []);
  const [plans, setPlans] = useState(fallbackPlans);
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [method, setMethod] = useState('tarjeta');
  const [successOpen, setSuccessOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMembership, setActiveMembership] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ holder: '', cardNumber: '', expiry: '', cvv: '', document: '' });
  const [paymentErrors, setPaymentErrors] = useState({});
  const subtotal = selectedPlan.price;
  const discount = selectedPlan.discount ?? 0;
  const total = subtotal - discount;
  const activeSamePlan = activeMembership?.isActive && Number(activeMembership.durationMonths) === Number(selectedPlan.durationMonths);

  useEffect(() => {
    Promise.all([
      api.getPlans(),
      api.getPaymentConfig().catch(() => null),
      api.getActiveMembership().catch(() => null),
    ]).then(([apiPlans,, membership]) => {
      if (!apiPlans?.length) return;
      setPlans(apiPlans);
      setSelectedPlan((currentPlan) => apiPlans.find((plan) => String(plan.id) === String(currentPlan.id)) ?? apiPlans[0]);
      if (membership?.isActive) setActiveMembership(membership);
    }).catch(() => null);
  }, []);

  const selectPlan = (plan) => {
    setSelectedPlan(plan);
    window.localStorage.setItem('simulamanejo:selectedPlan', JSON.stringify(plan));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setPaymentErrors({});
    if (activeSamePlan) {
      setMessage('Ya tienes este plan activo en tu cuenta.');
      return;
    }

    const digitsOnlyCard = paymentForm.cardNumber.replace(/\D/g, '');
    const nextPaymentErrors = {};
    if (!paymentForm.holder.trim()) nextPaymentErrors.holder = 'Campo obligatorio';
    if (digitsOnlyCard.length < 12) nextPaymentErrors.cardNumber = 'Ingresa un número de tarjeta válido.';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(paymentForm.expiry.trim())) nextPaymentErrors.expiry = 'Usa el formato MM/AA.';
    if (!/^\d{3,4}$/.test(paymentForm.cvv.trim())) nextPaymentErrors.cvv = 'CVV inválido.';
    if (!paymentForm.document.trim()) nextPaymentErrors.document = 'Campo obligatorio';
    if (Object.keys(nextPaymentErrors).length) {
      setPaymentErrors(nextPaymentErrors);
      setMessage('Completa los datos de pago para continuar.');
      return;
    }

    setLoading(true);
    try {
      const subscription = await api.subscribePlan(selectedPlan.id);
      window.localStorage.setItem('simulamanejo:activePlan', JSON.stringify({ ...selectedPlan, activatedAt: new Date().toISOString(), subscription }));
      setSuccessOpen(true);
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const applyPromoCode = () => {
    const normalizedCode = promoCode.trim().toUpperCase();
    setPromoMessage(normalizedCode ? `El código ${normalizedCode} fue revisado. No hay descuentos disponibles para este plan.` : 'Ingresa un código promocional para validarlo.');
  };

  return (
    <div className="grid gap-5 pt-2 xl:grid-cols-[1fr_628px]">
      <section className="grid gap-5 self-start">
        <div>
          <Link to="/dashboard" className="mb-4 inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-brand"><ArrowLeft className="h-5 w-5" /> Volver al dashboard</Link>
          <h1 className="text-4xl font-black">Elige tu plan y suscríbete</h1>
          <p className="mt-2 text-lg text-slate-600">Accede a todos los simulacros, estadísticas y herramientas para aprobar tu examen de manejo.</p>
        </div>

        <section ref={plansRef} className="grid scroll-mt-24 gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const selected = selectedPlan.id === plan.id;
            return (
              <Card key={plan.id} className={cn('relative p-5 shadow-sm', selected && 'border-brand ring-2 ring-blue-100')}>
                {plan.recommended ? <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 px-7">Más recomendado</Badge> : null}
                <h2 className="text-2xl font-black">{plan.name}</h2>
                <p className="mt-1 text-slate-500">{plan.subtitle}</p>
                <p className="mt-7 text-4xl font-black">{formatCurrency(plan.price)} <span className="text-base font-semibold text-slate-500">{plan.period}</span></p>
                {plan.savings ? <p className="mt-2 font-semibold text-success">{plan.savings}</p> : <div className="mt-8" />}
                <div className="mt-6 grid gap-3 text-sm font-medium text-slate-700">
                  {(plan.features?.length ? plan.features : planBenefits).map((benefit) => <span key={benefit} className="inline-flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> {benefit}</span>)}
                </div>
                <Button type="button" onClick={() => selectPlan(plan)} variant="secondary" className={cn('mt-6 w-full', selected && 'border-brand bg-blue-50 text-brand')}>
                  <span className={cn('h-5 w-5 rounded-full border border-line', selected && 'border-brand bg-brand ring-4 ring-blue-100')} />
                  {selected ? 'Plan seleccionado' : 'Seleccionar plan'}
                </Button>
              </Card>
            );
          })}
        </section>

        <Card className="bg-blue-50 p-5 ring-1 ring-blue-100 shadow-sm">
          <p className="flex items-center gap-5 text-lg text-slate-700"><Gift className="h-12 w-12 text-brand" /> Con cualquier plan obtienes acceso a todas las actualizaciones y nuevas funciones, sin costos adicionales.</p>
        </Card>

        <div>
          <h2 className="mb-3 text-xl font-black">Compra con confianza</h2>
          <section className="grid gap-4 md:grid-cols-3">
            {confidenceItems.map((item) => (
              <Card key={item.title} className="flex items-center gap-4 p-4 shadow-sm">
                <item.icon className="h-12 w-12 rounded-full bg-blue-50 p-2 text-brand" />
                <span><strong className="block">{item.title}</strong><span className="mt-1 block text-sm text-slate-600">{item.text}</span></span>
              </Card>
            ))}
          </section>
        </div>

        <p className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-5 w-5" /> {BRAND_NAME} no almacena los datos de tu tarjeta. Tu pago está protegido.</p>
      </section>

      <aside className="grid gap-4 self-start">
        <Card className="p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">Resumen de tu orden</h2>
            <button type="button" className="font-semibold text-brand" onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Editar</button>
          </div>
          {activeMembership?.isActive ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              Plan activo: {activeMembership.planName}. Vigente hasta {activeMembership.endDate ? new Date(activeMembership.endDate).toLocaleDateString('es-PE') : 'la fecha indicada en tu cuenta'}.
            </div>
          ) : null}
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-xl bg-blue-50 text-brand"><CreditCard className="h-7 w-7" /></span><span><strong className="block text-lg">Plan {selectedPlan.name}</strong><span className="text-sm text-slate-500">Acceso completo por {selectedPlan.durationMonths ?? 1} mes(es)</span></span></div>
              <strong className="text-xl">{formatCurrency(selectedPlan.price)}</strong>
            </div>
          </div>
          <div className="mt-5 grid gap-3 border-b border-line pb-5 text-base">
            <span className="flex justify-between"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></span>
            <span className="flex justify-between text-success"><span>Descuento</span><strong>-{formatCurrency(discount)}</strong></span>
          </div>
          <div className="mt-5 flex items-center justify-between"><span className="text-xl font-black">Total a pagar</span><span className="text-3xl font-black text-brand">{formatCurrency(total)}</span></div>
          <div className="mt-4 flex justify-between text-sm text-slate-600"><span>Próximo cobro</span><span>15 de agosto de 2025</span></div>
        </Card>

        <Card className="p-5 shadow-sm">
          <h2 className="text-xl font-black">Método de pago</h2>
          <div className="mt-5 grid overflow-hidden rounded-lg border border-line md:grid-cols-3">
            {methods.map((item) => (
              <button key={item.id} type="button" onClick={() => setMethod(item.id)} className={cn('flex h-11 items-center justify-center gap-2 border-line px-4 text-sm font-bold', method === item.id ? 'bg-blue-50 text-brand ring-1 ring-brand' : 'bg-white text-slate-600')}>
                <item.icon className="h-5 w-5" /> {item.label}
              </button>
            ))}
          </div>
          <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
            <Input label="Nombre del titular" placeholder="Ej. Carlos Andrés Mendoza" value={paymentForm.holder} error={paymentErrors.holder} onChange={(event) => setPaymentForm({ ...paymentForm, holder: event.target.value })} />
            <Input label="Número de tarjeta" placeholder="1234 5678 9012 3456" value={paymentForm.cardNumber} error={paymentErrors.cardNumber} onChange={(event) => setPaymentForm({ ...paymentForm, cardNumber: event.target.value })} />
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="MM/AA" placeholder="MM/AA" value={paymentForm.expiry} error={paymentErrors.expiry} onChange={(event) => setPaymentForm({ ...paymentForm, expiry: event.target.value })} />
              <Input label="CVV" placeholder="123" value={paymentForm.cvv} error={paymentErrors.cvv} onChange={(event) => setPaymentForm({ ...paymentForm, cvv: event.target.value })} />
              <Input label="Documento" placeholder="Ej. 1012345678" value={paymentForm.document} error={paymentErrors.document} onChange={(event) => setPaymentForm({ ...paymentForm, document: event.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_108px]">
              <Input label="Código promocional (opcional)" placeholder="Ingresa tu código" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} />
              <Button type="button" variant="secondary" className="self-end" onClick={applyPromoCode}>Aplicar</Button>
            </div>
            {promoMessage ? <p className="rounded-lg bg-blue-50 p-3 text-sm font-bold text-brand">{promoMessage}</p> : null}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="flex items-center gap-2 font-black"><Lock className="h-5 w-5" /> Pago seguro y protegido</p>
              <p className="mt-1">Tu información se transmite encriptada y está protegida. Puedes cancelar tu suscripción cuando quieras.</p>
            </div>
            {message ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-danger">{message}</p> : null}
            <Button type="submit" size="lg" className="w-full" disabled={loading || activeSamePlan}><Lock className="h-5 w-5" /> {loading ? 'Activando...' : activeSamePlan ? 'Plan activo' : 'Suscribirme ahora'}</Button>
            <p className="text-center text-xs text-slate-500">Al suscribirte, aceptas nuestros Términos y Condiciones y Política de Privacidad.</p>
          </form>
        </Card>
      </aside>

      <Modal open={successOpen} title="Suscripción activada correctamente" onClose={() => setSuccessOpen(false)} actionLabel="Continuar">
        Tu plan {selectedPlan.name} quedó activo y asociado a tu usuario.
      </Modal>
    </div>
  );
}
