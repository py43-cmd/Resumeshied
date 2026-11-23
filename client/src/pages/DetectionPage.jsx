import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, FileSearch, Loader2, ScanLine } from 'lucide-react';

import { Stepper } from '../components/shared/Stepper.jsx';
import { AccuracyDisclaimer } from '../components/shared/AccuracyDisclaimer.jsx';
import { PrivacyNote } from '../components/shared/PrivacyNote.jsx';
import { DetectionReviewCard } from '../components/detection/DetectionReviewCard.jsx';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useSession } from '../context/SessionContext.jsx';
import {
  getDetections,
  getDocument,
  runDetection,
  runOcr,
} from '../lib/detectionApi.js';
import {
  groupDetectionsByPage,
  initialReviewState,
  reviewSummary,
  warningMessages,
} from '../lib/detectionView.js';

function StatCard({ label, value, tone = 'default' }) {
  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />
      <CardContent className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className={`mt-2 text-2xl font-semibold tracking-tight ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function DetectionPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { sessionId, session, updateSession } = useSession();

  const [documentInfo, setDocumentInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [reviewState, setReviewState] = useState(() => {
    const stored = session?.review?.documentId === documentId ? session.review.decisions : null;
    return stored ?? {};
  });
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);

  const load = useCallback(async () => {
    setPhase('loading');
    setError(null);

    try {
      const file = await getDocument(sessionId, documentId);
      setDocumentInfo(file);

      const status = file.extraction?.status;
      if (status === 'needs_ocr') {
        setResult(null);
        setPhase('needs_ocr');
        return;
      }
      if (status !== 'ready') {
        setResult(null);
        setError(
          status === 'unsupported'
            ? 'This document cannot be processed in its current format.'
            : 'This document is not ready for detection yet.',
        );
        setPhase('error');
        return;
      }

      let data = await getDetections(sessionId, documentId);
      if (data.detectionStatus === 'pending' || data.detectionStatus === 'needs_ocr') {
        data = await runDetection(sessionId, documentId);
      }

      if (data.detectionStatus !== 'ready') {
        setResult(null);
        setError('Detection is unavailable for this document.');
        setPhase('error');
        return;
      }

      setResult(data);
      setReviewState((current) => ({ ...initialReviewState(data.detections), ...current }));
      setPhase('ready');
    } catch (loadError) {
      setError(loadError.message ?? 'Could not load detections.');
      setPhase('error');
    }
  }, [documentId, sessionId]);

  useEffect(() => {
    if (sessionId && documentId) void load();
  }, [load, documentId, sessionId]);

  async function handleOcr() {
    setOcrBusy(true);
    setError(null);

    try {
      const file = await runOcr(sessionId, documentId);
      setDocumentInfo(file);

      const data = await runDetection(sessionId, documentId);
      setResult(data);
      setReviewState(initialReviewState(data.detections));
      setPhase('ready');
      toast.success('Local OCR complete. Confirm the matches before continuing.');
    } catch (ocrError) {
      setError(ocrError.message ?? 'Local OCR failed.');
      toast.error(ocrError.message ?? 'Local OCR failed.');
    } finally {
      setOcrBusy(false);
    }
  }

  function handleDecision(detectionId, decision) {
    setReviewState((current) => ({ ...current, [detectionId]: decision }));
  }

  function handleContinue() {
    const summary = reviewSummary(result?.detections ?? [], reviewState);
    if (!summary.ready) return;

    // Only IDs and decisions are stored. No matched values or document text.
    updateSession({ review: { documentId, decisions: reviewState } });
    navigate(`/editor/${documentId}`);
  }

  const summary = reviewSummary(result?.detections ?? [], reviewState);
  const groups = groupDetectionsByPage(result?.detections ?? []);
  const positionedCount = (result?.detections ?? []).filter(
    (detection) => (detection.bboxes?.length ?? 0) > 0,
  ).length;
  const warnings = warningMessages([
    ...(result?.warnings ?? []),
    ...(documentInfo?.extraction?.warnings ?? []),
  ]);

  return (
    <div>
      <Stepper current={2} />

      <div className="mb-7 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Review detected information
          </h1>
          <Badge variant={phase === 'ready' ? 'success' : 'muted'}>
            {phase === 'ready' ? 'Detection complete' : 'Local detection'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {documentInfo?.originalName ? (
            <>
              Document:{' '}
              <span className="font-medium text-foreground">{documentInfo.originalName}</span>
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
            Reading detection results…
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
          <AlertTitle>Detection could not continue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {phase === 'needs_ocr' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>This PDF is a scan</CardTitle>
            <CardDescription>
              There is no embedded text layer, so we cannot truthfully show matches yet.
              OCR runs entirely on this server using local language data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
              <AlertDescription>
                OCR-derived matches are marked for mandatory review. Positions and
                formatting will be reported honestly before export.
              </AlertDescription>
            </Alert>
            <Button onClick={handleOcr} disabled={ocrBusy}>
              {ocrBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ScanLine className="h-4 w-4" aria-hidden="true" />
              )}
              {ocrBusy ? 'Running local OCR…' : 'Run local OCR'}
            </Button>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {warnings.length > 0 && (
            <Alert variant="warning" className="mt-6">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
              <AlertTitle>Review these limitations</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {warnings.map((warning) => (
                    <li key={warning.code}>{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Found" value={summary.total} />
            <StatCard label="Needs confirmation" value={summary.undecided} tone="text-warning" />
            <StatCard label="Marked to hide" value={summary.accepted} tone="text-success" />
            <StatCard label="Kept visible" value={summary.rejected} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Document preview</CardTitle>
                <CardDescription>
                  Highlight overlays arrive with the redaction editor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
                    <FileSearch className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <p className="px-4 text-xs leading-relaxed text-muted-foreground">
                    {documentInfo?.extraction?.pageCount ?? 'Unknown'} page(s) ·{' '}
                    {positionedCount} positioned match(es)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Masked matches</CardTitle>
                <CardDescription>
                  Values are masked on the server. Raw matches are never sent to this UI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {result.detections.length === 0 && (
                  <Alert variant="success">
                    <AlertDescription>
                      No personal information was detected. You can still continue.
                    </AlertDescription>
                  </Alert>
                )}

                {groups.map((group) => (
                  <section key={group.pageNumber ?? 'text-only'} className="space-y-3">
                    <h3 className="text-sm font-semibold">
                      {group.pageNumber === null ? 'Text-only matches' : `Page ${group.pageNumber}`}
                    </h3>
                    {group.detections.map((detection) => (
                      <DetectionReviewCard
                        key={detection.detectionId}
                        detection={detection}
                        decision={reviewState[detection.detectionId] ?? 'undecided'}
                        onDecision={handleDecision}
                      />
                    ))}
                  </section>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="surface-panel mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">
              {summary.undecided > 0
                ? `${summary.undecided} match${summary.undecided === 1 ? '' : 'es'} still need your decision.`
                : 'All decisions recorded. You can continue.'}
            </p>
            <Button onClick={handleContinue} disabled={!summary.ready}>
              Continue to redaction
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
