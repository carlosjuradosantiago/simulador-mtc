import { ArrowRight, BarChart3, CheckCircle2, Clock3, CreditCard, ShieldCheck, Smartphone, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MONTHLY_PLAN } from '../data/legal.js';
import { vehicleChoices } from '../data/vehicleChoices.js';
import { useAuth } from '../hooks/useAuth.js';

const benefits = [
  ['Simulacros cronometrados', 'Rinde prácticas completas de 40 preguntas en 40 minutos según la categoría de tu licencia.', Clock3],
  ['Resultados que sí cuentan', 'Tu avance se calcula con los simulacros completos para mostrar una medida útil de preparación.', Target],
  ['Refuerzo de errores', 'Revisa las respuestas que fallaste y practica primero los temas que necesitas mejorar.', BarChart3],
];

export default function SubscriptionPage() {
  const { isAuthenticated } = useAuth();
  const checkoutTo = isAuthenticated ? '/checkout' : '/?auth=register&next=%2Fcheckout';

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
            <Link to={checkoutTo} className="mt-6 inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-lg font-black text-white shadow-[0_4px_0_#0f4eae] hover:bg-blue-700">
              Suscribirme por S/ {MONTHLY_PLAN.price} <ArrowRight className="h-5 w-5" aria-hidden="true" />
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

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8" aria-labelledby="included-title">
        <h2 id="included-title" className="font-display text-3xl font-black text-ink">Qué incluye tu suscripción</h2>
        <div className="mt-7 grid gap-0 border-y border-line md:grid-cols-3">
          {benefits.map(([title, description, Icon], index) => (
            <div key={title} className={`py-6 md:px-6 ${index > 0 ? 'border-t border-line md:border-l md:border-t-0' : ''}`}>
              <Icon className="h-8 w-8 text-brand" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-black text-ink">{title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{description}</p>
            </div>
          ))}
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
              <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />Culqi procesa el pago dentro de su formulario seguro.</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />El precio y el tipo de renovación se muestran antes de confirmar.</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />Puedes solicitar boleta o factura durante la compra.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 sm:py-14">
        <h2 className="font-display text-3xl font-black text-ink">Empieza con tu categoría correcta</h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-slate-600">Al crear tu cuenta elegirás la licencia que vas a rendir. La plataforma orientará las prácticas, simulacros y resultados a esa categoría.</p>
        <Link to={checkoutTo} className="mt-6 inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-lg font-black text-white hover:bg-blue-700">Continuar <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
        <p className="mt-5 text-sm leading-6 text-slate-500">Al continuar podrás revisar y aceptar los <Link className="font-bold text-brand hover:underline" to="/terminos-y-condiciones">Términos y condiciones</Link> y la <Link className="font-bold text-brand hover:underline" to="/politica-de-cambios-y-devoluciones">Política de cambios y devoluciones</Link>.</p>
      </section>
    </div>
  );
}
