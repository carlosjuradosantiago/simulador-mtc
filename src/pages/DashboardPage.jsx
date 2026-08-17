import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import VehicleStartPanel from '../components/practice/VehicleStartPanel.jsx';
import { BRAND_DISCLAIMER } from '../data/brand.js';
import {
  FREE_FULL_EXAM_ATTEMPTS,
  FULL_EXAM_IS_FREE,
  remainingFreeFullExamAttempts,
} from '../data/examRules.js';
import { fallbackLicenseCategories } from '../data/vehicleChoices.js';
import { useAuth } from '../hooks/useAuth.js';
import { api, resolveCategoryId } from '../services/api.js';

export default function DashboardPage() {
  const { user, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const choosingCategory = searchParams.get('chooseCategory') === '1';
  const [categories, setCategories] = useState(fallbackLicenseCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    user?.categoryConfirmed && !choosingCategory ? resolveCategoryId(user?.category) : null,
  );
  const [progress, setProgress] = useState(null);
  const [membership, setMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [completedOfficialExams, setCompletedOfficialExams] = useState(null);

  useEffect(() => {
    api.getCategories().then((items) => {
      if (items?.length) setCategories(items);
    }).catch(() => null);
    if (FULL_EXAM_IS_FREE) {
      setMembershipLoading(false);
      return;
    }
    api.getPlans().then((items) => setPlan(items?.[0] ?? null)).catch(() => null);
    Promise.all([api.getActiveMembership(), api.getExamCount()])
      .then(([nextMembership, accessStats]) => {
        setMembership(nextMembership);
        setCompletedOfficialExams(Number(accessStats?.examCount) || 0);
      })
      .catch(() => {
        setMembership(null);
        setCompletedOfficialExams(FREE_FULL_EXAM_ATTEMPTS);
      })
      .finally(() => setMembershipLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) {
      setProgress(null);
      return;
    }

    api.getStats(selectedCategoryId).then(setProgress).catch(() => setProgress({
      totalIntentos: 0,
      freePracticeCount: 0,
      promedioGeneral: 0,
      weakTopics: [],
    }));
  }, [selectedCategoryId]);

  useEffect(() => {
    setSelectedCategoryId(
      user?.categoryConfirmed && !choosingCategory ? resolveCategoryId(user?.category) : null,
    );
  }, [choosingCategory, user?.category, user?.categoryConfirmed]);

  const selectCategory = (categoryId) => {
    const nextCategoryId = resolveCategoryId(categoryId);
    setSelectedCategoryId(nextCategoryId);
    updateUser({ category: nextCategoryId, categoryConfirmed: true });
    api.updateSettings({
      categoriaPreferidaId: nextCategoryId,
      categoriaConfirmada: true,
      notificacionesHabilitadas: true,
      tema: 'light',
    }).catch(() => null);
    if (choosingCategory) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('chooseCategory');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const freeFullExamAttemptsRemaining = completedOfficialExams === null || membership?.isActive
    ? 0
    : remainingFreeFullExamAttempts(completedOfficialExams);
  const fullExamHasAccess = FULL_EXAM_IS_FREE
    || Boolean(membership?.isActive)
    || freeFullExamAttemptsRemaining > 0;

  return (
    <div className="min-h-[calc(100vh-73px)] bg-white">
      <VehicleStartPanel
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        focusSelected={Boolean(user?.categoryConfirmed) && !choosingCategory}
        progress={progress}
        onCategoryChange={selectCategory}
        startTo={`/simulacro/${selectedCategoryId}?mode=quick`}
        adaptiveTo={fullExamHasAccess
          ? `/simulacro/${selectedCategoryId}?mode=adaptive&strategy=adaptive`
          : `/checkout?category=${selectedCategoryId}`}
        fullExamTo={fullExamHasAccess
          ? `/simulacro/${selectedCategoryId}?mode=exam`
          : `/checkout?category=${selectedCategoryId}`}
        fullExamHasAccess={fullExamHasAccess}
        fullExamAccessLoading={membershipLoading}
        fullExamPrice={plan?.price ?? 1200}
        membershipEndDate={membership?.endDate}
        fullExamIsFree={FULL_EXAM_IS_FREE}
        freeFullExamAttemptsRemaining={freeFullExamAttemptsRemaining}
      />
      <p className="border-t border-line px-4 py-5 text-center text-sm text-slate-500">{BRAND_DISCLAIMER}</p>
    </div>
  );
}
