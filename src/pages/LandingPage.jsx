import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  );
}
