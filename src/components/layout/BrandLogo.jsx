import { Link } from 'react-router-dom';
import { BRAND_NAME } from '../../data/brand.js';
import { cn } from '../../utils/cn.js';
import BrandMark from './BrandMark.jsx';

export default function BrandLogo({ compact = false, className, to = '/' }) {
  return (
    <Link to={to} aria-label={BRAND_NAME} className={cn('inline-flex min-h-11 min-w-11 items-center justify-center gap-3 font-display font-black text-ink', className)}>
      <BrandMark />
      {!compact ? (
        <span className="text-2xl tracking-normal">
          Simulador <span className="text-emerald-500">MTC</span>
        </span>
      ) : null}
    </Link>
  );
}
