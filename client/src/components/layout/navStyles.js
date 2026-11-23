import { cn } from '../../lib/utils.js';

/** Shared pill styling for desktop and mobile navigation items. */
export function navPillClass(active = false) {
  return cn(
    'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
    active
      ? 'bg-primary/15 text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  );
}
