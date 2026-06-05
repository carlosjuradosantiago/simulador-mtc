import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx';
import PublicLayout from '../layouts/PublicLayout.jsx';
import CheckoutPage from '../pages/CheckoutPage.jsx';
import ClassesPage from '../pages/ClassesPage.jsx';
import ComplaintBookPage from '../pages/ComplaintBookPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import AuthCallbackPage from '../pages/AuthCallbackPage.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import PlansPage from '../pages/PlansPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import QuestionBankPage from '../pages/QuestionBankPage.jsx';
import ResultsPage from '../pages/ResultsPage.jsx';
import SimulatorPage from '../pages/SimulatorPage.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { isAdminUser } from '../utils/admin.js';

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-soft font-bold text-slate-600">Cargando sesión...</div>;
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
  return (
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
  );
}
