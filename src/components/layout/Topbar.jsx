import { BarChart3, BookOpen, ChevronDown, CircleUserRound, Clock3, HelpCircle, Home, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { isAdminUser } from '../../utils/admin.js';
import BrandLogo from './BrandLogo.jsx';

function isActivePath(pathname, search, item) {
  if (item.id === 'home') return pathname === '/dashboard';
  if (item.id === 'exam') return pathname.startsWith('/simulacro') && new URLSearchParams(search).get('mode') === 'exam';
  if (item.id === 'learn') return pathname.startsWith('/banco-preguntas') || pathname.startsWith('/clases');
  if (item.id === 'progress') return pathname.startsWith('/resultados');
  return false;
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const userMenuRef = useRef(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const category = user?.category ?? 25;
  const adminUser = isAdminUser(user);
  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home, to: '/dashboard' },
    { id: 'exam', label: 'Examen real', icon: Clock3, to: `/simulacro/${category}?mode=exam` },
    { id: 'learn', label: 'Aprender', icon: BookOpen, to: '/banco-preguntas' },
    { id: 'progress', label: 'Mi avance', icon: BarChart3, to: '/resultados' },
  ];

  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname, search]);

  useEffect(() => {
    if (!userMenuOpen) return undefined;

    const closeMenu = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && userMenuRef.current?.contains(event.target)) return;
      setUserMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeMenu);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeMenu);
    };
  }, [userMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <BrandLogo compact to="/dashboard" className="md:hidden" />
          <BrandLogo to="/dashboard" className="hidden md:inline-flex" />

          <nav aria-label="Navegación principal" className="mx-auto hidden h-[72px] items-stretch gap-1 lg:flex">
            {navItems.map((item) => {
              const active = isActivePath(pathname, search, item);
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-w-28 items-center justify-center gap-2 border-b-4 px-4 font-bold transition ${
                    active ? 'border-brand text-brand' : 'border-transparent text-slate-600 hover:border-blue-200 hover:text-brand'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              to="/clases"
              aria-label="Ayuda"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 font-bold text-ink hover:border-brand hover:bg-blue-50"
            >
              <HelpCircle className="h-5 w-5 text-brand" />
              <span className="hidden sm:inline">Ayuda</span>
            </Link>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                aria-label={`Abrir menú de ${user?.name ?? 'Estudiante'}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-slate-50"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-traffic-yellow text-ink">
                  <CircleUserRound className="h-7 w-7" />
                </span>
                <span className="hidden max-w-48 truncate text-left font-bold xl:block">{user?.name ?? 'Estudiante'}</span>
                <ChevronDown className="hidden h-4 w-4 sm:block" />
              </button>

              {userMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-line bg-white py-2 shadow-xl" role="menu">
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate font-bold text-ink">{user?.name ?? 'Estudiante'}</p>
                    <p className="truncate text-sm text-slate-500">{user?.email ?? 'Cuenta activa'}</p>
                  </div>
                  <Link to="/perfil" role="menuitem" className="flex min-h-12 items-center gap-3 px-4 font-bold text-slate-700 hover:bg-blue-50 hover:text-brand">
                    <UserRound className="h-5 w-5" />
                    Mi perfil
                  </Link>
                  {adminUser ? (
                    <Link to="/admin" role="menuitem" className="flex min-h-12 items-center gap-3 px-4 font-bold text-slate-700 hover:bg-blue-50 hover:text-brand">
                      <ShieldCheck className="h-5 w-5" />
                      Administración
                    </Link>
                  ) : null}
                  <button type="button" role="menuitem" className="flex min-h-12 w-full items-center gap-3 px-4 text-left font-bold text-danger hover:bg-red-50" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-40 grid h-[72px] grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {navItems.map((item) => {
          const active = isActivePath(pathname, search, item);
          return (
            <Link
              key={item.id}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`grid min-w-0 place-items-center content-center gap-1 px-1 text-xs font-bold ${
                active ? 'text-brand' : 'text-slate-500'
              }`}
            >
              <item.icon className="h-6 w-6" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
