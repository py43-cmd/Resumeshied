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
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-sm" aria-label="Progress">
      {STEPS.map((step, index) => {
        const complete = step.id < current;
        const active = step.id === current;

        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                complete && 'border-accent bg-accent text-accent-foreground',
                active && 'border-primary bg-primary text-primary-foreground',
                !complete && !active && 'border-border bg-surface text-muted-foreground',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : step.id}
            </span>
            <span className={cn(active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {step.label}
            </span>
            {index < STEPS.length - 1 && <span className="mx-2 h-px w-6 bg-border sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}
