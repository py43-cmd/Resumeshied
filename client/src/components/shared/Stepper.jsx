import { Check } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Detect' },
  { id: 3, label: 'Review' },
  { id: 4, label: 'Export' },
];

export function Stepper({ current }) {
  return (
    <ol
      className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/50 p-3 text-sm shadow-card backdrop-blur-sm"
      aria-label="Progress"
    >
      {STEPS.map((step, index) => {
        const complete = step.id < current;
        const active = step.id === current;

        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all',
                complete && 'border-success/40 bg-success/15 text-success shadow-[0_0_12px_hsl(var(--success)/0.25)]',
                active && 'border-primary/50 bg-primary text-primary-foreground shadow-glow',
                !complete && !active && 'border-border bg-muted/50 text-muted-foreground',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : step.id}
            </span>
            <span
              className={cn(
                'transition-colors',
                active && 'font-semibold text-foreground',
                complete && 'text-foreground/80',
                !complete && !active && 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="mx-1 h-px w-6 bg-gradient-to-r from-primary/50 to-border sm:w-10"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
