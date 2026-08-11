import { cn } from '../../utils/cn.js';

export default function Select({ label, children, className, error, ...props }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
      {label ? <span>{label}</span> : null}
      <select
        className={cn(
          'min-h-12 min-w-0 rounded-lg border border-line bg-white px-4 text-base text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-blue-100',
          error && 'border-danger focus:border-danger focus:ring-red-100',
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
