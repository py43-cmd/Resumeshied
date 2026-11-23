import { cn } from '../../lib/utils.js';

export function Progress({ value = 0, className, ...props }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-200"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
