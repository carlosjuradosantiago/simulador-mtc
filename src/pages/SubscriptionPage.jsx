import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  CreditCard,
  Images,
  ListChecks,
  MessageSquareText,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { FULL_EXAM_IS_FREE } from '../data/examRules.js';
import { MONTHLY_PLAN } from '../data/legal.js';
import { vehicleChoices } from '../data/vehicleChoices.js';
import { useAuth } from '../hooks/useAuth.js';

const adaptiveBenefits = [
  {
    title: 'Refuerza tus errores',
    description: 'Da prioridad a los temas que más te cuestan.',
    icon: Target,
  },
  {
    title: 'Avanza con preguntas nuevas',
    description: 'Amplía lo que ya dominas sin repetir siempre lo mismo.',
    icon: Sparkles,
  },
  {
    title: 'Repasa lo aprendido',
    description: 'Recupera temas anteriores para comprobar que aún los recuerdas.',
    icon: RefreshCw,
  },
];

const benefits = [
  {
    title: 'Simulacro cronometrado',
    description: 'Responde 40 preguntas en 40 minutos con la selección correspondiente a tu licencia.',
    icon: Clock3,
    tone: 'text-brand',
  },
  {
    title: 'Aprende de cada respuesta',
    description: 'Al confirmar verás qué marcaste, cuál era la respuesta correcta y la explicación completa.',
    icon: MessageSquareText,
    tone: 'text-success',
  },
  {
    title: 'Revisa antes de finalizar',
    description: 'Vuelve a cualquier pregunta y cambia tu elección antes de confirmar la entrega.',
    icon: ListChecks,
    tone: 'text-amber-600',
  },
  {
    title: 'Conoce qué necesitas reforzar',
    description: 'Mi avance identifica los temas con menor acierto y muestra tu evolución en simulacros cronometrados.',
    icon: BarChart3,
    tone: 'text-cyan-600',
  },
  {
    title: 'Preguntas claras y visuales',
    description: 'Lee cada enunciado y todas sus alternativas; cuando una pregunta incluye una señal o gráfico, lo verás completo.',
    icon: Images,
    tone: 'text-violet-600',
  },
  {
    title: 'Preparación según tu licencia',
    description: 'La práctica se orienta a A-I, A-IIA, A-IIB, A-IIIA, A-IIIB, A-IIIC, B-IIA, B-IIB o B-IIC.',
    icon: Route,
    tone: 'text-slate-700',
  },
  {
    title: 'Practica desde cualquier equipo',
    description: 'Continúa tu preparación desde celular o computadora con la misma cuenta y el mismo avance.',
    icon: Smartphone,
    tone: 'text-brand',
  },
  {
    title: 'Entrenamiento que cambia contigo',
    description: 'Las siguientes prácticas priorizan lo que más fallas y vuelven a comprobar lo que ya aprendiste.',
    icon: BrainCircuit,
    tone: 'text-success',
  },
];

