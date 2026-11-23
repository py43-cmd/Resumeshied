import { ShieldCheck } from 'lucide-react';

import { cn } from '../../lib/utils.js';

const SIZES = {
  sm: { wrap: 'h-8 w-8 rounded-xl', icon: 'h-4 w-4' },
  md: { wrap: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5' },
  lg: { wrap: 'h-12 w-12 rounded-2xl', icon: 'h-6 w-6' },
};

export function BrandMark({ size = 'md', className }) {
  const style = SIZES[size] ?? SIZES.md;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-primary/10 text-primary ring-1 ring-primary/25',
        style.wrap,
        className,
      )}
    >
      <ShieldCheck className={style.icon} aria-hidden="true" />
    </span>
  );
}
