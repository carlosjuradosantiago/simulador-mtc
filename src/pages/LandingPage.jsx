import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, CheckCircle2, Clock3, FileQuestion } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import VehicleStartPanel from '../components/practice/VehicleStartPanel.jsx';
import { FREE_FULL_EXAM_ATTEMPTS, FULL_EXAM_IS_FREE } from '../data/examRules.js';
import { fallbackLicenseCategories } from '../data/vehicleChoices.js';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../services/api.js';

const licenseGuides = [
  ['A1', 'A-I: autos particulares', '/simulador-mtc-a1'],
  ['A2A', 'A-IIA: taxis y transporte', '/simulador-mtc-a2a'],
  ['A2B', 'A-IIB: vehículos de transporte', '/simulador-mtc-a2b'],
  ['A3A', 'A-IIIA: transporte de pasajeros', '/simulador-mtc-a3a'],
  ['A3B', 'A-IIIB: transporte de mercancías', '/simulador-mtc-a3b'],
  ['A3C', 'A-IIIC: pasajeros y mercancías', '/simulador-mtc-a3c'],
  ['B2A', 'B-IIA: motocicletas', '/simulador-mtc-b2a'],
  ['B2B', 'B-IIB: motocicletas de mayor cilindrada', '/simulador-mtc-b2b'],
  ['B2C', 'B-IIC: mototaxis y trimotos', '/simulador-mtc-b2c'],
];

const examFacts = [
  [FileQuestion, '40 preguntas', 'por evaluación'],
  [Clock3, '40 minutos', 'como máximo'],
  [CheckCircle2, '35 correctas', 'para aprobar'],
];

