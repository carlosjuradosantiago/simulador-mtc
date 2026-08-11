import { ArrowRight, KeyRound, Mail, RefreshCw, ShieldCheck, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND_NAME } from '../../data/brand.js';
import { fallbackLicenseCategories, getCategoryById } from '../../data/vehicleChoices.js';
import { useAuth } from '../../hooks/useAuth.js';
import { getGoogleOAuthUrl } from '../../services/api.js';
import { cn } from '../../utils/cn.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

const AUTH_CALLBACK_ORIGIN_BY_HOST = {
  'simuladormtc.com': 'https://www.simuladormtc.com',
};

const titleByMode = {
  login: 'Iniciar sesión',
  register: 'Crear cuenta',
  verify: 'Verifica tu correo',
  resetRequest: 'Recuperar cuenta',
  resetConfirm: 'Crear nueva contraseña',
};

function Feedback({ error, notice }) {
  if (!error && !notice) return null;

  return (
    <p
      role={error ? 'alert' : 'status'}
      className={cn(
        'rounded-lg px-4 py-3 text-base font-bold',
        error ? 'bg-red-50 text-danger' : 'bg-blue-50 text-brand',
      )}
    >
      {error || notice}
    </p>
  );
}

export default function AuthModal() {
  const dialogRef = useRef(null);
  const navigate = useNavigate();
  const {
    authModal,
    closeAuthModal,
    login,
    register,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    confirmPasswordReset,
  } = useAuth();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', category: 25 });
  const [verifyForm, setVerifyForm] = useState({ email: '', code: '' });
  const [resetForm, setResetForm] = useState({ email: '', code: '', password: '', confirmPassword: '' });
  const [pendingCategory, setPendingCategory] = useState(25);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(true);

  useEffect(() => {
    if (!authModal.open) return undefined;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [authModal.open]);

  useEffect(() => {
    if (!authModal.open) return;
    const initialCategory = Number(authModal.category) || 25;
    setMode(authModal.mode ?? 'login');
    setPendingCategory(initialCategory);
    setRegisterForm((currentForm) => ({ ...currentForm, category: initialCategory }));
    setError('');
    setNotice('');
    setLoading(false);
    setGoogleLoading(false);
    setVerificationEmailSent(true);
    if (authModal.email) {
      setLoginForm((currentForm) => ({ ...currentForm, email: authModal.email }));
      setVerifyForm((currentForm) => ({ ...currentForm, email: authModal.email }));
      setResetForm((currentForm) => ({ ...currentForm, email: authModal.email }));
    }
  }, [authModal.category, authModal.email, authModal.mode, authModal.open]);

  if (!authModal.open) return null;

  const redirectTo = authModal.redirectTo || '/dashboard';
  const busy = loading || googleLoading;
  const selectedCategory = getCategoryById(fallbackLicenseCategories, registerForm.category);

  const finishAuth = () => {
    closeAuthModal();
    navigate(redirectTo, { replace: true });
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const handleGoogleLogin = async () => {
    setError('');
    setNotice('');
    setGoogleLoading(true);
    const callbackOrigin = AUTH_CALLBACK_ORIGIN_BY_HOST[window.location.hostname] || window.location.origin;
    const callbackUrl = `${callbackOrigin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
    try {
      const googleUrl = await getGoogleOAuthUrl({ redirectTo: callbackUrl });
      window.location.assign(googleUrl);
    } catch (oauthError) {
      setGoogleLoading(false);
      setError(oauthError.message || 'No pudimos abrir Google.');
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    const result = await login(loginForm);
    setLoading(false);
    if (!result.ok) {
      if (result.requiresEmailVerification) {
        const email = result.email ?? loginForm.email;
        setVerifyForm({ email, code: '' });
        setVerificationEmailSent(result.emailSent === true);
        setNotice(result.emailSent ? 'Te enviamos un código para validar tu correo.' : result.message);
        setMode('verify');
        return;
      }
      setError(result.message);
      return;
    }
    finishAuth();
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      setError('Completa los campos obligatorios.');
      return;
    }
    setLoading(true);
    const result = await register(registerForm);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.requiresEmailVerification) {
      const email = result.email ?? registerForm.email;
      setPendingCategory(registerForm.category);
      setVerifyForm({ email, code: '' });
      setVerificationEmailSent(result.emailSent === true);
      setNotice(result.message || 'Te enviamos un código para validar tu correo.');
      setMode('verify');
      return;
    }
    finishAuth();
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    const result = await verifyEmail({ ...verifyForm, category: pendingCategory });
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    finishAuth();
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    const result = await resendVerification({ email: verifyForm.email });
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setVerificationEmailSent(true);
    setNotice(result.message);
  };

  const handleResetRequest = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    const result = await requestPasswordReset({ email: resetForm.email });
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    switchMode('resetConfirm');
    setNotice(result.message);
  };

  const handleResetConfirm = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (resetForm.password !== resetForm.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const result = await confirmPasswordReset(resetForm);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setLoginForm((currentForm) => ({ ...currentForm, email: resetForm.email, password: '' }));
    switchMode('login');
    setNotice(result.message);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="auth-title"
      onCancel={(event) => {
        event.preventDefault();
        closeAuthModal();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeAuthModal();
      }}
      className="m-auto max-h-[94vh] w-[min(94vw,540px)] overflow-y-auto rounded-lg border border-line bg-white p-0 text-ink shadow-2xl"
    >
      <div className="p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-bold text-brand">{BRAND_NAME}</p>
            <h2 id="auth-title" className="mt-1 font-display text-3xl font-black">{titleByMode[mode]}</h2>
            {mode === 'register' ? (
              <p className="mt-2 text-base text-slate-600">
                Practicarás para {selectedCategory.vehicle}, licencia {selectedCategory.title}.
              </p>
            ) : null}
          </div>
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={closeAuthModal} aria-label="Cerrar">
            <X className="h-6 w-6" />
          </button>
        </div>

        {mode === 'login' ? (
          <form className="grid gap-4" onSubmit={handleLogin}>
            <Input label="Correo" type="email" autoComplete="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} required autoFocus />
            <Input label="Contraseña" type="password" autoComplete="current-password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} required />
            <Feedback error={error} notice={notice} />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {loading ? 'Ingresando...' : 'Entrar'}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={handleGoogleLogin}>
              <Mail className="h-5 w-5" />
              {googleLoading ? 'Abriendo Google...' : 'Entrar con Google'}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-3 text-base font-bold">
              <button type="button" className="text-brand" onClick={() => switchMode('register')}>Crear cuenta</button>
              <button type="button" className="text-slate-500 hover:text-brand" onClick={() => {
                setResetForm((currentForm) => ({ ...currentForm, email: loginForm.email }));
                switchMode('resetRequest');
              }}>
                Olvidé mi contraseña
              </button>
            </div>
          </form>
        ) : null}

        {mode === 'register' ? (
          <form className="grid gap-4" onSubmit={handleRegister}>
            <Input label="Tu nombre" autoComplete="name" value={registerForm.name} onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })} required autoFocus />
            <Input label="Tu correo" type="email" autoComplete="email" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} required />
            <Input label="Crea una contraseña" type="password" autoComplete="new-password" minLength={8} value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} required />
            <Feedback error={error} notice={notice} />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {loading ? 'Creando cuenta...' : 'Crear y practicar'}
              <User className="h-5 w-5" />
            </Button>
            <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={handleGoogleLogin}>
              <Mail className="h-5 w-5" />
              {googleLoading ? 'Abriendo Google...' : 'Crear con Google'}
            </Button>
            <button type="button" className="min-h-11 text-center font-bold text-brand" onClick={() => switchMode('login')}>Ya tengo cuenta</button>
          </form>
        ) : null}

        {mode === 'verify' ? (
          <form className="grid gap-4" onSubmit={handleVerify}>
            <p className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-base leading-6 text-slate-700">
              {verificationEmailSent ? (
                <>Escribe el código de 6 dígitos que enviamos a <strong>{verifyForm.email}</strong>.</>
              ) : (
                <>Tu cuenta fue creada, pero no pudimos enviar el código a <strong>{verifyForm.email}</strong>. Usa “Reenviar código” para intentarlo otra vez.</>
              )}
            </p>
            <Input label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verifyForm.code} onChange={(event) => setVerifyForm({ ...verifyForm, code: event.target.value.replace(/\D/g, '').slice(0, 6) })} required autoFocus />
            <Feedback error={error} notice={notice} />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Validando...' : 'Validar y practicar'}
              <ShieldCheck className="h-5 w-5" />
            </Button>
            <Button type="button" variant="secondary" className="w-full" disabled={loading} onClick={handleResend}>
              <RefreshCw className="h-5 w-5" />
              Reenviar código
            </Button>
          </form>
        ) : null}

        {mode === 'resetRequest' ? (
          <form className="grid gap-4" onSubmit={handleResetRequest}>
            <p className="text-base leading-6 text-slate-600">Te enviaremos un código para recuperar tu cuenta.</p>
            <Input label="Correo de tu cuenta" type="email" autoComplete="email" value={resetForm.email} onChange={(event) => setResetForm({ ...resetForm, email: event.target.value })} required autoFocus />
            <Feedback error={error} notice={notice} />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar código'}
              <Mail className="h-5 w-5" />
            </Button>
            <button type="button" className="min-h-11 text-center font-bold text-brand" onClick={() => switchMode('login')}>Volver</button>
          </form>
        ) : null}

        {mode === 'resetConfirm' ? (
          <form className="grid gap-4" onSubmit={handleResetConfirm}>
            <Input label="Correo" type="email" autoComplete="email" value={resetForm.email} onChange={(event) => setResetForm({ ...resetForm, email: event.target.value })} required />
            <Input label="Código" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={resetForm.code} onChange={(event) => setResetForm({ ...resetForm, code: event.target.value.replace(/\D/g, '').slice(0, 6) })} required />
            <Input label="Nueva contraseña" type="password" autoComplete="new-password" minLength={8} value={resetForm.password} onChange={(event) => setResetForm({ ...resetForm, password: event.target.value })} required />
            <Input label="Repite la contraseña" type="password" autoComplete="new-password" minLength={8} value={resetForm.confirmPassword} onChange={(event) => setResetForm({ ...resetForm, confirmPassword: event.target.value })} required />
            <Feedback error={error} notice={notice} />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Actualizando...' : 'Guardar contraseña'}
              <KeyRound className="h-5 w-5" />
            </Button>
          </form>
        ) : null}
      </div>
    </dialog>
  );
}
