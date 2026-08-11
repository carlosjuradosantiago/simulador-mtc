import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/layout/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { exchangeSupabaseOAuthCode, getStoredToken, supabaseAuth } from '../services/api.js';
import { safeInternalPath } from '../utils/navigation.js';

const oauthCodeExchangePromises = new Map();

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const finishOAuthLogin = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const authCode = searchParams.get('code');
      const errorDescription = hashParams.get('error_description') || hashParams.get('error') || searchParams.get('error_description') || searchParams.get('error');
      const nextPath = safeInternalPath(searchParams.get('next'));
      const loginPopupPath = `/?auth=login&next=${encodeURIComponent(nextPath)}`;
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete('code');
      cleanParams.delete('error');
      cleanParams.delete('error_description');
      const cleanSearch = cleanParams.toString();

      window.history.replaceState(null, '', `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}`);

      if (errorDescription) {
        if (!cancelled) navigate(loginPopupPath, { replace: true });
        return;
      }

      const storedToken = getStoredToken();
      if (!accessToken && !authCode && storedToken) {
        navigate(nextPath, { replace: true });
        return;
      }

      try {
        let token = accessToken;
        if (!token && authCode) {
          let exchangePromise = oauthCodeExchangePromises.get(authCode);
          if (!exchangePromise) {
            exchangePromise = exchangeSupabaseOAuthCode(authCode);
            oauthCodeExchangePromises.set(authCode, exchangePromise);
          }
          token = await exchangePromise;
        }

        if (!token) {
          token = storedToken;
        }

        if (!token) {
          const { data } = await supabaseAuth.auth.getSession();
          token = data?.session?.access_token ?? null;
        }

        if (!token) {
          if (!cancelled) navigate(loginPopupPath, { replace: true });
          return;
        }

        if (cancelled) return;

        const result = await loginWithToken(token);
        if (cancelled) return;

        if (!result.ok) {
          setError(result.message || 'No pudimos iniciar sesión con Google.');
          return;
        }

        navigate(nextPath, { replace: true });
      } catch (oauthError) {
        if (!cancelled) setError(oauthError.message || 'No pudimos validar la respuesta de Google.');
      }
    };

    finishOAuthLogin();

    return () => {
      cancelled = true;
    };
  }, [loginWithToken, navigate, searchParams]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-soft p-5">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mb-6 flex justify-center"><BrandLogo /></div>
          <h1 className="text-2xl font-black text-ink">No pudimos iniciar sesión</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
          <Button as={Link} to="/?auth=login" className="mt-6 w-full">Volver a intentar</Button>
        </Card>
      </main>
    );
  }

  return <main className="grid min-h-screen place-items-center bg-soft p-5 text-lg font-bold text-slate-600">Conectando con Google...</main>;
}
