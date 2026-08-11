import { useEffect, useState } from 'react';
import VehicleStartPanel from '../components/practice/VehicleStartPanel.jsx';
import { BRAND_DISCLAIMER } from '../data/brand.js';
import { FULL_EXAM_IS_FREE } from '../data/examRules.js';
import { fallbackLicenseCategories } from '../data/vehicleChoices.js';
import { useAuth } from '../hooks/useAuth.js';
import { api, resolveCategoryId } from '../services/api.js';

export default function DashboardPage() {
  const { user, updateUser } = useAuth();
  const [categories, setCategories] = useState(fallbackLicenseCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState(resolveCategoryId(user?.category));
  const [progress, setProgress] = useState(null);
  const [membership, setMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    api.getCategories().then((items) => {
      if (items?.length) setCategories(items);
    }).catch(() => null);
    api.getStats().then(setProgress).catch(() => setProgress({
      totalIntentos: 0,
      freePracticeCount: 0,
      promedioGeneral: 0,
      weakTopics: [],
    }));
    if (FULL_EXAM_IS_FREE) {
      setMembershipLoading(false);
      return;
    }
    api.getPlans().then((items) => setPlan(items?.[0] ?? null)).catch(() => null);
    api.getActiveMembership()
      .then(setMembership)
      .catch(() => setMembership(null))
      .finally(() => setMembershipLoading(false));
  }, []);

  useEffect(() => {
    setSelectedCategoryId(resolveCategoryId(user?.category));
  }, [user?.category]);

  const selectCategory = (categoryId) => {
    const nextCategoryId = resolveCategoryId(categoryId);
    setSelectedCategoryId(nextCategoryId);
    updateUser({ category: nextCategoryId });
    api.updateSettings({
      categoriaPreferidaId: nextCategoryId,
      notificacionesHabilitadas: true,
      tema: 'light',
    }).catch(() => null);
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-white">
      <VehicleStartPanel
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        progress={progress}
        onCategoryChange={selectCategory}
        startTo={`/simulacro/${selectedCategoryId}?mode=quick`}
        fullExamTo={FULL_EXAM_IS_FREE || membership?.isActive
          ? `/simulacro/${selectedCategoryId}?mode=exam`
          : `/checkout?category=${selectedCategoryId}`}
        fullExamHasAccess={FULL_EXAM_IS_FREE || Boolean(membership?.isActive)}
        fullExamAccessLoading={membershipLoading}
        fullExamPrice={plan?.price ?? 1200}
        membershipEndDate={membership?.endDate}
        fullExamIsFree={FULL_EXAM_IS_FREE}
      />
      <p className="border-t border-line px-4 py-5 text-center text-sm text-slate-500">{BRAND_DISCLAIMER}</p>
    </div>
  );
}
