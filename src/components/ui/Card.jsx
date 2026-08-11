import { forwardRef } from 'react';
import { cn } from '../../utils/cn.js';

const Card = forwardRef(function Card({ children, className, ...props }, ref) {
  return <section ref={ref} className={cn('min-w-0 rounded-lg border border-line bg-white card-shadow', className)} {...props}>{children}</section>;
});

export default Card;
