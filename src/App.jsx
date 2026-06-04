import { BrowserRouter } from 'react-router-dom';
import AuthModal from './components/auth/AuthModal.jsx';
import { AuthProvider } from './hooks/useAuth.js';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <AuthModal />
      </AuthProvider>
    </BrowserRouter>
  );
}
