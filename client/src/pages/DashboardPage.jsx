import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUp, ListChecks, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { getSession } from '../lib/sessionApi.js';
import { useSession } from '../context/SessionContext.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { PrivacyNote } from '../components/shared/PrivacyNote.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export default function DashboardPage() {
  const { isActive, sessionId, documentId } = useSession();
  const [apiState, setApiState] = useState('checking');
  const [sessionInfo, setSessionInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiRequest({ method: 'get', url: '/health' })
      .then(() => {
        if (!cancelled) setApiState('online');
      })
      .catch(() => {
        if (!cancelled) setApiState('offline');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isActive || !sessionId) {
      setSessionInfo(null);
      return undefined;
    }

    let cancelled = false;
    getSession(sessionId)
      .then((data) => {
        if (!cancelled) setSessionInfo(data);
      })
      .catch(() => {
        if (!cancelled) setSessionInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isActive, sessionId]);

  const activeFile = sessionInfo?.files?.[0];
  const continueId = documentId ?? activeFile?.documentId;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Protect your resume before sharing it for feedback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apiState === 'checking' && <Skeleton className="h-6 w-28" />}
          {apiState === 'online' && (
            <Badge variant="success" className="gap-1">
              <Wifi className="h-3 w-3" aria-hidden="true" /> API connected
            </Badge>
          )}
          {apiState === 'offline' && (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="h-3 w-3" aria-hidden="true" /> API offline
            </Badge>
          )}
          <Button asChild>
            <Link to="/upload">New Upload</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <FileUp className="mb-2 h-6 w-6 text-primary" aria-hidden="true" />
            <CardTitle>Upload a resume</CardTitle>
            <CardDescription>PDF or DOCX · up to 10 MB · text-based or scanned</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              Drag-and-drop upload is implemented in Phase 4. The upload flow starts on the Upload page.
            </div>
            <Button asChild>
              <Link to="/upload">Choose a file</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="mb-2 h-6 w-6 text-accent" aria-hidden="true" />
            <CardTitle>Privacy tools</CardTitle>
            <CardDescription>What happens to your file</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2"><ListChecks className="h-4 w-4 shrink-0 text-primary" /> Detection types and confidence</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> Native redaction, not black boxes</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> Verification before download</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Only for sessions in this browser tab</CardDescription>
        </CardHeader>
        <CardContent>
          {isActive ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4 text-sm">
              <div>
                <p className="font-medium">{activeFile?.originalName ?? 'Active session'}</p>
                <p className="text-xs text-muted-foreground">
                  {activeFile
                    ? `${activeFile.extractionStatus} · temporary file`
                    : 'No file uploaded yet'}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to={continueId ? `/detect/${continueId}` : '/upload'}>
                  {continueId ? 'Continue' : 'Upload a file'}
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active session. Your files are never stored between visits.
            </p>
          )}
        </CardContent>
      </Card>

      <PrivacyNote />
    </div>
  );
}
