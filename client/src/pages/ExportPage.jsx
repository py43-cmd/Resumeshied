import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  Download,
  FileCheck2,
  Loader2,
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
import { checkStatus, EXPORT_CHECKS } from '../lib/exportView.js';

const STATUS_ICONS = {
  pass: { Icon: Check, className: 'text-success' },
  warning: { Icon: AlertTriangle, className: 'text-warning' },
  fail: { Icon: XCircle, className: 'text-destructive' },
};

export default function ExportPage() {
  const { documentId } = useParams();
  const { sessionId } = useSession();

  const [phase, setPhase] = useState('processing');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const create = useCallback(async () => {
    setPhase('processing');
    setError(null);

    try {
      const data = await createRedaction(sessionId, documentId);
      setResult(data);
      setPhase('ready');
    } catch (createError) {
      setError(createError.message ?? 'Could not create the sanitized PDF.');
      setPhase('error');
    }
  }, [documentId, sessionId]);

  useEffect(() => {
    if (sessionId && documentId) void create();
  }, [create, documentId, sessionId]);

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
      URL.revokeObjectURL(url);
      toast.success('Sanitized resume downloaded.');
    } catch (downloadError) {
      toast.error(downloadError.message ?? 'Could not download the sanitized PDF.');
    } finally {
      setDownloading(false);
    }
  }

  const warningCodes = result?.warnings ?? [];
  const warnings = warningMessages(warningCodes);

  return (
    <div>
      <Stepper current={4} />

      <div className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your sanitized resume</h1>
          <Badge variant={phase === 'ready' ? 'success' : 'muted'}>
            {phase === 'ready' ? 'Ready to download' : 'Processing locally'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          The original file stays in memory only for this short-lived session.
        </p>
      </div>

      {phase === 'processing' && (
        <Card className="mt-6">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            Rewriting the PDF and verifying the result locally…
          </CardContent>
        </Card>
      )}

      {phase === 'error' && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
          <AlertTitle>Export could not continue</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button asChild size="sm" variant="outline">
              <Link to={`/editor/${documentId}`}>Return to the editor</Link>
            </Button>
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
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success ring-1 ring-success/25 shadow-glow">
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
        </>
      )}

      <div className="mt-6">
        <PrivacyNote />
      </div>
    </div>
  );
}
