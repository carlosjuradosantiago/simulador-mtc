import { LogIn, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/layout/BrandLogo.jsx';
import VehicleStartPanel from '../components/practice/VehicleStartPanel.jsx';
import { BRAND_DISCLAIMER } from '../data/brand.js';
import { FULL_EXAM_IS_FREE } from '../data/examRules.js';
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
    ? FULL_EXAM_IS_FREE
      ? `/simulacro/${selectedCategoryId}?mode=exam`
      : `/checkout?category=${selectedCategoryId}`
    : null;
  const fullExamTo = fullExamDestination
    ? `/?auth=register&category=${selectedCategoryId}&next=${encodeURIComponent(fullExamDestination)}`
    : null;

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <BrandLogo compact className="sm:hidden" />
          <BrandLogo className="hidden sm:inline-flex" />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Iniciar sesión"
              onClick={() => openAuthModal('login')}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 font-bold text-brand hover:border-brand hover:bg-blue-50 sm:px-4"
            >
              <LogIn className="h-5 w-5" />
              <span className="hidden min-[380px]:inline">Iniciar sesión</span>
            </button>
            <button
              type="button"
              aria-label="Crear cuenta"
              onClick={() => openAuthModal('register', { category: selectedCategoryId })}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-3 font-bold text-white hover:bg-blue-700 sm:px-4"
            >
              <UserPlus className="h-5 w-5" />
              <span className="sm:hidden">Crear</span>
              <span className="hidden sm:inline">Crear cuenta</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <VehicleStartPanel
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
          onStart={startPractice}
          fullExamTo={fullExamTo}
          fullExamIsFree={FULL_EXAM_IS_FREE}
          fullExamPrice={planPrice}
        />
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-sm leading-6 text-slate-500">
        {BRAND_DISCLAIMER}
      </footer>
    </div>
  );
}
