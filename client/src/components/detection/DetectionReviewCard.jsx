import { AlertTriangle, Check, X } from 'lucide-react';

import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import {
  confidencePercent,
  decisionVariant,
  iconContextLabel,
  methodLabel,
  typeLabel,
} from '../../lib/detectionView.js';

export function DetectionReviewCard({ detection, decision = 'undecided', onDecision }) {
  const pageLabel = Number.isInteger(detection.pageNumber)
    ? `Page ${detection.pageNumber}`
    : 'No page coordinate';
  const iconLabel = iconContextLabel(detection);

  return (
    <article
      className={`rounded-lg border p-4 transition-all ${
        decision === 'accepted'
          ? 'border-rose-300 bg-rose-50/60 ring-1 ring-rose-200'
          : decision === 'rejected'
            ? 'border-border bg-muted/20 opacity-70'
            : 'border-border bg-card'
      }`}
      data-detection-id={detection.detectionId}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={decisionVariant(detection, decision)}>{typeLabel(detection.type)}</Badge>
            {detection.needsReview && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Confirm
              </Badge>
            )}
            {decision === 'accepted' && (
              <Badge variant="destructive" className="gap-1 border-transparent bg-black text-white">
                <Check className="h-3 w-3" aria-hidden="true" />
                Marked to hide
              </Badge>
            )}
            {decision === 'rejected' && <Badge variant="muted">Kept visible</Badge>}
            {iconLabel && <Badge variant="outline">{iconLabel}</Badge>}
          </div>

          {decision === 'accepted' ? (
            <p
              className="inline-block max-w-full select-none break-all rounded-sm bg-black px-1.5 py-0.5 font-mono text-sm text-black"
              title="This value is marked to hide"
            >
              {detection.maskedValue}
            </p>
          ) : (
            <p className="break-all font-mono text-sm text-foreground">{detection.maskedValue}</p>
          )}

          <p className="text-xs text-muted-foreground">
            {pageLabel} · {methodLabel(detection.method)} · {confidencePercent(detection.confidence)}{' '}
            confidence
            {(detection.bboxes?.length ?? 0) > 0 && ` · ${detection.bboxes.length} position${
              detection.bboxes.length === 1 ? '' : 's'
            }`}
          </p>

          {detection.reason && (
            <p className="text-xs text-muted-foreground">{detection.reason}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant={decision === 'accepted' ? 'default' : 'outline'}
            aria-pressed={decision === 'accepted'}
            aria-label={`Hide ${typeLabel(detection.type)}`}
            onClick={() => onDecision(detection.detectionId, 'accepted')}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Hide
          </Button>
          <Button
            size="sm"
            variant={decision === 'rejected' ? 'secondary' : 'ghost'}
            aria-pressed={decision === 'rejected'}
            aria-label={`Keep ${typeLabel(detection.type)} visible`}
            onClick={() => onDecision(detection.detectionId, 'rejected')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Keep
          </Button>
        </div>
      </div>
    </article>
  );
}