export default function LandingPage() {
  const { openAuthModal } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState(fallbackLicenseCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [planPrice, setPlanPrice] = useState(1200);

  useEffect(() => {
    api.getCategories().then((items) => {
      if (items?.length) setCategories(items);
    }).catch(() => null);
    if (!FULL_EXAM_IS_FREE) {
      api.getPlans().then((items) => {
        if (items?.[0]?.price) setPlanPrice(items[0].price);
      }).catch(() => null);
    }
  }, []);

  useEffect(() => {
    const authMode = searchParams.get('auth');
    if (authMode !== 'login' && authMode !== 'register') return;

    openAuthModal(authMode, {
      redirectTo: searchParams.get('next') || '/dashboard',
      category: Number(searchParams.get('category')) || null,
    });
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('auth');
    nextParams.delete('next');
    nextParams.delete('category');
    setSearchParams(nextParams, { replace: true });
  }, [openAuthModal, searchParams, setSearchParams]);

  const startPractice = (practiceMode) => {
    if (!selectedCategoryId) return;
    openAuthModal('register', {
      category: selectedCategoryId,
      redirectTo: `/simulacro/${selectedCategoryId}?mode=quick&strategy=${practiceMode}`,
    });
  };

  const fullExamDestination = selectedCategoryId
    ? `/simulacro/${selectedCategoryId}?mode=exam`
    : null;
  const fullExamTo = fullExamDestination
    ? `/?auth=register&category=${selectedCategoryId}&next=${encodeURIComponent(fullExamDestination)}`
    : null;
  const adaptiveDestination = selectedCategoryId
    ? `/simulacro/${selectedCategoryId}?mode=adaptive&strategy=adaptive`
    : null;
  const adaptiveTo = adaptiveDestination
    ? `/?auth=register&category=${selectedCategoryId}&next=${encodeURIComponent(adaptiveDestination)}`
    : null;

  return (
    <>
      <VehicleStartPanel
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        onStart={startPractice}
        adaptiveTo={adaptiveTo}
        fullExamTo={fullExamTo}
        fullExamHasAccess
        fullExamIsFree={FULL_EXAM_IS_FREE}
        fullExamPrice={planPrice}
        freeFullExamAttemptsRemaining={FULL_EXAM_IS_FREE ? 0 : FREE_FULL_EXAM_ATTEMPTS}
      />

      {!FULL_EXAM_IS_FREE ? (
        <section className="border-y border-line bg-slate-50" aria-labelledby="subscription-cta-title">
          <div className="mx-auto grid max-w-5xl gap-5 px-5 py-8 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-6">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
              <BadgeCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-brand">Continúa tu preparación</p>
              <h2 id="subscription-cta-title" className="font-display text-2xl font-black text-ink">Entrena hasta sentirte listo para rendir</h2>
              <p className="mt-1 text-base leading-6 text-slate-600">Accede a simulacros cronometrados, entrenamiento inteligente y seguimiento de tu avance por S/ {(planPrice / 100).toFixed(0)} al mes.</p>
            </div>
            <Link to="/planes" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-5 font-bold text-white hover:bg-blue-700">
              Ver suscripción
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      ) : null}

      <section className="border-b border-line bg-white" aria-labelledby="home-exam-guide-title">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase text-brand">Formato del examen de conocimientos</p>
              <h2 id="home-exam-guide-title" className="mt-2 max-w-3xl font-display text-3xl font-black text-ink sm:text-4xl">
                Simulador MTC por categoría para practicar antes del examen
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                El MTC informa que la evaluación contiene 40 preguntas, dura hasta 40 minutos y requiere al menos 35 respuestas correctas. Aquí puedes estudiar la categoría exacta de tu licencia y comprobar tu preparación con ese mismo formato.
              </p>
              <a
                href="https://www.gob.pe/institucion/mtc/noticias/1100676-el-mtc-brinda-un-simulador-gratuito-para-practicar-el-examen-de-reglas-de-transito-para-obtener-el-brevete"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4 hover:text-blue-700"
              >
                Ver el formato informado por el MTC
              </a>
            </div>

            <dl className="border-y border-line">
              {examFacts.map(([Icon, value, label]) => (
                <div key={value} className="flex items-center gap-4 border-b border-line px-1 py-4 last:border-b-0">
                  <Icon className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
                  <dt className="text-sm font-semibold text-slate-600">{label}</dt>
                  <dd className="ml-auto font-display text-xl font-black text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-10 border-t border-line pt-8">
            <h3 className="font-display text-2xl font-black text-ink">Elige la guía de tu licencia</h3>
            <p className="mt-2 text-base leading-6 text-slate-600">Cada categoría tiene preguntas, alternativas, respuestas y referencias al balotario que le corresponde.</p>
            <nav className="mt-5 grid border-t border-line sm:grid-cols-2 lg:grid-cols-3" aria-label="Simuladores MTC por categoría">
              {licenseGuides.map(([code, description, href]) => (
                <a key={href} href={href} className="group flex min-h-20 items-center gap-3 border-b border-line px-2 py-4 sm:odd:border-r lg:border-r lg:[&:nth-child(3n)]:border-r-0">
                  <strong className="font-display text-lg font-black text-brand">{code}</strong>
                  <span className="text-sm font-semibold leading-5 text-slate-600 group-hover:text-ink">{description}</span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand" aria-hidden="true" />
                </a>
              ))}
            </nav>
          </div>

          <div className="mt-10 grid border-y border-line md:grid-cols-3 md:divide-x md:divide-line">
            <article className="py-6 md:pr-7">
              <h3 className="font-display text-xl font-black text-ink">Aprende de cada respuesta</h3>
              <p className="mt-2 leading-6 text-slate-600">Confirma tu alternativa y revisa en el momento qué marcaste, cuál era la respuesta correcta y por qué.</p>
              <a href="/metodologia-simulador-mtc" className="mt-3 inline-flex min-h-11 items-center font-bold text-brand hover:underline">Cómo funciona el entrenamiento</a>
            </article>
            <article className="border-t border-line py-6 md:border-t-0 md:px-7">
              <h3 className="font-display text-xl font-black text-ink">Consulta preguntas completas</h3>
              <p className="mt-2 leading-6 text-slate-600">Busca una pregunta por tema y revisa sus cuatro alternativas, respuesta e identificación de la fuente.</p>
              <a href="/preguntas-mtc" className="mt-3 inline-flex min-h-11 items-center font-bold text-brand hover:underline">Ver preguntas MTC con respuestas</a>
            </article>
            <article className="border-t border-line py-6 md:border-t-0 md:pl-7">
              <h3 className="font-display text-xl font-black text-ink">Verifica el material oficial</h3>
              <p className="mt-2 leading-6 text-slate-600">Compara el contenido con los balotarios y publicaciones del MTC enlazados en cada guía.</p>
              <a href="/fuentes-mtc" className="mt-3 inline-flex min-h-11 items-center font-bold text-brand hover:underline">Revisar fuentes y balotarios</a>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
