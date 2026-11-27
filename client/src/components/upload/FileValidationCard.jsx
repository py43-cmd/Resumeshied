import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  LockKeyhole,
  Trash2,
} from 'lucide-react';

import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Progress } from '../ui/Progress.jsx';
import { cn, formatBytes } from '../../lib/utils.js';

function statusView(phase, extraction, error) {
  if (error) {
    return { variant: 'destructive', icon: AlertTriangle, label: 'Rejected' };
  }
  if (phase === 'validating') {
    return { variant: 'muted', icon: Loader2, label: 'Validating…' };
  }
  if (phase === 'uploading') {
    return { variant: 'muted', icon: Loader2, label: 'Uploading…' };
  }
  if (phase === 'extracting') {
    return { variant: 'muted', icon: Loader2, label: 'Reading document…' };
  }

  switch (extraction?.status) {
    case 'ready':
      return { variant: 'success', icon: CheckCircle2, label: 'Ready to detect' };
    case 'needs_ocr':
      return { variant: 'warning', icon: AlertTriangle, label: 'Scanned — OCR required' };
    case 'unsupported':
      return { variant: 'destructive', icon: LockKeyhole, label: 'Unsupported document' };
    default:
      return { variant: 'destructive', icon: AlertTriangle, label: 'Could not read file' };
  }
}

export function FileValidationCard({
  file,
  phase,
  progress,
  extraction,
  error,
  onRemove,
  onContinue,
}) {
  const view = statusView(phase, extraction, error);
  const Icon = view.icon;
  const busy = ['validating', 'uploading', 'extracting'].includes(phase);
  const complete = phase === 'done' && ['ready', 'needs_ocr'].includes(extraction?.status);

  return (
    <section className="surface-panel rounded-2xl p-5 sm:p-6" aria-label="Upload status">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-accent">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground sm:text-[15px]">
              {file.name}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={view.variant} className="gap-1.5" aria-live="polite">
            <Icon className={cn('h-3.5 w-3.5', busy && 'animate-spin')} aria-hidden="true" />
            {view.label}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Remove file and destroy session"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {busy && (
        <div className="mt-5 rounded-xl border border-border/70 bg-background/30 p-4">
          <div className="mb-2.5 flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-foreground">
              {phase === 'validating'
                ? 'Checking file…'
                : phase === 'uploading'
                  ? 'Uploading…'
                  : 'Reading document…'}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {phase === 'uploading' ? `${progress}%` : 'Working'}
            </span>
          </div>
          <Progress
            value={progress}
            indeterminate={phase !== 'uploading'}
            label={`${phase} progress`}
            className="h-1.5"
          />
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            {phase === 'validating'
              ? 'Confirming the file type and size before anything is uploaded.'
              : phase === 'uploading'
                ? 'Transferring your file to the temporary session.'
                : 'Extracting text and page layout for detection.'}
          </p>
        </div>
      )}

      {complete && (
        <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              {extraction.pageCount ?? 'Unknown'} page
              {extraction.pageCount === 1 ? '' : 's'} detected ·{' '}
              {extraction.status === 'needs_ocr'
                ? 'local OCR required'
                : extraction.hasCoordinates
                  ? 'positions available'
                  : 'text only'}
            </span>
          </p>
          <Button size="sm" onClick={onContinue} className="w-full sm:w-auto">
            {extraction.status === 'needs_ocr' ? 'Review scan / run OCR' : 'Continue to detection'}
          </Button>
        </div>
      )}
    </section>
  );
}
