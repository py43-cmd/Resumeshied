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
import { formatBytes } from '../../lib/utils.js';

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

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={view.variant} className="gap-1">
            <Icon className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
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

      {(phase === 'uploading' || phase === 'extracting') && (
        <div className="mt-4 space-y-2">
          <Progress value={phase === 'extracting' ? 100 : progress} />
          <p className="text-xs text-muted-foreground">
            {phase === 'uploading' ? `${progress}% uploaded` : 'Extracting text and page layout…'}
          </p>
        </div>
      )}

      {phase === 'done' && extraction?.status === 'ready' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">
            {extraction.pageCount ?? 'Unknown'} page
            {extraction.pageCount === 1 ? '' : 's'} detected ·{' '}
            {extraction.hasCoordinates ? 'positions available' : 'text only'}
          </span>
          <Button size="sm" onClick={onContinue}>
            Continue to detection
          </Button>
        </div>
      )}
    </div>
  );
}
