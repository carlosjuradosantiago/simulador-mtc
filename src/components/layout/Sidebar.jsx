import { BarChart3, BookOpenCheck, Car, Home, User, ClipboardList, CreditCard, FileText, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import BrandLogo from './BrandLogo.jsx';
import SidebarPromo from './SidebarPromo.jsx';
import { cn } from '../../utils/cn.js';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: Home },
  { label: 'Simuladores', to: '/dashboard', icon: Car },
  { label: 'Banco de preguntas', to: '/banco-preguntas', icon: ClipboardList },
  { label: 'Clases', to: '/clases', icon: BookOpenCheck },
  { label: 'Resultados', to: '/resultados', icon: BarChart3 },
  { label: 'Perfil', to: '/perfil', icon: User },
  { label: 'Planes', to: '/planes', icon: CreditCard },
  { label: 'Libro de Reclamaciones', to: '/libro-reclamaciones', icon: FileText },
];

export default function Sidebar({ open, onClose }) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col bg-brand-deep p-4 text-white transition lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="mb-8 flex items-center justify-between pt-3">
        <BrandLogo className="text-white" />
        <button className="rounded-lg p-2 hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="grid gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex h-[52px] items-center gap-4 rounded-xl px-4 text-base font-semibold text-blue-50 transition hover:bg-white/10',
                isActive && item.to !== '/dashboard' && 'bg-brand text-white shadow-lg shadow-blue-950/30',
                isActive && item.to === '/dashboard' && 'bg-brand text-white shadow-lg shadow-blue-950/30',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <SidebarPromo />
    </aside>
  );
}
