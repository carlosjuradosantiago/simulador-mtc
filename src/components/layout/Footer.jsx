import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND_DISCLAIMER } from '../../data/brand.js';

const footerLinks = {
  Producto: [
    { label: 'Simulacros', to: '/dashboard' },
    { label: 'Categorias', to: '/#categorias' },
    { label: 'Soporte', to: '/libro-reclamaciones' },
  ],
  Recursos: [
    { label: 'Banco de preguntas', to: '/banco-preguntas' },
    { label: 'Clases', to: '/clases' },
    { label: 'Simulador MTC', href: '/simulador-mtc' },
    { label: 'Balotario MTC A1', href: '/balotario-mtc-a1' },
    { label: 'Fuentes MTC', href: '/fuentes-mtc' },
  ],
  Empresa: [
    { label: 'Planes', to: '/planes' },
    { label: 'Perfil', to: '/perfil' },
  ],
  Legal: [
    { label: 'Libro de reclamaciones', to: '/libro-reclamaciones' },
    { label: 'Terminos', to: '/planes' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white px-6 py-8 text-sm text-slate-500">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 font-semibold text-ink">
            <ShieldCheck className="h-4 w-4 text-brand" /> {BRAND_DISCLAIMER}
          </p>
          <p>Simulacros y balotario para prepararte antes del examen de conocimientos.</p>
        </div>
        {Object.entries(footerLinks).map(([section, links]) => (
          <div key={section}>
            <h3 className="mb-3 font-bold text-ink">{section}</h3>
            <div className="grid gap-2">
              {links.map((link) => (
                link.href
                  ? <a key={link.label} href={link.href} className="hover:text-brand">{link.label}</a>
                  : <Link key={link.label} to={link.to} className="hover:text-brand">{link.label}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
