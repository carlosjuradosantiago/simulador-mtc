import { CircleGauge } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND_NAME } from '../../data/brand.js';
import { cn } from '../../utils/cn.js';

export default function BrandLogo({ compact = false, className, to = '/' }) {
  return (
    <Link to={to} aria-label={BRAND_NAME} className={cn('inline-flex min-h-11 min-w-11 items-center justify-center gap-3 font-display font-black text-ink', className)}>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-deep text-white ring-4 ring-blue-100/30">
        <CircleGauge className="h-7 w-7" aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="text-2xl tracking-normal">
          Simulador <span className="text-emerald-500">MTC</span>
        </span>
      ) : null}
    </Link>
  );
}
