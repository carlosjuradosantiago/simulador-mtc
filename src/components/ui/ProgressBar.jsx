import { cn } from '../../utils/cn.js';

const colors = {
  emerald: 'bg-emerald-500',
  cyan: 'bg-cyan-500',
  blue: 'bg-brand',
  orange: 'bg-warning',
  violet: 'bg-violet-600',
  red: 'bg-danger',
};

export default function ProgressBar({ value, color = 'blue', className }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-slate-200', className)}>
      <div className={cn('h-full rounded-full transition-all', colors[color])} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}
