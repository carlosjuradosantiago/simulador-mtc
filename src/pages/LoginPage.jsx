import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/layout/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { BRAND_NAME } from '../data/brand.js';
import { useAuth } from '../hooks/useAuth.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    const result = await login(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <main className="grid min-h-screen place-items-center bg-soft p-5">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex justify-center"><BrandLogo /></div>
        <h1 className="text-center text-3xl font-black text-ink">Iniciar sesión</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Ingresa con tu cuenta registrada en {BRAND_NAME}.</p>
        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <Input label="Correo" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <Input label="Contraseña" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Ingresando...' : 'Iniciar sesión'}</Button>
        </form>
        <div className="mt-6 flex items-center justify-between text-sm font-semibold">
          <Link to="/registro" className="text-brand">Crear cuenta</Link>
          <button type="button" className="text-slate-500 hover:text-brand" onClick={() => setNotice('La recuperación de contraseña estará disponible cuando se active el flujo de correo.')}>Olvidé mi contraseña</button>
        </div>
        {notice ? <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-brand">{notice}</p> : null}
      </Card>
    </main>
  );
}
