import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Download,
  FileCheck2,
  Loader2,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { Stepper } from '../components/shared/Stepper.jsx';
import { PrivacyNote } from '../components/shared/PrivacyNote.jsx';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { warningMessages } from '../lib/detectionView.js';
import { createRedaction, downloadRedaction } from '../lib/exportApi.js';
import { destroySession } from '../lib/sessionApi.js';
import { checkStatus, EXPORT_CHECKS } from '../lib/exportView.js';

const STATUS_ICONS = {
  pass: { Icon: Check, className: 'text-success' },
  warning: { Icon: AlertTriangle, className: 'text-warning' },
  fail: { Icon: XCircle, className: 'text-destructive' },
};

export default function ExportPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { sessionId, updateSession, clearSession } = useSession();

  const [phase, setPhase] = useState('processing');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const createdForRef = useRef(null);
  const downloadUrlRef = useRef(null);

  const create = useCallback(
    async ({ force = false } = {}) => {
      const key = `${sessionId}:${documentId}`;
      // React StrictMode can mount this page twice in development. Only one
      // redaction should be generated for a single visit to this step.
      if (!force && createdForRef.current === key) return;

      createdForRef.current = key;
      setPhase('processing');
      setError(null);

      try {
        const data = await createRedaction(sessionId, documentId);
        setResult(data);
        setPhase('ready');
        updateSession({ redactionId: data.redactionId });
      } catch (createError) {
        createdForRef.current = null;
        setError(createError.message ?? 'Could not create the sanitized PDF.');
        setPhase('error');
      }
    },
    [documentId, sessionId, updateSession],
  );

  useEffect(() => {
    if (sessionId && documentId) void create();
  }, [create, documentId, sessionId]);

  useEffect(
    () => () => {
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    },
    [],
  );

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await downloadRedaction(sessionId, result.redactionId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'sanitized-resume.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      downloadUrlRef.current = url;
      // Give the browser time to start the download before releasing the blob.
      window.setTimeout(() => {
        if (downloadUrlRef.current === url) {
          URL.revokeObjectURL(url);
          downloadUrlRef.current = null;
        }
      }, 1000);
      toast.success('Sanitized resume downloaded.');
    } catch (downloadError) {
      toast.error(downloadError.message ?? 'Could not download the sanitized PDF.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleStartNew() {
    if (sessionId) {
      try {
        await destroySession(sessionId);
      } catch {
        // The TTL sweeper will clean it up if the network call fails.
      }
    }
    clearSession();
    toast.info('Temporary session closed. Start a new upload.');
    navigate('/upload');
  }

  const warningCodes = result?.warnings ?? [];
  const warnings = warningMessages(warningCodes);

  return (
    <div>
      <Stepper current={4} documentId={documentId} />

      <div className="mb-6 space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to={`/editor/${documentId}`}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back to editor
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-section font-semibold">Your sanitized resume</h1>
          <Badge
            variant={
              phase === 'ready' ? (warningCodes.length > 0 ? 'warning' : 'success') : 'muted'
            }
          >
            {phase === 'ready'
              ? warningCodes.length > 0
                ? 'Ready with notes'
                : 'Ready to download'
              : phase === 'error'
                ? 'Export blocked'
                : 'Rewriting PDF'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Your uploaded file is kept only for this temporary session and is deleted when it expires.
        </p>
      </div>

      {phase === 'processing' && (
        <Card className="mt-6">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            Rewriting the PDF and verifying the result in your private session…
          </CardContent>
        </Card>
      )}

      {phase === 'error' && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
          <AlertTitle>Export could not continue</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void create({ force: true })}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Try export again
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to={`/editor/${documentId}`}>Return to the editor</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {phase === 'ready' && result && (
        <>
          {warnings.length > 0 && (
            <Alert variant="warning" className="mt-6">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
              <AlertTitle>Review these formatting notes</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {warnings.map((warning) => (
                    <li key={warning.code}>{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Card className="mt-6 overflow-hidden">
            <div
              aria-hidden="true"
              className="h-px bg-gradient-to-r from-transparent via-success/60 to-transparent"
            />
            <CardHeader>
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success ring-1 ring-success/25">
                  <FileCheck2 className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Redaction complete</CardTitle>
                  <CardDescription>
                    {result.pageCount} page(s) · {result.redactedBoxCount} area(s) permanently
                    removed · {result.removedAnnotationCount} annotation(s) cleared
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {warnings.length > 0
                  ? 'Your PDF is ready to download. Review the notes below before sharing it.'
                  : 'Your PDF is ready. Approved details were removed and the rest of the page was preserved.'}
              </p>

              <ul className="space-y-2" aria-label="Verification checks">
                {EXPORT_CHECKS.map((check) => {
                  const status = checkStatus(check, result, warningCodes);
                  const { Icon, className } = STATUS_ICONS[status];

                  return (
                    <li
                      key={check.key}
                      className="flex items-start gap-3 rounded-lg border border-border bg-muted/25 px-3 py-2.5 text-sm text-foreground"
                    >
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} aria-hidden="true" />
                      <span>{check.label}</span>
                      {status !== 'pass' && (
                        <Badge variant="warning" className="ml-auto shrink-0">
                          Review
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>

              {result.verification?.fidelity && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Visual check compared{' '}
                  {result.verification.fidelity.comparedPixels.toLocaleString()} unchanged-area
                  pixels
                  {result.verification.fidelity.differingPixels > 0 &&
                    ` · ${result.verification.fidelity.differingPixels} differed`}
                  .
                </p>
              )}

              <div className="surface-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
                <p className="flex items-center gap-3 text-sm text-muted-foreground">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                  Download link is private to this session and expires automatically.
                </p>
                <Button onClick={handleDownload} disabled={downloading}>
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden="true" />
                  )}
                  {downloading ? 'Preparing…' : 'Download sanitized PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="surface-panel mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Done with this resume?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Closing the session deletes the uploaded file and the generated PDF.
              </p>
            </div>
            <Button variant="outline" onClick={handleStartNew}>
              Start a new resume
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
