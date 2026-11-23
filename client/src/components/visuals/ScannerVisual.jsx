import { Check, FileText, ScanLine } from 'lucide-react';

import { Badge } from '../ui/Badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card.jsx';

const MATCHES = [
  { label: 'Email', value: 'a***@***.com', tone: 'destructive' },
  { label: 'Phone', value: '+91 ••••••••••', tone: 'warning' },
  { label: 'Name', value: 'R*** S***', tone: 'accent' },
];

export function ScannerVisual() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-8 rounded-[3rem] bg-primary/10 blur-3xl animate-float-soft"
      />

      <Card className="relative overflow-hidden shadow-panel">
        <div aria-hidden="true" className="gradient-hairline absolute inset-x-0 top-0" />

        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25 animate-pulse-glow">
              <ScanLine className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Live privacy scan</CardTitle>
              <CardDescription>Local engine · no network calls</CardDescription>
            </div>
          </div>
          <Badge variant="success" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_10px_hsl(var(--success))]" />
            Complete
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">resume.pdf</p>
              <p className="text-xs text-muted-foreground">2 pages · text layer found</p>
            </div>
            <Badge variant="outline">PDF</Badge>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full rounded-full bg-accent-sheen shadow-glow" />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
            <div className="relative h-[220px] overflow-hidden rounded-xl border border-border bg-gradient-to-b from-zinc-200 to-zinc-300 p-4 text-zinc-800 shadow-inner">
              <div className="space-y-2.5">
                <div className="h-2.5 w-1/3 rounded bg-zinc-700" />
                <div className="h-2 w-2/3 rounded bg-zinc-400" />
                <div className="h-2.5 w-1/2 rounded bg-black" />
                <div className="h-2 w-5/6 rounded bg-zinc-400" />
                <div className="h-2 w-3/4 rounded bg-zinc-400" />
                <div className="h-2.5 w-2/5 rounded bg-black" />
                <div className="h-2 w-4/5 rounded bg-zinc-400" />
                <div className="h-2 w-1/2 rounded bg-zinc-400" />
                <div className="h-2.5 w-1/3 rounded bg-black" />
                <div className="h-2 w-2/3 rounded bg-zinc-400" />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-12 animate-scanline bg-gradient-to-b from-transparent via-primary/40 to-transparent"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Masked matches
              </p>
              {MATCHES.map((match) => (
                <div
                  key={match.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/25 px-3 py-2"
                >
                  <Badge variant={match.tone}>{match.label}</Badge>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {match.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
              3 items ready to hide
            </span>
            <span className="font-medium text-primary">Layout preserved</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
