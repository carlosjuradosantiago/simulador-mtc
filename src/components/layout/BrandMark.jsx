import { cn } from '../../utils/cn.js';

export default function BrandMark({ className }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={cn('h-11 w-11 shrink-0', className)}
    >
      <rect x="2" y="2" width="44" height="44" rx="14" fill="#0b1f3a" />
      <path
        d="M12 37c9-4 5-12 12-18 4-3 9-2 13-7"
        fill="none"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M12 37c9-4 5-12 12-18 4-3 9-2 13-7"
        fill="none"
        stroke="#fbbf24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />
      <circle cx="12" cy="37" r="3" fill="#2563eb" />
      <path
        d="m31.5 11 3.5 3.5 6-7"
        fill="none"
        stroke="#10b981"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
