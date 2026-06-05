import { ArrowRight, BookOpenCheck, CheckCircle2, Clock, PlayCircle, ShieldCheck, Star, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/layout/BrandLogo.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import CategoryCard from '../components/ui/CategoryCard.jsx';
import LandingDashboardPreview from '../components/ui/LandingDashboardPreview.jsx';
import { BRAND_DISCLAIMER, BRAND_NAME } from '../data/brand.js';
import { licenseCategories } from '../data/mockCategories.js';
import { planBenefits, plans as fallbackPlans, formatCurrency } from '../data/mockPlans.js';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../services/api.js';

const benefits = [
  { icon: BookOpenCheck, title: 'Preguntas actualizadas', text: 'Banco de preguntas alineado con normas de tránsito vigentes.' },
  { icon: ShieldCheck, title: 'Simulacros por categoría', text: 'Practica según el tipo de licencia que necesitas obtener.' },
  { icon: Trophy, title: 'Resultados al instante', text: 'Obtén resultados y estadísticas en tiempo real.' },
  { icon: Clock, title: 'Estudia a tu ritmo', text: 'Accede desde cualquier dispositivo, cuando y donde quieras.' },
];

const faqs = [
  [`¿${BRAND_NAME} es oficial del MTC?`, BRAND_DISCLAIMER],
  ['¿Puedo practicar varias categorías?', 'Sí. Los planes permiten acceder a categorías A1, A2A, A2B, A3A, A3B y futuras categorías.'],
  ['¿El simulacro calcula resultados?', 'Sí. Calcula correctas, incorrectas, sin responder, porcentaje y temas por reforzar.'],
];

export default function LandingPage() {
  const { openAuthModal } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState(licenseCategories);
  const [plans, setPlans] = useState(fallbackPlans);
  const featuredCategories = categories.slice(0, 5);

  useEffect(() => {
    Promise.all([
      api.getCategories(),
      api.getPlans(),
    ]).then(([apiCategories, apiPlans]) => {
      if (apiCategories?.length) setCategories(apiCategories);
      if (apiPlans?.length) setPlans(apiPlans);
    }).catch(() => null);
  }, []);

  useEffect(() => {
    const authMode = searchParams.get('auth');
    if (authMode !== 'login' && authMode !== 'register') return;

    openAuthModal(authMode, { redirectTo: searchParams.get('next') || '/dashboard' });
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('auth');
    nextParams.delete('next');
    setSearchParams(nextParams, { replace: true });
  }, [openAuthModal, searchParams, setSearchParams]);

  return (
    <div className="bg-white text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 px-5 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-[1510px] items-center gap-6">
          <BrandLogo />
          <nav className="hidden flex-1 items-center justify-center gap-8 text-sm font-semibold text-slate-600 lg:flex">
            {[
              ['Inicio', 'inicio'],
              ['Categorías', 'categorias'],
              ['Cómo funciona', 'como-funciona'],
              ['Planes', 'planes'],
              ['Preguntas frecuentes', 'preguntas-frecuentes'],
            ].map(([item, href], index) => (
              <a key={item} href={`#${href}`} className={`border-b-2 py-3.5 hover:border-brand hover:text-brand ${index === 0 ? 'border-brand text-brand' : 'border-transparent'}`}>
                {item}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => openAuthModal('login')}>Iniciar sesión</Button>
            <Button size="sm" onClick={() => openAuthModal('register')}>Crear cuenta</Button>
          </div>
        </div>
      </header>

      <main>
        <section id="inicio" className="road-hero scene-road border-b border-line px-5 py-5 lg:py-4">
          <div className="mx-auto grid max-w-[1510px] items-center gap-8 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="relative z-10">
              <Badge variant="blue" className="mb-4"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> La plataforma #1 para aprobar tu examen de manejo</Badge>
              <h1 className="max-w-[650px] text-[46px] font-black leading-[1.08] tracking-normal text-ink md:text-[56px]">
                Aprueba tu examen<br />de manejo con<br /><span className="text-brand">simulacros reales</span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Prepárate con preguntas actualizadas y simulacros por categoría para licencias A1, A2A, A2B, A3A, A3B y más.
              </p>
              <div className="mt-5 flex flex-wrap gap-4">
                <Button size="lg" onClick={() => openAuthModal('register')}>Comenzar ahora <ArrowRight className="h-5 w-5" /></Button>
                <Button variant="secondary" size="lg" onClick={() => openAuthModal('login')}><PlayCircle className="h-5 w-5" /> Ver demo</Button>
              </div>
              <div className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-brand" /> +100 mil estudiantes</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-brand" /> Balotarios oficiales</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-brand" /> Actualizaciones constantes</span>
              </div>
            </div>

            <LandingDashboardPreview />
          </div>
        </section>

        <section className="mx-auto grid max-w-[1510px] gap-4 px-5 py-5 md:grid-cols-4">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="p-5">
              <benefit.icon className="mb-4 h-9 w-9 text-brand" />
              <h3 className="font-bold text-ink">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.text}</p>
            </Card>
          ))}
        </section>

        <section id="categorias" className="mx-auto max-w-[1510px] px-5 py-4">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-black">Categorías de licencia</h2>
            <a href="#planes" className="text-sm font-semibold text-brand">Ver planes</a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {featuredCategories.map((category) => <CategoryCard key={category.id} category={category} compact />)}
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-[1510px] px-5 py-8">
          <h2 className="mb-6 text-2xl font-black">Cómo funciona</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {['Crea tu cuenta', 'Practica y aprende', 'Aprueba tu examen'].map((step, index) => (
              <Card key={step} className="p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand text-lg font-black text-white">{index + 1}</span>
                <h3 className="mt-5 text-xl font-black">{step}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Elige tu categoría, responde simulacros realistas y revisa explicaciones para mejorar cada día.</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="planes" className="mx-auto max-w-[1510px] px-5 py-8">
          <h2 className="mb-6 text-2xl font-black">Elige el plan ideal para ti</h2>
          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative p-6 ${plan.recommended ? 'border-brand ring-2 ring-blue-100' : ''}`}>
                {plan.recommended ? <Badge className="absolute -top-4 left-1/2 -translate-x-1/2">Más recomendado</Badge> : null}
                <h3 className="text-xl font-black">Plan {plan.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{plan.subtitle}</p>
                <p className="mt-6 text-4xl font-black">{formatCurrency(plan.price)} <span className="text-base font-semibold text-slate-500">{plan.period}</span></p>
                <div className="mt-6 grid gap-3 text-sm text-slate-600">
                  {(plan.features?.length ? plan.features : planBenefits).map((benefit) => <span key={benefit} className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {benefit}</span>)}
                </div>
                <Button as={Link} to="/checkout" className="mt-6 w-full" variant={plan.recommended ? 'primary' : 'secondary'}>Seleccionar plan</Button>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-[1510px] gap-5 px-5 py-8 md:grid-cols-2">
          {[`Gracias a ${BRAND_NAME} aprobé mi examen a la primera. Los simulacros son súper realistas.`, 'Me encantó la plataforma, es fácil de usar y las explicaciones son muy claras.'].map((quote, index) => (
            <Card key={quote} className="p-6">
              <div className="mb-4 flex text-yellow-400">{Array.from({ length: 5 }, (_, starIndex) => <Star key={starIndex} className="h-4 w-4 fill-current" />)}</div>
              <p className="text-slate-700">“{quote}”</p>
              <p className="mt-4 font-bold text-ink">{index === 0 ? 'Valeria S.' : 'Diego R.'}</p>
            </Card>
          ))}
        </section>

        <section id="preguntas-frecuentes" className="mx-auto max-w-4xl px-5 py-12">
          <h2 className="mb-6 text-2xl font-black">Preguntas frecuentes</h2>
          <div className="grid gap-4">
            {faqs.map(([question, answer]) => (
              <Card key={question} className="p-5">
                <h3 className="font-bold">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
