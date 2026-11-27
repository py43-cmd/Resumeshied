import { cn } from '../../lib/utils.js';

export function Progress({
  value = 0,
  indeterminate = false,
  label = 'Progress',
  className,
  ...props
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : safeValue}
      aria-valuetext={indeterminate ? 'Working' : `${safeValue}%`}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full bg-cta',
          indeterminate ? 'w-1/3 animate-indeterminate' : 'transition-[width] duration-300',
        )}
        style={indeterminate ? undefined : { width: `${safeValue}%` }}
      />
    </div>
  );
}
