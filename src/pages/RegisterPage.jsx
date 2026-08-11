import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/layout/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../services/api.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', category: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCategories().then((items) => {
      setCategories(items);
    }).catch(() => null);
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password || !form.category) {
      setError('Completa los campos obligatorios.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <main className="grid min-h-screen place-items-center bg-soft p-5">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8 flex justify-center"><BrandLogo /></div>
        <h1 className="text-center text-3xl font-black text-ink">Crear cuenta</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Empieza con simulacros por categoría y progreso guardado.</p>
        <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input label="Nombre completo" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Correo" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <Input label="Contraseña" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <Input label="Confirmar contraseña" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
          <Select label="Categoría inicial de licencia" value={form.category} onChange={(event) => setForm({ ...form, category: Number(event.target.value) })}>
            <option value="">Elige tu categoría</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.title} - {category.vehicle}</option>)}
          </Select>
          <div className="md:pt-7"><Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</Button></div>
          {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-danger md:col-span-2">{error}</p> : null}
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">¿Ya tienes cuenta? <Link to="/login" className="font-bold text-brand">Inicia sesión</Link></p>
      </Card>
    </main>
  );
}
