import { cn } from '../../utils/cn.js';

export default function BrandMark({ className }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={cn('h-11 w-11 shrink-0', className)}
    >
      <circle cx="24" cy="24" r="21" fill="#0b1f3a" />
      <circle cx="24" cy="24" r="21" fill="none" stroke="#dbeafe" strokeWidth="2" />
      <path
        d="M29.4 10.05a15 15 0 1 0 8.55 8.55"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="3" fill="none" stroke="#fff" strokeWidth="3" />
      <path
        d="m26.1 21.9 8.4-8.4"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
