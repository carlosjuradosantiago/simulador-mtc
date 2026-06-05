import { ArrowLeft, Bell, ChevronDown, CircleGauge, LogOut, Menu, Play, Search, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { isAdminUser } from '../../utils/admin.js';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const isDashboard = pathname === '/dashboard';
  const isResults = pathname.startsWith('/resultados');
  const isComplaint = pathname === '/libro-reclamaciones';
  const showStartButton = isDashboard || isComplaint;
  const adminUser = isAdminUser(user);

  const handleSearch = (event) => {
    event.preventDefault();
    const nextSearch = searchTerm.trim();
    if (nextSearch) {
      navigate(`/banco-preguntas?search=${encodeURIComponent(nextSearch)}`);
    }
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
      <div className="flex h-12 items-center gap-4">
        <button className="rounded-lg border border-line p-2 lg:hidden" onClick={onMenu} aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </button>
        {isDashboard ? (
          <form onSubmit={handleSearch} className="hidden h-11 w-[410px] flex-none items-center gap-3 rounded-xl border border-line bg-white px-4 shadow-sm md:flex">
            <Search className="h-5 w-5 text-slate-400" />
            <input aria-label="Buscar temas, preguntas, clases" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Buscar temas, preguntas, clases..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            <button type="submit" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-brand" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </button>
          </form>
        ) : null}
        {isResults ? (
          <div className="hidden h-11 min-w-64 items-center gap-3 rounded-xl border border-line bg-white px-5 font-bold shadow-sm md:flex">
            <CircleGauge className="h-6 w-6 text-brand-dark" /> Resultado de simulacro <ChevronDown className="ml-auto h-4 w-4" />
          </div>
        ) : null}
        {!isDashboard && !isResults ? <div className="min-w-0 flex-1" /> : null}
        <div className="ml-auto flex items-center gap-3">
          <button type="button" className="relative rounded-xl border border-line bg-white p-3 text-ink shadow-sm hover:bg-slate-50" aria-label="Notificaciones">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-danger text-xs font-bold text-white">3</span>
          </button>
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-slate-50 sm:px-2"
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <span className="relative grid h-11 w-11 overflow-hidden rounded-full bg-gradient-to-br from-sky-200 via-amber-100 to-blue-400 ring-4 ring-blue-50">
                <span className="absolute left-1/2 top-2 h-4 w-4 -translate-x-1/2 rounded-full bg-amber-700" />
                <span className="absolute left-1/2 top-5 h-5 w-7 -translate-x-1/2 rounded-t-full bg-white" />
                <span className="absolute bottom-0 left-1/2 h-5 w-10 -translate-x-1/2 rounded-t-full bg-brand-dark" />
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[220px] truncate text-sm font-bold text-ink">{user?.name ?? 'Carlos Mendoza'}</span>
                <span className="block text-xs text-slate-500">{adminUser ? 'Administrador' : 'Estudiante'}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-ink" />
            </button>

            {userMenuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-white py-2 shadow-xl">
                <div className="border-b border-line px-4 py-3">
                  <p className="truncate text-sm font-black text-ink">{user?.name ?? 'Estudiante'}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email ?? 'Cuenta activa'}</p>
                </div>
                <Link to="/perfil" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-brand">
                  <UserRound className="h-4 w-4" />
                  Perfil
                </Link>
                {adminUser ? (
                  <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-brand">
                    <CircleGauge className="h-4 w-4" />
                    Panel admin
                  </Link>
                ) : null}
                <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-danger hover:bg-red-50" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            ) : null}
          </div>
          {isResults ? (
            <Button as={Link} to="/dashboard" className="hidden min-w-52 sm:inline-flex" size="md">
              <ArrowLeft className="h-4 w-4" />
              Volver al dashboard
            </Button>
          ) : null}
          {showStartButton ? (
            <Button as={Link} to={`/simulacro/${user?.category ?? 'A1'}`} className="hidden min-w-44 sm:inline-flex" size="md">
              <Play className="h-4 w-4" />
              Iniciar simulacro
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
