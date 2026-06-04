import { Link } from 'react-router-dom';
import { BRAND_NAME } from '../../data/brand.js';
import { cn } from '../../utils/cn.js';

export default function BrandLogo({ compact = false, className }) {
  return (
    <Link to="/" aria-label={BRAND_NAME} className={cn('inline-flex items-center gap-3 font-black text-ink', className)}>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-deep text-white ring-4 ring-blue-100/30">
        <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M7.5 17.5c3-2 5.8-3 8.5-3s5.5 1 8.5 3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
          <path d="M16 15v8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
          <circle cx="16" cy="16" r="2" fill="currentColor" />
        </svg>
      </span>
      {!compact ? (
        <span className="text-2xl tracking-normal">
          Simulador <span className="text-emerald-500">MTC</span>
        </span>
      ) : null}
    </Link>
  );
}
