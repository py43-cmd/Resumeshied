import { ShieldCheck } from 'lucide-react';

import { cn } from '../../lib/utils.js';

const SIZES = {
  sm: { wrap: 'h-8 w-8 rounded-xl', icon: 'h-4 w-4' },
  md: { wrap: 'h-10 w-10 rounded-2xl', icon: 'h-5 w-5' },
  lg: { wrap: 'h-14 w-14 rounded-2xl', icon: 'h-7 w-7' },
};

export function BrandMark({ size = 'md', className }) {
  const style = SIZES[size] ?? SIZES.md;

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/25 via-accent/15 to-transparent ring-1 ring-primary/30 shadow-glow',
        style.wrap,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-accent-sheen opacity-10 blur-md"
      />
      <ShieldCheck className={cn('relative text-primary', style.icon)} aria-hidden="true" />
    </span>
  );
}
