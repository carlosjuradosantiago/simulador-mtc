import { cn } from '../../utils/cn.js';

const variants = {
  blue: 'bg-blue-50 text-brand ring-blue-100',
  green: 'bg-emerald-50 text-success ring-emerald-100',
  orange: 'bg-orange-50 text-warning ring-orange-100',
  red: 'bg-red-50 text-danger ring-red-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
};

export default function Badge({ children, variant = 'blue', className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1', variants[variant], className)}>
      {children}
    </span>
  );
}
