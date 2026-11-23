import { Card, CardContent } from './Card.jsx';
import { cn } from '../../lib/utils.js';

const TONES = {
  primary: 'bg-primary/10 text-primary ring-primary/25',
  accent: 'bg-accent/10 text-accent ring-accent/25',
  success: 'bg-success/10 text-success ring-success/25',
  warning: 'bg-warning/10 text-warning ring-warning/25',
  destructive: 'bg-destructive/10 text-destructive ring-destructive/25',
  muted: 'bg-muted text-muted-foreground ring-border',
};

export function MetricCard({ label, value, icon: Icon, tone = 'primary', hint }) {
  return (
    <Card className="group relative overflow-hidden">
      <div aria-hidden="true" className="gradient-hairline absolute inset-x-0 top-0 opacity-70" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {Icon && (
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105',
                TONES[tone] ?? TONES.primary,
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
