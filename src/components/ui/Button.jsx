import { cn } from '../../utils/cn.js';

const variants = {
  primary: 'bg-brand text-white shadow-[0_4px_0_#0f4eae] hover:bg-blue-700 active:translate-y-0.5 active:shadow-[0_2px_0_#0f4eae]',
  secondary: 'border border-line bg-white text-brand hover:border-blue-300 hover:bg-blue-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
  danger: 'bg-danger text-white hover:bg-red-600',
  success: 'bg-success text-white hover:bg-emerald-700',
  warning: 'bg-traffic-yellow text-ink hover:bg-yellow-400',
};

const sizes = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-6 text-lg',
};

export default function Button({ children, variant = 'primary', size = 'md', className, type = 'button', as: Component = 'button', ...props }) {
  const componentProps = Component === 'button' ? { type, ...props } : props;

  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-bold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...componentProps}
    >
      {children}
    </Component>
  );
}
