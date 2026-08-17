import { BookOpen, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND_DISCLAIMER, BRAND_NAME } from '../../data/brand.js';
import { FULL_EXAM_IS_FREE } from '../../data/examRules.js';
import { BUSINESS } from '../../data/legal.js';

const licenseGuides = [
  ['A1', '/simulador-mtc-a1'],
  ['A2A', '/simulador-mtc-a2a'],
  ['A2B', '/simulador-mtc-a2b'],
  ['A3A', '/simulador-mtc-a3a'],
  ['A3B', '/simulador-mtc-a3b'],
  ['A3C', '/simulador-mtc-a3c'],
  ['B2A', '/simulador-mtc-b2a'],
  ['B2B', '/simulador-mtc-b2b'],
  ['B2C', '/simulador-mtc-b2c'],
];

const publicLinks = [
  ...(!FULL_EXAM_IS_FREE ? [['Planes', '/planes']] : []),
  ['PDF oficiales del MTC', '/materiales'],
  ['Contacto', '/contacto'],
  ['Términos y condiciones', '/terminos-y-condiciones'],
  ['Cambios y devoluciones', '/politica-de-cambios-y-devoluciones'],
  ['Privacidad', '/politica-de-privacidad'],
];

export default function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-slate-50 text-sm text-slate-600">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-9 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] lg:px-8">
        <section aria-labelledby="footer-company">
          <h2 id="footer-company" className="font-display text-lg font-black text-ink">{BRAND_NAME}</h2>
          <p className="mt-2 max-w-md leading-6">{BRAND_DISCLAIMER}</p>
          <p className="mt-4 font-bold text-ink">{BUSINESS.legalName}</p>
          <p className="mt-1">RUC {BUSINESS.ruc}</p>
          <p className="mt-3 flex max-w-md items-start gap-2 leading-6"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />{BUSINESS.address}</p>
          <a className="mt-2 flex w-fit items-center gap-2 font-semibold text-brand hover:underline" href={BUSINESS.phoneHref}><Phone className="h-4 w-4" aria-hidden="true" />{BUSINESS.phone}</a>
          <a className="mt-2 flex w-fit items-center gap-2 font-semibold text-brand hover:underline" href={BUSINESS.emailHref}><Mail className="h-4 w-4" aria-hidden="true" />{BUSINESS.email}</a>
        </section>

        <nav aria-labelledby="footer-information">
          <h2 id="footer-information" className="font-display text-lg font-black text-ink">Información</h2>
          <div className="mt-3 grid gap-2">
            {publicLinks.map(([label, to]) => <Link key={to} className="w-fit font-semibold text-brand hover:underline" to={to}>{label}</Link>)}
            <Link className="mt-2 inline-flex w-fit min-h-11 items-center gap-2 rounded-lg border border-brand px-3 font-bold text-brand hover:bg-blue-50" to="/libro-reclamaciones">
              <BookOpen className="h-5 w-5" aria-hidden="true" /> Libro de Reclamaciones
            </Link>
          </div>
        </nav>

        <nav aria-labelledby="footer-guides">
          <h2 id="footer-guides" className="font-display text-lg font-black text-ink">Guías por licencia</h2>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {licenseGuides.map(([label, href]) => <a key={href} className="font-semibold text-brand hover:underline" href={href}>{label}</a>)}
          </div>
          <h2 className="mt-6 font-display text-lg font-black text-ink">Fuentes</h2>
          <div className="mt-3 grid gap-2">
            <a className="w-fit font-semibold text-brand hover:underline" href="/simulador-mtc">Cómo funciona</a>
            <a className="w-fit font-semibold text-brand hover:underline" href="/fuentes-mtc">Fuentes oficiales</a>
            <a className="w-fit font-semibold text-brand hover:underline" href="/metodologia-simulador-mtc">Cómo funciona el entrenamiento</a>
          </div>
        </nav>
      </div>
      <div className="border-t border-line px-4 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {BUSINESS.legalName}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
