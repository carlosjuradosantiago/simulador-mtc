import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Target,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { OFFICIAL_EXAM_RULES } from '../data/examRules.js';
import { LEGAL_TERMS_VERSION } from '../data/legal.js';
import { useAuth } from '../hooks/useAuth.js';
import { api, normalizeCategoryName, resolveCategoryId } from '../services/api.js';

const CULQI_CHECKOUT_SRC = 'https://js.culqi.com/checkout-js';
const CULQI_3DS_SRC = 'https://3ds.culqi.com';
const fallbackPlan = { id: 1, name: 'Premium', price: 1200, durationMonths: 1 };

const benefits = [
  `Simulacros de ${OFFICIAL_EXAM_RULES.questionCount} preguntas por categoria`,
  `${OFFICIAL_EXAM_RULES.durationMinutes} minutos y resultado que mide tu preparacion`,
  'Analisis de errores y temas que necesitas reforzar',
  'Practicas cortas gratuitas cuando quieras seguir aprendiendo',
];

function priceLabel(priceInCents) {
  return `S/ ${Math.round(Number(priceInCents || 0) / 100)}`;
}

function loadScript(src, globalName) {
  if (window[globalName]) return Promise.resolve();
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error('No pudimos cargar la pasarela de pago.')), { once: true });
    document.head.appendChild(script);
  });
}

function validateBilling(form) {
  const documentNumber = form.documentNumber.replace(/\D/g, '');
  if (form.receiptType === 'factura') {
    if (documentNumber.length !== 11) return 'Ingresa un RUC valido de 11 digitos.';
    if (form.businessName.trim().length < 3) return 'Ingresa la razon social.';
    if (form.fiscalAddress.trim().length < 5) return 'Ingresa la direccion fiscal.';
  } else if (documentNumber.length !== 8) {
    return 'Ingresa un DNI valido de 8 digitos.';
  }
  if (form.customerName.trim().length < 3) return 'Ingresa el nombre del titular.';
  if (form.phone && !/^\d{9}$/.test(form.phone.replace(/\D/g, ''))) return 'Ingresa un celular de 9 digitos.';
  return '';
}

