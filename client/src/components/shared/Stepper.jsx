import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const STEPS = [
  { id: 1, label: 'Upload', path: '/upload' },
  { id: 2, label: 'Detect' },
  { id: 3, label: 'Redact' },
  { id: 4, label: 'Download' },
];

function stepPath(step, documentId) {
  if (step.id === 1) return '/upload';
  if (!documentId) return null;
  if (step.id === 2) return `/detect/${documentId}`;
  if (step.id === 3) return `/editor/${documentId}`;
  return `/export/${documentId}`;
}

export function Stepper({ current, documentId }) {
  return (
    <nav
      aria-label="Progress"
      className="mb-8 overflow-x-auto rounded-xl border border-border bg-surface/50 p-3 shadow-card"
    >
      <ol className="flex min-w-max items-center gap-2 text-sm">
        {STEPS.map((step, index) => {
          const complete = step.id < current;
          const active = step.id === current;
          const href = complete ? stepPath(step, documentId) : null;
          const stateClass = cn(
            'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
            complete && 'border-success/40 bg-success/15 text-success',
            active && 'border-primary/50 bg-primary text-primary-foreground',
            !complete && !active && 'border-border bg-muted/50 text-muted-foreground',
          );
          const labelClass = cn(
            'transition-colors',
            active && 'font-semibold text-foreground',
            complete && 'text-foreground/80',
            !complete && !active && 'text-muted-foreground',
          );

          const content = (
            <>
              <span className={stateClass} aria-current={active ? 'step' : undefined}>
                {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : step.id}
              </span>
              <span className={labelClass}>{step.label}</span>
              {complete && <span className="sr-only">completed</span>}
            </>
          );

          return (
            <li key={step.id} className="flex items-center gap-2">
              {href ? (
                <Link to={href} className="flex items-center gap-2 rounded-md hover:opacity-80">
                  {content}
                </Link>
              ) : (
                <span className="flex items-center gap-2">{content}</span>
              )}
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
    </nav>
  );
}
