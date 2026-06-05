import { ArrowRight, KeyRound, Mail, RefreshCw, ShieldCheck, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import { BRAND_NAME } from '../../data/brand.js';
import { useAuth } from '../../hooks/useAuth.js';
import { api, getGoogleOAuthUrl } from '../../services/api.js';
import { cn } from '../../utils/cn.js';

const AUTH_CALLBACK_ORIGIN_BY_HOST = {
  'simuladormtc.com': 'https://www.simuladormtc.com',
};

const titleByMode = {
  login: 'Iniciar sesión',
  register: 'Crear cuenta',
  verify: 'Verificar correo',
  resetRequest: 'Recuperar cuenta',
  resetConfirm: 'Nueva contraseña',
};

function Feedback({ error, notice }) {
  if (!error && !notice) return null;

  return (
    <p className={cn(
      'rounded-lg px-4 py-3 text-sm font-semibold',
      error ? 'bg-red-50 text-danger' : 'bg-blue-50 text-brand',
    )}
    >
      {error || notice}
    </p>
  );
}

export default function AuthModal() {
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
  const [categories, setCategories] = useState([]);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirmPassword: '', category: 25 });
  const [verifyForm, setVerifyForm] = useState({ email: '', code: '' });
  const [resetForm, setResetForm] = useState({ email: '', code: '', password: '', confirmPassword: '' });
  const [pendingCategory, setPendingCategory] = useState(25);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!authModal.open) return;
    setMode(authModal.mode ?? 'login');
    setError('');
    setNotice('');
    setLoading(false);
    setGoogleLoading(false);
    if (authModal.email) {
      setLoginForm((currentForm) => ({ ...currentForm, email: authModal.email }));
      setVerifyForm((currentForm) => ({ ...currentForm, email: authModal.email }));
      setResetForm((currentForm) => ({ ...currentForm, email: authModal.email }));
    }
  }, [authModal.email, authModal.mode, authModal.open]);

  useEffect(() => {
    if (!authModal.open || mode !== 'register' || categories.length) return;

    api.getCategories().then((items) => {
      setCategories(items);
      setRegisterForm((currentForm) => ({ ...currentForm, category: items[0]?.id ?? currentForm.category }));
    }).catch(() => null);
  }, [authModal.open, categories.length, mode]);

  if (!authModal.open) return null;

  const redirectTo = authModal.redirectTo || '/dashboard';
  const busy = loading || googleLoading;

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
      setError(oauthError.message || 'No pudimos iniciar el login con Google.');
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
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Las contraseñas no coinciden.');
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
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-line bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-brand">{BRAND_NAME}</p>
            <h2 className="mt-1 text-2xl font-black text-ink">{titleByMode[mode]}</h2>
          </div>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={closeAuthModal} aria-label="Cerrar autenticación">
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === 'login' ? (
          <form className="grid gap-4" onSubmit={handleLogin}>
            <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={handleGoogleLogin}>
              <Mail className="h-5 w-5" /> {googleLoading ? 'Abriendo selector de Google...' : 'Continuar con Google'}
            </Button>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-normal text-slate-400"><span className="h-px flex-1 bg-line" /> o usa tu correo <span className="h-px flex-1 bg-line" /></div>
            <Input label="Correo" type="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} required />
            <Input label="Contraseña" type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} required />
            <Feedback error={error} notice={notice} />
            <Button type="submit" className="w-full" disabled={busy}>{loading ? 'Ingresando...' : 'Iniciar sesión'} <ArrowRight className="h-4 w-4" /></Button>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold">
              <button type="button" className="text-brand" onClick={() => switchMode('register')}>Crear cuenta</button>
              <button type="button" className="text-slate-500 hover:text-brand" onClick={() => { setResetForm((currentForm) => ({ ...currentForm, email: loginForm.email })); switchMode('resetRequest'); }}>Olvidé mi contraseña</button>
            </div>
          </form>
        ) : null}

        {mode === 'register' ? (
          <form className="grid gap-4" onSubmit={handleRegister}>
            <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={handleGoogleLogin}>
              <Mail className="h-5 w-5" /> {googleLoading ? 'Abriendo selector de Google...' : 'Crear con Google'}
            </Button>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre completo" value={registerForm.name} onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })} required />
              <Input label="Correo" type="email" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} required />
              <Input label="Contraseña" type="password" value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} required />
              <Input label="Confirmar contraseña" type="password" value={registerForm.confirmPassword} onChange={(event) => setRegisterForm({ ...registerForm, confirmPassword: event.target.value })} required />
            </div>
            <Select label="Categoría inicial" value={registerForm.category} onChange={(event) => setRegisterForm({ ...registerForm, category: Number(event.target.value) })}>
              {(categories.length ? categories : [{ id: 25, title: 'A-I', vehicle: 'Licencia A-I' }]).map((category) => <option key={category.id} value={category.id}>{category.title} - {category.vehicle}</option>)}
            </Select>
            <Feedback error={error} notice={notice} />
            <Button type="submit" className="w-full" disabled={busy}>{loading ? 'Creando cuenta...' : 'Crear cuenta'} <User className="h-4 w-4" /></Button>
            <button type="button" className="text-center text-sm font-semibold text-brand" onClick={() => switchMode('login')}>Ya tengo cuenta</button>
          </form>
        ) : null}

        {mode === 'verify' ? (
          <form className="grid gap-4" onSubmit={handleVerify}>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
              <p className="flex items-center gap-2 font-black text-brand"><Mail className="h-5 w-5" /> Verifica tu correo</p>
              <p className="mt-1">Ingresa el código de 6 dígitos para {verifyForm.email}. Si no lo recibiste, solicita un reenvío.</p>
            </div>
            <Input label="Código de 6 dígitos" inputMode="numeric" maxLength={6} value={verifyForm.code} onChange={(event) => setVerifyForm({ ...verifyForm, code: event.target.value.replace(/\D/g, '').slice(0, 6) })} required />
            <Feedback error={error} notice={notice} />
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Validando...' : 'Validar correo'} <ShieldCheck className="h-4 w-4" /></Button>
            <Button type="button" variant="secondary" className="w-full" disabled={loading} onClick={handleResend}><RefreshCw className="h-4 w-4" /> Reenviar código</Button>
          </form>
        ) : null}

        {mode === 'resetRequest' ? (
          <form className="grid gap-4" onSubmit={handleResetRequest}>
            <Input label="Correo de tu cuenta" type="email" value={resetForm.email} onChange={(event) => setResetForm({ ...resetForm, email: event.target.value })} required />
            <Feedback error={error} notice={notice} />
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Enviando...' : 'Enviar código'} <Mail className="h-4 w-4" /></Button>
            <button type="button" className="text-center text-sm font-semibold text-brand" onClick={() => switchMode('login')}>Volver a iniciar sesión</button>
          </form>
        ) : null}

        {mode === 'resetConfirm' ? (
          <form className="grid gap-4" onSubmit={handleResetConfirm}>
            <Input label="Correo" type="email" value={resetForm.email} onChange={(event) => setResetForm({ ...resetForm, email: event.target.value })} required />
            <Input label="Código" inputMode="numeric" maxLength={6} value={resetForm.code} onChange={(event) => setResetForm({ ...resetForm, code: event.target.value.replace(/\D/g, '').slice(0, 6) })} required />
            <Input label="Nueva contraseña" type="password" value={resetForm.password} onChange={(event) => setResetForm({ ...resetForm, password: event.target.value })} required />
            <Input label="Confirmar contraseña" type="password" value={resetForm.confirmPassword} onChange={(event) => setResetForm({ ...resetForm, confirmPassword: event.target.value })} required />
            <Feedback error={error} notice={notice} />
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Actualizando...' : 'Actualizar contraseña'} <KeyRound className="h-4 w-4" /></Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
