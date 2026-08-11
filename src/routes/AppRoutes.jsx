import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import PublicLayout from '../layouts/PublicLayout.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { isAdminUser } from '../utils/admin.js';

const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage.jsx'));
const AuthCallbackPage = lazy(() => import('../pages/AuthCallbackPage.jsx'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage.jsx'));
const ClassesPage = lazy(() => import('../pages/ClassesPage.jsx'));
const ComplaintBookPage = lazy(() => import('../pages/ComplaintBookPage.jsx'));
const DashboardPage = lazy(() => import('../pages/DashboardPage.jsx'));
const LandingPage = lazy(() => import('../pages/LandingPage.jsx'));
const PlansPage = lazy(() => import('../pages/PlansPage.jsx'));
const ProfilePage = lazy(() => import('../pages/ProfilePage.jsx'));
const QuestionBankPage = lazy(() => import('../pages/QuestionBankPage.jsx'));
const ResultsPage = lazy(() => import('../pages/ResultsPage.jsx'));
const SimulatorPage = lazy(() => import('../pages/SimulatorPage.jsx'));

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

function AdminRoute() {
  const { user } = useAuth();

  if (!isAdminUser(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminDashboardPage />;
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
        </Route>
        <Route path="/login" element={<Navigate to="/?auth=login" replace />} />
        <Route path="/registro" element={<Navigate to="/?auth=register" replace />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/simulacro/:categoria" element={<SimulatorPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/banco-preguntas" element={<QuestionBankPage />} />
            <Route path="/clases" element={<ClassesPage />} />
            <Route path="/resultados" element={<ResultsPage />} />
            <Route path="/resultados/:id" element={<ResultsPage />} />
            <Route path="/ranking" element={<Navigate to="/dashboard" replace />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/configuracion" element={<Navigate to="/perfil" replace />} />
            <Route path="/planes" element={<PlansPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/libro-reclamaciones" element={<ComplaintBookPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
