import { cn } from '../../utils/cn.js';

export default function Input({ label, className, error, ...props }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
      {label ? <span>{label}</span> : null}
      <input
        className={cn(
          'min-h-12 min-w-0 rounded-lg border border-line bg-white px-4 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-blue-100',
          error && 'border-danger focus:border-danger focus:ring-red-100',
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs font-medium text-danger">{error}</span> : null}
    </label>
  );
}
