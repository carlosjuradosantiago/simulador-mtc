import { lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import PageViewTracker from './components/analytics/PageViewTracker.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.js';
import AppRoutes from './routes/AppRoutes.jsx';

const AuthModal = lazy(() => import('./components/auth/AuthModal.jsx'));

function AuthModalLayer() {
  const { authModal } = useAuth();
  return authModal.open ? (
    <Suspense fallback={null}>
      <AuthModal />
    </Suspense>
  ) : null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PageViewTracker />
        <AppRoutes />
        <AuthModalLayer />
      </AuthProvider>
    </BrowserRouter>
  );
}
