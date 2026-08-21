import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import VehicleStartPanel from '../components/practice/VehicleStartPanel.jsx';
import { FREE_FULL_EXAM_ATTEMPTS, FULL_EXAM_IS_FREE } from '../data/examRules.js';
import { fallbackLicenseCategories } from '../data/vehicleChoices.js';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../services/api.js';

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
    </>
  );
}
