import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  Maximize2,
  MousePointer2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { bboxToPercent, pointerToBbox, relativePoint } from '../../lib/editorView.js';
import { Button } from '../ui/Button.jsx';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

/**
 * Shows the original page with solid black preview boxes. The boxes use the
 * same PDF-point coordinates as the exported redactions, so zooming the page
 * scales the image and every box together without shifting alignment.
 */
export function PagePreview({
  previewUrl,
  loading,
  error,
  pageGeometry,
  overlays = [],
  onAddRegion,
  onRetry,
}) {
  const imageRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);

  const pageWidth = pageGeometry?.width ?? 0;
  const pageHeight = pageGeometry?.height ?? 0;
  const draft = dragStart && dragEnd ? pointerToBbox(dragStart, dragEnd, pageWidth, pageHeight) : null;

  function handlePointerDown(event) {
    if (!imageRef.current || !previewUrl) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = relativePoint(event, imageRef.current, pageWidth, pageHeight);
    setDragStart(point);
    setDragEnd(point);
  }

  function handlePointerMove(event) {
    if (!dragStart || !imageRef.current) return;
    setDragEnd(relativePoint(event, imageRef.current, pageWidth, pageHeight));
  }

  function handlePointerUp(event) {
    if (!dragStart) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const bbox = pointerToBbox(dragStart, dragEnd, pageWidth, pageHeight);
    if (bbox && onAddRegion) onAddRegion(bbox);
    setDragStart(null);
    setDragEnd(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          Solid black boxes match the downloaded PDF.
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM || !previewUrl}
            onClick={() => setZoom((value) => clampZoom(value - ZOOM_STEP))}
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <span
            className="w-12 text-center text-xs font-medium tabular-nums text-foreground"
            aria-live="polite"
          >
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM || !previewUrl}
            onClick={() => setZoom((value) => clampZoom(value + ZOOM_STEP))}
          >
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Fit page to width"
            title="Fit page to width"
            disabled={zoom === MIN_ZOOM || !previewUrl}
            onClick={() => setZoom(MIN_ZOOM)}
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="max-h-[68vh] min-h-[280px] overflow-auto rounded-xl border border-border bg-card shadow-card">
        <div
          className="relative mx-auto min-w-full"
          style={{ width: `${zoom * 100}%` }}
        >
          {previewUrl ? (
            <>
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Original resume page with redaction areas marked in black"
                className="block w-full min-w-full select-none"
                draggable="false"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => {
                  setDragStart(null);
                  setDragEnd(null);
                }}
              />

              {loading && (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center bg-background/50"
                  role="status"
                  aria-label="Loading page preview"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                </div>
              )}

              {overlays.map((overlay) => {
                const style = bboxToPercent(overlay.bbox, pageWidth, pageHeight);
                if (!style) return null;

                return (
                  <div
                    key={overlay.key}
                    className="pointer-events-none absolute z-10 bg-black"
                    style={style}
                    title={`Hidden: ${overlay.label}`}
                  />
                );
              })}

              {draft && (
                <div
                  className="pointer-events-none absolute z-10 border-2 border-dashed border-accent bg-accent/20"
                  style={bboxToPercent(draft, pageWidth, pageHeight)}
                />
              )}
            </>
          ) : error ? (
            <div className="flex aspect-[3/4] min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle className="h-7 w-7 text-warning" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Page preview unavailable</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                The page image could not be loaded. You can retry without losing your decisions.
              </p>
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry preview
                </Button>
              )}
            </div>
          ) : (
            <div className="flex aspect-[3/4] min-h-[280px] flex-col items-center justify-center gap-2 bg-card text-muted-foreground">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <MousePointer2 className="h-8 w-8 text-primary" aria-hidden="true" />
              )}
              <p className="px-6 text-center text-xs">
                A page preview is available for extracted PDF documents.
              </p>
            </div>
          )}
        </div>
      </div>

      {previewUrl && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Drag on the page to mark another area to hide. Zoom to inspect, then use Fit to return to
          the page width.
        </p>
      )}
    </div>
  );
}
