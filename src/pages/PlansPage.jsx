import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { OFFICIAL_EXAM_RULES } from '../data/examRules.js';
import { useAuth } from '../hooks/useAuth.js';
import { api, normalizeCategoryName, resolveCategoryId } from '../services/api.js';

const fallbackPlan = {
  id: 1,
  name: 'Premium',
  price: 1200,
  durationMonths: 1,
};

const benefits = [
  `Simulacros de ${OFFICIAL_EXAM_RULES.questionCount} preguntas en todas las categorías`,
  `Cronómetro de ${OFFICIAL_EXAM_RULES.durationMinutes} minutos como en una prueba real`,
  'Resultados y temas débiles basados en tus simulacros',
  'Prácticas libres de 5 preguntas siempre gratuitas',
];

function priceLabel(priceInCents) {
  return `S/${Math.round(Number(priceInCents || 0) / 100)}`;
}

export default function PlansPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = resolveCategoryId(searchParams.get('category') || user?.category);
  const examPath = `/simulacro/${categoryId}?mode=exam`;
  const [plan, setPlan] = useState(fallbackPlan);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.getPlans(),
      api.getActiveMembership().catch(() => null),
    ]).then(([plans, activeMembership]) => {
      if (cancelled) return;
      if (plans?.length) setPlan(plans[0]);
      setMembership(activeMembership);
    }).catch((requestError) => {
      if (!cancelled) setError(requestError.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const activateAndStart = async () => {
    if (membership?.isActive) {
      navigate(examPath);
      return;
    }

    setActivating(true);
    setError('');
    try {
      await api.simulatePayment(plan.id);
      navigate(examPath);
    } catch (requestError) {
      setError(requestError.message);
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div>
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-brand" />
          <p className="mt-4 text-lg font-bold text-slate-600">Revisando tu acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-2 font-bold text-slate-600 hover:text-brand">
        <ArrowLeft className="h-5 w-5" />
        Volver
      </Link>

      <header className="mt-4 max-w-3xl">
        <p className="font-bold text-brand">Simulacro completo · {normalizeCategoryName(categoryId)}</p>
        <h1 className="mt-2 font-display text-3xl font-black leading-tight text-ink sm:text-4xl">
          Mide tu preparación con la prueba completa
        </h1>
        <p className="mt-3 text-lg leading-7 text-slate-600">
          La práctica corta sigue siendo gratuita. El acceso de un mes habilita los simulacros cronometrados que sí cuentan en tu progreso.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <section aria-labelledby="exam-details-title">
          <h2 id="exam-details-title" className="font-display text-2xl font-black text-ink">Así es el simulacro</h2>
          <div className="mt-4 grid border-y border-line sm:grid-cols-3">
            <div className="flex items-center gap-3 py-4 sm:border-r sm:border-line sm:px-4">
              <Target className="h-7 w-7 shrink-0 text-brand" />
              <span><strong className="block text-xl text-ink">{OFFICIAL_EXAM_RULES.questionCount}</strong><span className="text-sm text-slate-600">preguntas reales</span></span>
            </div>
            <div className="flex items-center gap-3 border-t border-line py-4 sm:border-r sm:border-t-0 sm:px-4">
              <Clock3 className="h-7 w-7 shrink-0 text-brand" />
              <span><strong className="block text-xl text-ink">{OFFICIAL_EXAM_RULES.durationMinutes} min</strong><span className="text-sm text-slate-600">tiempo máximo</span></span>
            </div>
            <div className="flex items-center gap-3 border-t border-line py-4 sm:border-t-0 sm:px-4">
              <Check className="h-7 w-7 shrink-0 text-success" />
              <span><strong className="block text-xl text-ink">{OFFICIAL_EXAM_RULES.minimumCorrectAnswers}/{OFFICIAL_EXAM_RULES.questionCount}</strong><span className="text-sm text-slate-600">para aprobar</span></span>
            </div>
          </div>

          <h2 className="mt-8 font-display text-2xl font-black text-ink">Incluye</h2>
          <ul className="mt-4 grid gap-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-base leading-6 text-slate-700">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-success">
                  <Check className="h-4 w-4" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>

        <aside className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" aria-label="Resumen del acceso">
          <p className="text-sm font-bold text-slate-500">Acceso por {plan.durationMonths || 1} mes</p>
          <p className="mt-1 font-display text-5xl font-black text-ink">{priceLabel(plan.price)}</p>
          <p className="mt-1 text-sm text-slate-600">Un solo pago. Sin renovación automática.</p>

          {membership?.isActive ? (
            <div className="mt-5 border-l-4 border-success bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              <p className="font-black">Tu acceso ya está activo</p>
              <p className="mt-1">
                Vigente hasta {new Date(membership.endDate).toLocaleDateString('es-PE')}.
              </p>
            </div>
          ) : (
            <div className="mt-5 border-l-4 border-traffic-yellow bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-950">
              <p className="flex items-center gap-2 font-black">
                <ShieldCheck className="h-5 w-5" />
                Modo de demostración
              </p>
              <p className="mt-1">
                No se realizará ningún cobro ni se pedirán datos de tarjeta. Registraremos una transacción simulada hasta conectar Culqi.
              </p>
            </div>
          )}

          {error ? (
            <p className="mt-4 border-l-4 border-danger bg-red-50 px-4 py-3 text-sm font-bold text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={activateAndStart}
            disabled={activating}
          >
            {membership?.isActive ? <CalendarDays className="h-6 w-6" /> : <LockKeyhole className="h-5 w-5" />}
            {activating
              ? 'Activando acceso...'
              : membership?.isActive
                ? 'Rendir simulacro'
                : 'Simular pago y empezar'}
            <ArrowRight className="h-5 w-5" />
          </Button>

          <p className="mt-3 text-center text-xs leading-5 text-slate-500">
            La integración real usará un token de Culqi; esta aplicación no almacenará datos de tarjeta.
          </p>
        </aside>
      </div>
    </div>
  );
}
