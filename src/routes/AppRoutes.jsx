import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import PublicLayout from '../layouts/PublicLayout.jsx';
import { FULL_EXAM_IS_FREE } from '../data/examRules.js';
import { useAuth } from '../hooks/useAuth.js';
import { isAdminUser } from '../utils/admin.js';
import LandingPage from '../pages/LandingPage.jsx';

const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage.jsx'));
const AdminComplaintsPage = lazy(() => import('../pages/AdminComplaintsPage.jsx'));
const AdminFinancePage = lazy(() => import('../pages/AdminFinancePage.jsx'));
const AdminQuestionBankPage = lazy(() => import('../pages/AdminQuestionBankPage.jsx'));
const AuthCallbackPage = lazy(() => import('../pages/AuthCallbackPage.jsx'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage.jsx'));
const ClassesPage = lazy(() => import('../pages/ClassesPage.jsx'));
const ComplaintBookPage = lazy(() => import('../pages/ComplaintBookPage.jsx'));
const DashboardPage = lazy(() => import('../pages/DashboardPage.jsx'));
const LegalPage = lazy(() => import('../pages/LegalPage.jsx'));
const MySubscriptionPage = lazy(() => import('../pages/MySubscriptionPage.jsx'));
const OfficialMaterialsPage = lazy(() => import('../pages/OfficialMaterialsPage.jsx'));
const ProfilePage = lazy(() => import('../pages/ProfilePage.jsx'));
const ProgressPage = lazy(() => import('../pages/ProgressPage.jsx'));
const ResultsPage = lazy(() => import('../pages/ResultsPage.jsx'));
const SimulatorPage = lazy(() => import('../pages/SimulatorPage.jsx'));
const SubscriptionPage = lazy(() => import('../pages/SubscriptionPage.jsx'));

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-white font-bold text-slate-600">Preparando tu espacio...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={`/?auth=login&next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <Outlet />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();

  if (!isAdminUser(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function AppRoutes() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname, location.search]);

  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-white font-bold text-slate-600">Preparando la pantalla...</div>}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/planes" element={<SubscriptionPage />} />
          <Route path="/suscripcion" element={<Navigate to="/planes" replace />} />
          <Route path="/contacto" element={<LegalPage page="contact" />} />
          <Route path="/terminos-y-condiciones" element={<LegalPage page="terms" />} />
          <Route path="/terminos" element={<Navigate to="/terminos-y-condiciones" replace />} />
          <Route path="/politica-de-cambios-y-devoluciones" element={<LegalPage page="returns" />} />
          <Route path="/politica-devoluciones" element={<Navigate to="/politica-de-cambios-y-devoluciones" replace />} />
          <Route path="/politica-de-privacidad" element={<LegalPage page="privacy" />} />
          <Route path="/libro-reclamaciones" element={<ComplaintBookPage />} />
          <Route path="/materiales" element={<OfficialMaterialsPage />} />
        </Route>
        <Route path="/login" element={<Navigate to="/?auth=login" replace />} />
        <Route path="/registro" element={<Navigate to="/?auth=register" replace />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/simulacro/:categoria" element={<SimulatorPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            <Route path="/admin/reclamaciones" element={<AdminRoute><AdminComplaintsPage /></AdminRoute>} />
            <Route path="/admin/finanzas" element={<AdminRoute><AdminFinancePage /></AdminRoute>} />
            <Route path="/admin/preguntas" element={<AdminRoute><AdminQuestionBankPage /></AdminRoute>} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/banco-preguntas" element={<AdminRoute><Navigate to="/admin/preguntas" replace /></AdminRoute>} />
            <Route path="/clases" element={<ClassesPage />} />
            <Route path="/resultados" element={<ProgressPage />} />
            <Route path="/resultados/:id" element={<ResultsPage />} />
            <Route path="/ranking" element={<Navigate to="/dashboard" replace />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/mi-suscripcion" element={<MySubscriptionPage />} />
            <Route path="/configuracion" element={<Navigate to="/perfil" replace />} />
            <Route path="/checkout" element={FULL_EXAM_IS_FREE ? <Navigate to="/dashboard" replace /> : <CheckoutPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
