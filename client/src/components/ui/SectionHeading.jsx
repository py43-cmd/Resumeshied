import { Badge } from './Badge.jsx';
import { cn } from '../../lib/utils.js';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}) {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'space-y-3',
        centered && 'mx-auto max-w-3xl text-center',
        className,
      )}
    >
      {eyebrow && (
        <Badge variant="outline" className={cn('w-fit', centered && 'mx-auto')}>
          {eyebrow}
        </Badge>
      )}
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {description && (
        <p
          className={cn(
            'max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base',
            centered && 'mx-auto',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
