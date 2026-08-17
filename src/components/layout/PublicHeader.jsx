import { CircleUserRound, CreditCard, LogIn, UserPlus } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import BrandLogo from './BrandLogo.jsx';

const navLinkClass = ({ isActive }) => [
  'inline-flex min-h-11 items-center border-b-2 px-1 text-sm font-bold transition',
  isActive ? 'border-brand text-brand' : 'border-transparent text-slate-600 hover:text-ink',
].join(' ');

export default function PublicHeader() {
  const { isAuthenticated, openAuthModal } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <BrandLogo compact className="sm:hidden" />
        <BrandLogo className="hidden sm:inline-flex" />

        <nav aria-label="Navegación principal" className="ml-auto hidden items-center gap-5 lg:flex">
          <NavLink to="/" end className={navLinkClass}>Entrenar</NavLink>
          <a href="/metodologia-simulador-mtc" className="inline-flex min-h-11 items-center border-b-2 border-transparent px-1 text-sm font-bold text-slate-600 transition hover:text-ink">Cómo funciona</a>
          <NavLink to="/materiales" className={navLinkClass}>PDF oficiales</NavLink>
          <NavLink to="/planes" className={navLinkClass}>Planes</NavLink>
          <NavLink to="/contacto" className={navLinkClass}>Contacto</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          <Link
            to="/planes"
            aria-label="Ver planes"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 font-bold text-brand hover:border-brand hover:bg-blue-50 lg:hidden"
          >
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            <span className="sm:hidden min-[760px]:inline">Planes</span>
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-3 font-bold text-white hover:bg-blue-700 sm:px-4"
            >
              <CircleUserRound className="h-5 w-5" aria-hidden="true" />
              <span className="hidden min-[390px]:inline">Ir a entrenar</span>
              <span className="min-[390px]:hidden">Entrar</span>
            </Link>
          ) : (
            <>
              <button
                type="button"
                aria-label="Iniciar sesión"
                onClick={() => openAuthModal('login')}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 font-bold text-brand hover:border-brand hover:bg-blue-50 sm:px-4"
              >
                <LogIn className="h-5 w-5" aria-hidden="true" />
                <span className="hidden min-[430px]:inline">Iniciar sesión</span>
              </button>
              <button
                type="button"
                aria-label="Crear cuenta"
                onClick={() => openAuthModal('register')}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-3 font-bold text-white hover:bg-blue-700 sm:px-4"
              >
                <UserPlus className="h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:inline">Crear cuenta</span>
                <span className="sm:hidden">Crear</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
