import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { OFFICIAL_EXAM_RULES } from '../data/examRules.js';
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
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
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
      api.getBillingData().catch(() => null),
      api.getPaymentConfig(),
      loadScript(CULQI_CHECKOUT_SRC, 'CulqiCheckout'),
      loadScript(CULQI_3DS_SRC, 'Culqi3DS'),
    ]).then(async ([plans, activeMembership, billing, paymentConfig]) => {
      if (cancelled) return;
      const selectedPlan = plans?.[0] || fallbackPlan;
      setPlan(selectedPlan);
      setMembership(activeMembership);
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
          card: { email: user.email },
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
      setMembership({ isActive: true, endDate: result.membership?.membership_end });
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

    setError('');
    attemptRef.current = {
      idempotencyKey: crypto.randomUUID(),
      tokenId: '',
      paymentMethod: 'tarjeta',
    };
    const settings = {
      title: 'Simulador MTC',
      currency: 'PEN',
      amount: plan.price,
      xculqirsaid: config.rsaId,
      rsapublickey: config.rsaPublicKey,
    };
    const checkoutConfig = {
      settings,
      client: { email: user.email },
      options: {
        lang: 'es',
        installments: false,
        modal: true,
        paymentMethods: { tarjeta: true, yape: true },
        paymentMethodsSort: ['tarjeta', 'yape'],
      },
      appearance: {
        theme: 'default',
        hiddenBannerContent: false,
        hiddenBanner: false,
        hiddenToolBarAmount: false,
        hiddenEmail: true,
        menuType: 'sliderTop',
        buttonCardPayText: `Pagar ${priceLabel(plan.price)}`,
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
        const method = String(culqi.token?.metadata?.payment_type || culqi.token?.object || '').toLowerCase().includes('yape') ? 'yape' : 'tarjeta';
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

  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center px-6 text-center"><div><span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-brand" /><p className="mt-4 text-lg font-bold text-slate-600">Preparando tu acceso seguro...</p></div></div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
      <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-2 font-bold text-slate-600 hover:text-brand"><ArrowLeft className="h-5 w-5" />Volver</Link>

      <header className="mt-3 max-w-3xl">
        <p className="font-bold text-brand">Simulacro completo · {normalizeCategoryName(categoryId)}</p>
        <h1 className="mt-2 font-display text-3xl font-black leading-tight text-ink sm:text-4xl">Activa un mes de simulacros completos</h1>
        <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">Un solo pago de {priceLabel(plan.price)}. Sin renovacion automatica.</p>
      </header>

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
          <p className="text-sm font-bold text-slate-500">{plan.name} · {plan.durationMonths || 1} mes</p>
          <p className="mt-1 font-display text-5xl font-black text-ink">{priceLabel(plan.price)}</p>
          <p className="mt-1 text-sm text-slate-600">Pago unico. No guardamos datos de tu tarjeta.</p>

          {config?.testMode ? <div className="mt-5 border-l-4 border-traffic-yellow bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-950"><p className="font-black">Prueba segura en DEV</p><p className="mt-1">Culqi no realizara un cobro real y SUNAT BETA no genera un comprobante fiscal.</p></div> : null}
          {membership?.isActive ? <div className="mt-5 border-l-4 border-success bg-emerald-50 px-4 py-3 text-sm text-emerald-950"><p className="font-black">Tu acceso ya esta activo</p>{membership.endDate ? <p className="mt-1">Vigente hasta {new Date(membership.endDate).toLocaleDateString('es-PE')}.</p> : null}</div> : null}
          {success ? <div className="mt-5 border-l-4 border-success bg-emerald-50 px-4 py-3 text-sm text-emerald-950" role="status"><p className="flex items-center gap-2 font-black"><FileCheck2 className="h-5 w-5" />Pago confirmado</p><p className="mt-1">{success.receipt?.status === 'aceptado' ? `${success.receipt.type} ${success.receipt.number} aceptada por SUNAT BETA.` : 'Tu acceso esta activo. El comprobante quedo registrado para revision.'}</p></div> : null}
          {error ? <p className="mt-4 border-l-4 border-danger bg-red-50 px-4 py-3 text-sm font-bold text-danger" role="alert">{error}</p> : null}

          <Button size="lg" className="mt-5 w-full" onClick={success || membership?.isActive ? () => navigate(examPath) : openCheckout} disabled={processing}>
            {success || membership?.isActive ? <Target className="h-6 w-6" /> : <LockKeyhole className="h-5 w-5" />}
            {processing ? 'Confirmando pago...' : success || membership?.isActive ? 'Rendir simulacro' : `Pagar ${priceLabel(plan.price)} con Culqi`}
            <ArrowRight className="h-5 w-5" />
          </Button>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />Culqi procesa la tarjeta dentro de su formulario protegido y aplica autenticacion 3DS cuando el banco la solicita.</p>
        </aside>
      </div>
    </div>
  );
}
