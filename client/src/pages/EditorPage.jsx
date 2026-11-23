import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';

import { Stepper } from '../components/shared/Stepper.jsx';
import { AccuracyDisclaimer } from '../components/shared/AccuracyDisclaimer.jsx';
import { PrivacyNote } from '../components/shared/PrivacyNote.jsx';
import { PagePreview } from '../components/editor/PagePreview.jsx';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useSession } from '../context/SessionContext.jsx';
import {
  getDocument,
  getDetections,
  runDetection,
} from '../lib/detectionApi.js';
import {
  getPagePreview,
  getRedactionPlan,
  saveRedactionPlan,
} from '../lib/editorApi.js';
import { groupByType, planLabel, privacyBlockerMessages } from '../lib/editorView.js';
import {
  initialReviewState,
  typeLabel,
  warningMessages,
} from '../lib/detectionView.js';
import { cn } from '../lib/utils.js';

function StatCard({ label, value, tone }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn('mt-1 text-2xl font-semibold', tone)}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function EditorPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { sessionId, session, updateSession } = useSession();

  const [documentInfo, setDocumentInfo] = useState(null);
  const [detections, setDetections] = useState([]);
  const [reviewState, setReviewState] = useState({});
  const [manualRegions, setManualRegions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const isPdf = documentInfo?.extension === '.pdf';
  const pageGeometry = useMemo(
    () => documentInfo?.extraction?.pageGeometry?.find((page) => page.pageNumber === currentPage) ?? null,
    [documentInfo, currentPage],
  );
  const pageCount = documentInfo?.extraction?.pageCount ?? 0;

  const load = useCallback(async () => {
    setPhase('loading');
    setError(null);

    try {
      const file = await getDocument(sessionId, documentId);
      setDocumentInfo(file);

      if (file.extraction?.status !== 'ready') {
        setError('This document must be extracted before editing.');
        setPhase('error');
        return;
      }

      let data = await getDetections(sessionId, documentId);
      if (data.detectionStatus === 'pending' || data.detectionStatus === 'needs_ocr') {
        data = await runDetection(sessionId, documentId);
      }
      setDetections(data.detections ?? []);

      const stored = session?.review?.documentId === documentId ? session.review.decisions : null;
      setReviewState({ ...initialReviewState(data.detections ?? []), ...(stored ?? {}) });

      try {
        const saved = await getRedactionPlan(sessionId, documentId);
        setPlan(saved.planStatus === 'pending' ? null : saved);
        const regions = (saved.plan?.items ?? [])
          .filter((item) => item.source === 'manual')
          .flatMap((item) =>
            item.bboxes.map((bbox, index) => ({
              id: `restored-${item.itemId}-${index}`,
              pageNumber: item.pageNumber,
              bbox,
            })),
          );
        if (regions.length > 0) setManualRegions(regions);
      } catch {
        // A missing plan simply means this is the first save.
        setPlan(null);
      }

      setPhase('ready');
    } catch (loadError) {
      setError(loadError.message ?? 'Could not load the editor.');
      setPhase('error');
    }
  }, [documentId, session?.review, sessionId]);

  useEffect(() => {
    if (sessionId && documentId) void load();
  }, [load, documentId, sessionId]);

  useEffect(() => {
    if (!isPdf || !sessionId || !documentId || phase !== 'ready') return undefined;

    let cancelled = false;
    let createdUrl = null;
    setPreviewUrl(null);
    setPreviewLoading(true);

    (async () => {
      try {
        const blob = await getPagePreview(sessionId, documentId, currentPage);
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setPreviewUrl(createdUrl);
      } catch {
        if (!cancelled) setPreviewUrl(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [currentPage, documentId, isPdf, phase, sessionId]);

  const overlays = useMemo(() => {
    const items = [];

    for (const detection of detections) {
      if (reviewState[detection.detectionId] !== 'accepted') continue;
      if (detection.pageNumber !== currentPage) continue;

      (detection.bboxes ?? []).forEach((bbox, index) => {
        items.push({
          key: `detection-${detection.detectionId}-${index}`,
          bbox,
          label: typeLabel(detection.type),
        });
      });
    }

    for (const region of manualRegions) {
      if (region.pageNumber !== currentPage) continue;
      items.push({ key: region.id, bbox: region.bbox, label: 'Manual' });
    }

    return items;
  }, [currentPage, detections, manualRegions, reviewState]);

  const grouped = useMemo(() => groupByType(detections), [detections]);
  const acceptedCount = detections.filter(
    (detection) => reviewState[detection.detectionId] === 'accepted',
  ).length;
  const undecidedCount = detections.filter(
    (detection) => !['accepted', 'rejected'].includes(reviewState[detection.detectionId]),
  ).length;

  function handleDecision(detectionId, decision) {
    setReviewState((current) => ({ ...current, [detectionId]: decision }));
  }

  function handleTypeToggle(type, items) {
    const allAccepted = items.every(
      (detection) => reviewState[detection.detectionId] === 'accepted',
    );
    setReviewState((current) => {
      const next = { ...current };
      for (const detection of items) {
        next[detection.detectionId] = allAccepted ? 'rejected' : 'accepted';
      }
      return next;
    });
  }

  function handleAddRegion(bbox) {
    setManualRegions((current) => [
      ...current,
      { id: `manual-${crypto.randomUUID()}`, pageNumber: currentPage, bbox },
    ]);
  }

  function handleRemoveRegion(id) {
    setManualRegions((current) => current.filter((region) => region.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveRedactionPlan(sessionId, documentId, {
        decisions: reviewState,
        manualRegions: manualRegions.map(({ pageNumber, bbox }) => ({ pageNumber, bbox })),
      });
      setPlan(result);

      if (result.planStatus === 'ready') {
        updateSession({ redactionId: result.plan.planId, review: { documentId, decisions: reviewState } });
        toast.success('Redaction plan saved.');
        navigate(`/export/${result.plan.planId}`);
      } else {
        updateSession({ review: { documentId, decisions: reviewState } });
        toast.warning('Plan saved, but privacy checks are blocking export.');
      }
    } catch (saveError) {
      toast.error(saveError.message ?? 'Could not save the redaction plan.');
    } finally {
      setSaving(false);
    }
  }

  const blockers = privacyBlockerMessages(plan?.plan?.privacyBlockers ?? []);
  const fidelityWarnings = warningMessages(plan?.plan?.fidelityWarnings ?? []);

  return (
    <div>
      <Stepper current={3} />

      <div className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Choose what to hide</h1>
          <Badge variant={plan?.planStatus === 'ready' ? 'success' : 'muted'}>
            {planLabel(plan?.planStatus ?? 'pending')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {documentInfo?.originalName ? (
            <>
              Document: <span className="font-medium text-foreground">{documentInfo.originalName}</span>
            </>
          ) : (
            'Loading document details…'
          )}
        </p>
      </div>

      <AccuracyDisclaimer />

      {phase === 'loading' && (
        <Card className="mt-6">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Preparing the visual editor…
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
          <AlertTitle>Editor unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {phase === 'ready' && (
        <>
          {!isPdf && (
            <Alert variant="warning" className="mt-6">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
              <AlertTitle>Precise placement requires a PDF</AlertTitle>
              <AlertDescription>
                Non-PDF documents have no page coordinates yet. Conversion to PDF happens in the
                export step, so the visual overlay is unavailable here.
              </AlertDescription>
            </Alert>
          )}

          {blockers.length > 0 && (
            <Alert variant="destructive" className="mt-6">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              <AlertTitle>Privacy checks are blocking export</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {blockers.map((blocker) => (
                    <li key={blocker.code}>{blocker.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {fidelityWarnings.length > 0 && (
            <Alert variant="warning" className="mt-6">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
              <AlertTitle>Formatting limitations</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {fidelityWarnings.map((warning) => (
                    <li key={warning.code}>{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Found" value={detections.length} />
            <StatCard
              label="Needs decision"
              value={undecidedCount}
              tone={undecidedCount > 0 ? 'text-warning' : undefined}
            />
            <StatCard label="Marked to hide" value={acceptedCount} tone="text-success" />
            <StatCard label="Manual regions" value={manualRegions.length} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Original page</CardTitle>
                  <CardDescription>
                    Red overlays show what will be removed from the final PDF.
                  </CardDescription>
                </div>
                {isPdf && pageCount > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Previous page"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <span className="px-2 text-xs text-muted-foreground">
                      {currentPage} / {pageCount}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Next page"
                      disabled={currentPage >= pageCount}
                      onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {isPdf ? (
                  <PagePreview
                    previewUrl={previewUrl}
                    loading={previewLoading}
                    pageGeometry={pageGeometry}
                    overlays={overlays}
                    onAddRegion={handleAddRegion}
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
                    No coordinate preview for this file type.
                  </div>
                )}

                {manualRegions.filter((region) => region.pageNumber === currentPage).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Manual areas on this page
                    </p>
                    {manualRegions
                      .filter((region) => region.pageNumber === currentPage)
                      .map((region) => (
                        <div
                          key={region.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
                        >
                          <span className="font-mono">
                            ({region.bbox.x}, {region.bbox.y}) {region.bbox.width}×{region.bbox.height} pt
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Remove manual area"
                            onClick={() => handleRemoveRegion(region.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Masking controls</CardTitle>
                <CardDescription>
                  Values are masked on the server. Raw matches never reach this screen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {grouped.map((group) => {
                  const allAccepted = group.items.every(
                    (detection) => reviewState[detection.detectionId] === 'accepted',
                  );
                  return (
                    <Button
                      key={group.type}
                      size="sm"
                      variant={allAccepted ? 'secondary' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => handleTypeToggle(group.type, group.items)}
                    >
                      {allAccepted ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {allAccepted ? 'Keep all' : 'Hide all'} {typeLabel(group.type)} (
                      {group.items.length})
                    </Button>
                  );
                })}

                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {detections.map((detection) => {
                    const decision = reviewState[detection.detectionId] ?? 'undecided';
                    return (
                      <div
                        key={detection.detectionId}
                        className={cn(
                          'rounded-lg border p-3',
                          decision === 'rejected' && 'border-border bg-muted/20 opacity-70',
                          decision === 'accepted' && 'border-rose-300 bg-rose-50/50',
                          decision === 'undecided' && 'border-border bg-card',
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline">{typeLabel(detection.type)}</Badge>
                              {detection.needsReview && <Badge variant="warning">Confirm</Badge>}
                            </div>
                            <p className="break-all font-mono text-xs text-foreground">
                              {detection.maskedValue}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {detection.pageNumber ? `Page ${detection.pageNumber}` : 'No page'}
                              {(detection.bboxes?.length ?? 0) > 0 &&
                                ` · ${detection.bboxes.length} box(es)`}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              size="sm"
                              variant={decision === 'accepted' ? 'default' : 'outline'}
                              aria-pressed={decision === 'accepted'}
                              aria-label={`Hide ${typeLabel(detection.type)}`}
                              onClick={() => handleDecision(detection.detectionId, 'accepted')}
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              size="sm"
                              variant={decision === 'rejected' ? 'secondary' : 'ghost'}
                              aria-pressed={decision === 'rejected'}
                              aria-label={`Keep ${typeLabel(detection.type)} visible`}
                              onClick={() => handleDecision(detection.detectionId, 'rejected')}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {detections.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No detections were found. You can still mark manual areas above.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">
              {blockers.length > 0 ? (
                <p>Resolve the privacy blockers above before continuing.</p>
              ) : (
                <p>All decisions recorded. Save the plan to continue.</p>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              {saving ? 'Saving…' : 'Save & continue'}
            </Button>
          </div>
        </>
      )}

      <div className="mt-6">
        <PrivacyNote />
      </div>
    </div>
  );
}