export default function PlansPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = resolveCategoryId(searchParams.get('category') || user?.category);
  const examPath = `/simulacro/${categoryId}?mode=exam`;
  const [plan, setPlan] = useState(fallbackPlan);
  const [membership, setMembership] = useState(null);
  const [hadMembership, setHadMembership] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [paymentChoice, setPaymentChoice] = useState('tarjeta');
  const [acceptRecurring, setAcceptRecurring] = useState(false);
  const [acceptLegal, setAcceptLegal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [form, setForm] = useState({
    receiptType: 'boleta',
    documentNumber: '',
    customerName: user?.name || '',
    businessName: '',
    fiscalAddress: '',
    phone: '',
  });
  const attemptRef = useRef(null);
  const culqiRef = useRef(null);
  const deviceIdRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getPlans(),
      api.getActiveMembership().catch(() => null),
      api.getMemberships().catch(() => []),
      api.getSubscription().catch(() => null),
      api.getBillingData().catch(() => null),
      api.getPaymentConfig(),
      loadScript(CULQI_CHECKOUT_SRC, 'CulqiCheckout'),
      loadScript(CULQI_3DS_SRC, 'Culqi3DS'),
    ]).then(async ([plans, activeMembership, memberships, activeSubscription, billing, paymentConfig]) => {
      if (cancelled) return;
      const selectedPlan = plans?.[0] || fallbackPlan;
      setPlan(selectedPlan);
      setMembership(activeMembership);
      setHadMembership(memberships.length > 0);
      setSubscription(activeSubscription);
      setConfig(paymentConfig);
      setForm((current) => ({
        ...current,
        receiptType: billing?.tipoComprobante === 'factura' ? 'factura' : 'boleta',
        documentNumber: billing?.numeroDocumento || '',
        customerName: [billing?.nombres, billing?.apellidos].filter(Boolean).join(' ') || user?.name || '',
        businessName: billing?.razonSocial || '',
        fiscalAddress: billing?.direccionFiscal || '',
        phone: billing?.telefono || '',
      }));

      if (window.Culqi3DS) {
        window.Culqi3DS.publicKey = paymentConfig.publicKey;
        deviceIdRef.current = await window.Culqi3DS.generateDevice().catch(() => '');
      }
    }).catch((requestError) => {
      if (!cancelled) setError(requestError.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.name]);

  useEffect(() => {
    const handle3dsMessage = (event) => {
      if (event.origin !== window.location.origin || !attemptRef.current) return;
      if (event.data?.loading !== undefined) setProcessing(Boolean(event.data.loading));
      if (event.data?.parameters3DS) processToken(attemptRef.current.tokenId, event.data.parameters3DS);
      if (event.data?.error) {
        setProcessing(false);
        setError(String(event.data.error));
      }
    };
    window.addEventListener('message', handle3dsMessage);
    return () => window.removeEventListener('message', handle3dsMessage);
  });

  const updateForm = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const processToken = async (tokenId, authentication3DS = null) => {
    setProcessing(true);
    setError('');
    try {
      const attempt = attemptRef.current;
      const result = await api.processPayment({
        token_id: tokenId,
        plan_id: plan.id,
        idempotency_key: attempt.idempotencyKey,
        payment_method: attempt.paymentMethod,
        accept_recurring: attempt.paymentMethod === 'tarjeta' && attempt.acceptRecurring,
        accept_legal: acceptLegal,
        terms_version: LEGAL_TERMS_VERSION,
        device_fingerprint_id: deviceIdRef.current || undefined,
        billing: {
          receiptType: form.receiptType,
          documentType: form.receiptType === 'factura' ? 'RUC' : 'DNI',
          documentNumber: form.documentNumber.replace(/\D/g, ''),
          customerName: form.customerName.trim(),
          businessName: form.businessName.trim(),
          fiscalAddress: form.fiscalAddress.trim(),
          phone: form.phone.replace(/\D/g, ''),
        },
        ...(authentication3DS ? { authentication_3DS: authentication3DS } : {}),
      });

      if (result.requires3ds) {
        window.Culqi3DS.settings = {
          charge: {
            totalAmount: plan.price,
            returnUrl: window.location.href,
            currency: 'PEN',
          },
          card: { email: config.checkoutEmail || user.email },
        };
        window.Culqi3DS.options = {
          showModal: true,
          showLoading: true,
          showIcon: true,
          style: { btnColor: '#0f55e8', btnTextColor: '#ffffff' },
        };
        window.Culqi3DS.initAuthentication(tokenId);
        return;
      }

      setSuccess(result);
      if (result.membership?.membership_end) {
        setMembership({ isActive: true, endDate: result.membership.membership_end });
      }
      if (result.subscription) setSubscription(result.subscription);
      attemptRef.current = null;
      window.Culqi3DS?.reset?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setProcessing(false);
    }
  };

  const openCheckout = () => {
    if (membership?.isActive) {
      navigate(examPath);
      return;
    }
    const validationError = validateBilling(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!config || !window.CulqiCheckout) {
      setError('La pasarela todavia no esta lista. Recarga la pagina.');
      return;
    }
    if (paymentChoice === 'tarjeta' && !acceptRecurring) {
      setError('Autoriza el cobro mensual para continuar con la suscripcion.');
      return;
    }
    if (!acceptLegal) {
      setError('Acepta los terminos y la politica de cambios para continuar.');
      return;
    }

    setError('');
    attemptRef.current = {
      idempotencyKey: crypto.randomUUID(),
      tokenId: '',
      paymentMethod: paymentChoice,
      acceptRecurring: paymentChoice === 'tarjeta' && acceptRecurring,
    };
    const settings = {
      title: 'Simulador MTC',
      currency: 'PEN',
      amount: paymentChoice === 'tarjeta' ? 0 : plan.price,
      xculqirsaid: config.rsaId,
      rsapublickey: config.rsaPublicKey,
    };
    const checkoutConfig = {
      settings,
      client: { email: config.checkoutEmail || user.email },
      options: {
        lang: 'es',
        installments: false,
        modal: true,
        paymentMethods: { tarjeta: paymentChoice === 'tarjeta', yape: paymentChoice === 'yape' },
        paymentMethodsSort: [paymentChoice],
      },
      appearance: {
        theme: 'default',
        hiddenBannerContent: false,
        hiddenBanner: false,
        hiddenToolBarAmount: paymentChoice === 'tarjeta',
        hiddenEmail: true,
        menuType: 'sliderTop',
        buttonCardPayText: paymentChoice === 'tarjeta' ? 'Activar suscripcion' : `Pagar ${priceLabel(plan.price)}`,
        defaultStyle: {
          bannerColor: '#082a5f',
          buttonBackground: '#0f55e8',
          menuColor: '#0f55e8',
          linksColor: '#0f55e8',
          buttonTextColor: '#ffffff',
          priceColor: '#10213d',
        },
      },
    };
    const culqi = new window.CulqiCheckout(config.publicKey, checkoutConfig);
    culqi.culqi = () => {
      if (culqi.token?.id) {
        const tokenKind = String(culqi.token?.metadata?.payment_type || culqi.token?.object || '').toLowerCase();
        const method = culqi.token.id.startsWith('ype_') || tokenKind.includes('yape') ? 'yape' : 'tarjeta';
        attemptRef.current = { ...attemptRef.current, tokenId: culqi.token.id, paymentMethod: method };
        culqi.close();
        processToken(culqi.token.id);
      } else if (culqi.error) {
        setError(culqi.error.user_message || culqi.error.merchant_message || 'No se pudo generar el token de pago.');
      }
    };
    culqiRef.current = culqi;
    culqi.open();
  };

  const cancelRecurring = async () => {
    setCancelling(true);
    setError('');
    try {
      const result = await api.cancelSubscription();
      setSubscription(result.subscription);
      setSuccess({ cancellation: true, accessUntil: result.accessUntil });
      setShowCancelDialog(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCancelling(false);
    }
  };

  const hasAccess = membership?.isActive === true;
  const paymentPending = success?.pending === true && !hasAccess;
  const autoRenew = subscription?.autoRenew === true;

  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center px-6 text-center"><div><span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-brand" /><p className="mt-4 text-lg font-bold text-slate-600">Preparando tu acceso seguro...</p></div></div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
      <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-2 font-bold text-slate-600 hover:text-brand"><ArrowLeft className="h-5 w-5" />Volver</Link>

      <header className="mt-3 max-w-3xl">
        <p className="font-bold text-brand">Simulacro completo · {normalizeCategoryName(categoryId)}</p>
        <h1 className="mt-2 font-display text-3xl font-black leading-tight text-ink sm:text-4xl">Acceso Premium al simulador MTC</h1>
        <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">Suscripcion mensual para acceder a todos los simulacros cronometrados.</p>
      </header>

      {!hasAccess && hadMembership ? <div className="mt-5 border-l-4 border-traffic-yellow bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="alert"><p className="font-black">Tu suscripcion mensual no esta activa</p><p>Suscribete nuevamente para volver a rendir simulacros completos.</p></div> : null}

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-10">
        <section aria-labelledby="billing-title">
          <div className="grid border-y border-line sm:grid-cols-3">
            <div className="flex items-center gap-3 py-4 sm:border-r sm:border-line sm:px-3"><Target className="h-7 w-7 shrink-0 text-brand" /><span><strong className="block text-xl text-ink">{OFFICIAL_EXAM_RULES.questionCount}</strong><span className="text-sm text-slate-600">preguntas</span></span></div>
            <div className="flex items-center gap-3 border-t border-line py-4 sm:border-r sm:border-t-0 sm:px-3"><Clock3 className="h-7 w-7 shrink-0 text-brand" /><span><strong className="block text-xl text-ink">{OFFICIAL_EXAM_RULES.durationMinutes} min</strong><span className="text-sm text-slate-600">por simulacro</span></span></div>
            <div className="flex items-center gap-3 border-t border-line py-4 sm:border-t-0 sm:px-3"><Check className="h-7 w-7 shrink-0 text-success" /><span><strong className="block text-xl text-ink">{OFFICIAL_EXAM_RULES.minimumCorrectAnswers}/{OFFICIAL_EXAM_RULES.questionCount}</strong><span className="text-sm text-slate-600">para aprobar</span></span></div>
          </div>

          <h2 id="billing-title" className="mt-7 font-display text-2xl font-black text-ink">Datos del comprobante</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Tipo de comprobante">
            {['boleta', 'factura'].map((type) => (
              <button key={type} type="button" role="radio" aria-checked={form.receiptType === type} className={`min-h-12 rounded-md px-3 font-bold capitalize ${form.receiptType === type ? 'bg-white text-brand shadow-sm' : 'text-slate-600'}`} onClick={() => setForm((current) => ({ ...current, receiptType: type, documentNumber: '' }))}>{type}</button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label={form.receiptType === 'factura' ? 'RUC' : 'DNI'} value={form.documentNumber} onChange={updateForm('documentNumber')} inputMode="numeric" maxLength={form.receiptType === 'factura' ? 11 : 8} autoComplete="off" />
            <Input label="Nombre del titular" value={form.customerName} onChange={updateForm('customerName')} autoComplete="name" />
            <Input label="Celular (opcional)" value={form.phone} onChange={updateForm('phone')} inputMode="tel" maxLength={9} autoComplete="tel" />
            {form.receiptType === 'factura' ? <Input label="Razon social" value={form.businessName} onChange={updateForm('businessName')} autoComplete="organization" /> : null}
            {form.receiptType === 'factura' ? <Input label="Direccion fiscal" className="sm:col-span-2" value={form.fiscalAddress} onChange={updateForm('fiscalAddress')} autoComplete="street-address" /> : null}
          </div>

          <h2 className="mt-7 font-display text-2xl font-black text-ink">Lo que recibes</h2>
          <ul className="mt-4 grid gap-3">
            {benefits.map((benefit) => <li key={benefit} className="flex items-start gap-3 leading-6 text-slate-700"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-success"><Check className="h-4 w-4" /></span>{benefit}</li>)}
          </ul>
        </section>

        <aside className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" aria-label="Resumen de compra">
          <p className="text-sm font-bold text-slate-500">{plan.name} mensual</p>
          <p className="mt-1 font-display text-5xl font-black text-ink">{priceLabel(plan.price)}<span className="ml-1 text-base font-bold text-slate-500">/mes</span></p>
          <p className="mt-1 text-sm text-slate-600">Culqi procesa el pago. Nosotros nunca recibimos el numero completo de tu tarjeta.</p>

          {!hasAccess ? <>
            <h2 className="mt-6 font-display text-xl font-black text-ink">Elige como pagar</h2>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Forma de pago">
              <button
                type="button"
                role="radio"
                aria-checked={paymentChoice === 'tarjeta'}
                className={`min-h-14 rounded-md px-3 py-2 text-left text-sm font-bold ${paymentChoice === 'tarjeta' ? 'bg-white text-brand shadow-sm' : 'text-slate-600'}`}
                onClick={() => { setPaymentChoice('tarjeta'); setError(''); }}
              >
                <span className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Tarjeta</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={paymentChoice === 'yape'}
                className={`min-h-14 rounded-md px-3 py-2 text-left text-sm font-bold ${paymentChoice === 'yape' ? 'bg-white text-brand shadow-sm' : 'text-slate-600'}`}
                onClick={() => { setPaymentChoice('yape'); setError(''); }}
              >
                <span className="flex items-center gap-2"><Smartphone className="h-5 w-5" />Yape</span>
              </button>
            </div>
            {paymentChoice === 'tarjeta' ? <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-5 text-slate-700">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-blue-600" checked={acceptRecurring} onChange={(event) => setAcceptRecurring(event.target.checked)} />
              <span>Autorizo el cobro de {priceLabel(plan.price)} cada mes hasta que cancele la suscripcion.</span>
            </label> : <p className="mt-4 text-sm leading-5 text-slate-600">Con Yape, tu suscripcion mensual queda activa durante un mes.</p>}
          </> : null}

          {hasAccess ? <div className="mt-5 border-l-4 border-success bg-emerald-50 px-4 py-3 text-sm text-emerald-950"><p className="font-black">Tu suscripcion esta activa</p>{membership.endDate ? <p className="mt-1">Vigente hasta {new Date(membership.endDate).toLocaleDateString('es-PE')}.</p> : null}{autoRenew ? <p className="mt-1 font-bold">Renovacion automatica activa{subscription.nextBillingAt ? ` · proximo cobro ${new Date(subscription.nextBillingAt).toLocaleDateString('es-PE')}` : ''}.</p> : null}</div> : null}
          {paymentPending ? <div className="mt-5 border-l-4 border-traffic-yellow bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status"><p className="font-black">Suscripcion creada</p><p className="mt-1">Culqi esta confirmando el primer cobro. Tu acceso se activara cuando llegue la confirmacion.</p></div> : null}
          {success?.cancellation ? <div className="mt-5 border-l-4 border-brand bg-blue-50 px-4 py-3 text-sm text-blue-950" role="status"><p className="font-black">Renovacion cancelada</p><p className="mt-1">No habra mas cobros. Tu acceso conserva la fecha ya pagada.</p></div> : null}
          {success && !success.pending && !success.cancellation ? <div className="mt-5 border-l-4 border-success bg-emerald-50 px-4 py-3 text-sm text-emerald-950" role="status"><p className="flex items-center gap-2 font-black"><FileCheck2 className="h-5 w-5" />Pago confirmado</p><p className="mt-1">{success.receipt?.number ? `${success.receipt.type} ${success.receipt.number} generada correctamente.` : 'Tu acceso esta activo. El comprobante quedo registrado para revision.'}</p></div> : null}
          {error ? <p className="mt-4 border-l-4 border-danger bg-red-50 px-4 py-3 text-sm font-bold text-danger" role="alert">{error}</p> : null}

          {!hasAccess ? <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-5 text-slate-700">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-blue-600" checked={acceptLegal} onChange={(event) => setAcceptLegal(event.target.checked)} />
            <span>He leído y acepto los <Link className="font-bold text-brand hover:underline" to="/terminos-y-condiciones" target="_blank" rel="noopener noreferrer">Términos y condiciones</Link> y la <Link className="font-bold text-brand hover:underline" to="/politica-de-cambios-y-devoluciones" target="_blank" rel="noopener noreferrer">Política de cambios y devoluciones</Link>.</span>
          </label> : null}

          <Button size="lg" className="mt-5 w-full" onClick={hasAccess ? () => navigate(examPath) : openCheckout} disabled={processing || cancelling || paymentPending}>
            {hasAccess ? <Target className="h-6 w-6" /> : <LockKeyhole className="h-5 w-5" />}
            {processing ? 'Confirmando pago...' : paymentPending ? 'Esperando a Culqi...' : hasAccess ? 'Rendir simulacro' : `Suscribirme por ${priceLabel(plan.price)}/mes`}
            <ArrowRight className="h-5 w-5" />
          </Button>
          {hasAccess && autoRenew ? <Button variant="secondary" className="mt-3 w-full" onClick={() => setShowCancelDialog(true)} disabled={cancelling}>Cancelar renovacion automatica</Button> : null}
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />Culqi procesa la tarjeta dentro de su formulario protegido y aplica autenticacion 3DS cuando el banco la solicita.</p>
        </aside>
      </div>

      <Modal
        open={showCancelDialog}
        title="¿Detener los cobros mensuales?"
        onClose={() => { if (!cancelling) setShowCancelDialog(false); }}
        showAction={false}
        className="border-t-4 border-t-danger"
        childrenClassName="text-base"
      >
        <p>Tu acceso seguira activo hasta {membership?.endDate ? new Date(membership.endDate).toLocaleDateString('es-PE') : 'que termine el mes pagado'}. Despues no habra nuevos cobros.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" className="w-full" onClick={() => setShowCancelDialog(false)} disabled={cancelling}>Conservar renovacion</Button>
          <Button variant="danger" className="w-full" onClick={cancelRecurring} disabled={cancelling}>{cancelling ? 'Deteniendo cobros...' : 'Si, detener cobros'}</Button>
        </div>
      </Modal>
    </div>
  );
}
