import { useRef, useState } from 'react';
import { Loader2, MousePointer2 } from 'lucide-react';

import { bboxToPercent, pointerToBbox, relativePoint } from '../../lib/editorView.js';

/**
 * Shows the original page with non-destructive overlay boxes. Dragging on the
 * image records a manual region in PDF points; the underlying page is untouched.
 */
export function PagePreview({ previewUrl, loading, pageGeometry, overlays = [], onAddRegion }) {
  const imageRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

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
      <div className="relative inline-block w-full overflow-hidden rounded-md border border-border bg-white shadow-card">
        {loading && (
          <div className="absolute inset-0 z-20 flex aspect-[3/4] items-center justify-center bg-muted/40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {previewUrl ? (
          <img
            ref={imageRef}
            src={previewUrl}
            alt="Original resume page"
            className="block w-full select-none"
            draggable="false"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              setDragStart(null);
              setDragEnd(null);
            }}
          />
        ) : (
          !loading && (
            <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 text-muted-foreground">
              <MousePointer2 className="h-8 w-8" aria-hidden="true" />
              <p className="px-6 text-center text-xs">
                A page preview is available for extracted PDF documents.
              </p>
            </div>
          )
        )}

        {previewUrl &&
          overlays.map((overlay) => {
            const style = bboxToPercent(overlay.bbox, pageWidth, pageHeight);
            if (!style) return null;

            return (
              <div
                key={overlay.key}
                className="pointer-events-none absolute z-10 rounded-sm border-2 border-rose-500/80 bg-rose-500/25"
                style={style}
                title={overlay.label}
              >
                {overlay.label && (
                  <span className="absolute -top-5 left-0 max-w-[160px] truncate rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {overlay.label}
                  </span>
                )}
              </div>
            );
          })}

        {previewUrl && draft && (
          <div
            className="pointer-events-none absolute z-10 rounded-sm border-2 border-dashed border-sky-500 bg-sky-400/20"
            style={bboxToPercent(draft, pageWidth, pageHeight)}
          />
        )}
      </div>

      {previewUrl && (
        <p className="text-xs text-muted-foreground">
          Drag on the page to mark an additional area to hide. Existing highlights show accepted
          matches only.
        </p>
      )}
    </div>
  );
}