export default function SubscriptionPage() {
  const { isAuthenticated } = useAuth();
  const checkoutTo = isAuthenticated ? '/checkout' : '/?auth=register&next=%2Fcheckout';
  const practiceTo = isAuthenticated ? '/dashboard' : '/?auth=register&next=%2Fdashboard';
  const actionTo = FULL_EXAM_IS_FREE ? practiceTo : checkoutTo;
  const actionLabel = FULL_EXAM_IS_FREE ? 'Empezar a practicar' : `Suscribirme por S/ ${MONTHLY_PLAN.price}`;

  return (
    <div>
      <section className="border-b border-line bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_420px] lg:items-center lg:px-8">
          <div>
            <p className="font-bold text-brand">Acceso mensual</p>
            <h1 className="mt-2 max-w-3xl font-display text-4xl font-black leading-tight text-ink sm:text-5xl">Prepárate para tu categoría con simulacros completos</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Una sola suscripción para practicar el examen de conocimientos MTC, revisar tus errores y seguir tu progreso desde celular o computadora.</p>
            <div className="mt-7 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="font-display text-5xl font-black text-ink">S/ {MONTHLY_PLAN.price}</span>
              <span className="pb-1 text-lg font-bold text-slate-500">por mes</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Precio final en soles. Antes de suscribirte puedes usar gratuitamente las prácticas cortas para conocer el servicio.</p>
            <Link to={actionTo} className="mt-6 inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-lg font-black text-white shadow-[0_4px_0_#0f4eae] hover:bg-blue-700">
              {actionLabel} <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2" aria-label="Categorías incluidas">
            {vehicleChoices.map((vehicle) => (
              <figure key={vehicle.id} className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
                <img src={vehicle.image} alt={vehicle.imageAlt} className="aspect-square w-full object-contain p-2" />
                <figcaption className="border-t border-line px-2 py-2 text-center text-xs font-bold text-ink sm:text-sm">{vehicle.title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white" aria-labelledby="included-title">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:px-8">
          <p className="font-bold text-brand">Mucho más que un banco de preguntas</p>
          <h2 id="included-title" className="mt-2 max-w-3xl font-display text-3xl font-black leading-tight text-ink sm:text-4xl">Todo lo que necesitas para entrenar, corregir y medir tu nivel</h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">La plataforma organiza tu preparación, explica cada respuesta y usa tus resultados para decidir qué conviene reforzar después.</p>
        </div>

        <div className="border-y border-blue-200 bg-blue-50">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[0.9fr_1.35fr] lg:items-center lg:px-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-[0_3px_0_#0f4eae]">
                <BrainCircuit className="h-7 w-7" aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold text-brand">Entrenamiento inteligente</p>
                <h3 className="mt-1 font-display text-2xl font-black leading-tight text-ink sm:text-3xl">Una práctica que se adapta a ti</h3>
                <p className="mt-3 max-w-xl leading-7 text-slate-700">Usa tus resultados para decidir qué conviene reforzar, cuándo avanzar y qué necesitas volver a repasar.</p>
              </div>
            </div>

            <div className="grid border-t border-blue-200 sm:grid-cols-3 sm:border-t-0">
              {adaptiveBenefits.map(({ title, description, icon: Icon }, index) => (
                <article key={title} className={`min-w-0 py-5 sm:px-5 sm:py-2 ${index > 0 ? 'border-t border-blue-200 sm:border-l sm:border-t-0' : ''}`}>
                  <Icon className="h-6 w-6 text-brand" aria-hidden="true" />
                  <h4 className="mt-3 font-display text-lg font-black leading-6 text-ink">{title}</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <h3 className="font-display text-2xl font-black text-ink sm:text-3xl">Incluido en tu preparación</h3>
          <div className="mt-6 grid border-t border-line sm:grid-cols-2">
            {benefits.map(({ title, description, icon: Icon, tone }, index) => (
              <article key={title} className={`border-b border-line py-6 sm:px-6 ${index % 2 === 0 ? 'sm:border-r' : ''}`}>
                <div className="flex items-start gap-4">
                  <Icon className={`mt-0.5 h-7 w-7 shrink-0 ${tone}`} aria-hidden="true" />
                  <div>
                    <h4 className="font-display text-xl font-black text-ink">{title}</h4>
                    <p className="mt-2 leading-7 text-slate-600">{description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-blue-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="font-display text-2xl font-black text-ink">Elige cómo pagar</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="flex gap-3"><CreditCard className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" /><p><strong className="block text-ink">Tarjeta</strong><span className="mt-1 block leading-6 text-slate-600">Renovación mensual automática. Puedes detener los próximos cobros desde tu cuenta.</span></p></div>
              <div className="flex gap-3"><Smartphone className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" /><p><strong className="block text-ink">Yape</strong><span className="mt-1 block leading-6 text-slate-600">Activa un mes de acceso. Al terminar, puedes volver a suscribirte.</span></p></div>
            </div>
          </div>
          <div>
            <h2 className="font-display text-2xl font-black text-ink">Compra clara y protegida</h2>
            <ul className="mt-5 grid gap-3 text-slate-700">
              <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />Pago seguro con Culqi.</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />El precio y el tipo de renovación se muestran antes de confirmar.</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />Puedes solicitar boleta o factura durante la compra.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 sm:py-14">
        <h2 className="font-display text-3xl font-black text-ink">Empieza con tu categoría correcta</h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-slate-600">Al crear tu cuenta elegirás la licencia que vas a rendir. La plataforma orientará las prácticas, simulacros y resultados a esa categoría.</p>
        <Link to={actionTo} className="mt-6 inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-lg font-black text-white hover:bg-blue-700">Continuar <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
        <p className="mt-5 text-sm leading-6 text-slate-500">Al continuar podrás revisar y aceptar los <Link className="font-bold text-brand hover:underline" to="/terminos-y-condiciones">Términos y condiciones</Link> y la <Link className="font-bold text-brand hover:underline" to="/politica-de-cambios-y-devoluciones">Política de cambios y devoluciones</Link>.</p>
      </section>
    </div>
  );
}
