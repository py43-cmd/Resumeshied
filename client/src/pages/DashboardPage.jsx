import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  FileUp,
  ListChecks,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { apiRequest } from '../lib/api.js';
import { getSession } from '../lib/sessionApi.js';
import { useSession } from '../context/SessionContext.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { MetricCard } from '../components/ui/MetricCard.jsx';
import { PrivacyNote } from '../components/shared/PrivacyNote.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

const WORKFLOW = [
  { icon: FileUp, title: 'Upload', text: 'Private session' },
  { icon: ScanLine, title: 'Detect', text: 'Local analysis' },
  { icon: ListChecks, title: 'Review', text: 'Hide or keep' },
  { icon: ShieldCheck, title: 'Export', text: 'Verified PDF' },
];

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
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6 shadow-panel sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        />
        <div aria-hidden="true" className="gradient-hairline absolute inset-x-0 top-0" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-4">
            <Badge variant="accent" className="w-fit gap-2 border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Secure workspace
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Your private resume workspace
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Protect your resume before sharing it for feedback. Every file is processed in a
                temporary private session and never stored permanently.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              <Link to="/upload">
                New Upload <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Session"
          value={isActive ? 'Active' : 'None'}
          icon={Clock3}
          tone={isActive ? 'success' : 'muted'}
          hint={isActive ? 'Temporary and expiring' : 'Start with a new upload'}
        />
        <MetricCard
          label="Document"
          value={activeFile ? 'Ready' : 'Not uploaded'}
          icon={FileUp}
          tone={activeFile ? 'primary' : 'muted'}
          hint={activeFile?.originalName ?? 'Waiting for a file'}
        />
        <MetricCard
          label="Verification"
          value={sessionInfo ? 'Local' : 'Pending'}
          icon={ShieldCheck}
          tone={sessionInfo ? 'accent' : 'muted'}
          hint="Privacy checks before download"
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Your workflow</CardTitle>
          <CardDescription>Four controlled steps from upload to a verified copy.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map(({ icon: Icon, title, text }, index) => (
              <li
                key={title}
                className="group relative overflow-hidden rounded-xl border border-border bg-muted/25 p-4"
              >
                <div
                  aria-hidden="true"
                  className="scan-sheen absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground/60">0{index + 1}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25">
              <FileUp className="h-5 w-5" aria-hidden="true" />
            </span>
            <CardTitle>Upload a resume</CardTitle>
            <CardDescription>PDF or DOCX · up to 10 MB · text-based or scanned</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 p-8 text-center text-sm text-muted-foreground">
              Drag-and-drop upload is implemented in Phase 4. The upload flow starts on the Upload page.
            </div>
            <Button asChild variant="outline">
              <Link to="/upload">
                Choose a file <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/25">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <CardTitle>Privacy tools</CardTitle>
            <CardDescription>What happens to your file</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3 rounded-lg bg-muted/30 p-2.5">
                <ListChecks className="h-4 w-4 shrink-0 text-primary" />
                Detection types and confidence
              </li>
              <li className="flex gap-3 rounded-lg bg-muted/30 p-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                Native redaction, not black boxes
              </li>
              <li className="flex gap-3 rounded-lg bg-muted/30 p-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                Verification before download
              </li>
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  {activeFile?.originalName ?? 'Active session'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
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
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No active session. Your files are never stored between visits.
            </div>
          )}
        </CardContent>
      </Card>

      <PrivacyNote />
    </div>
  );
}
