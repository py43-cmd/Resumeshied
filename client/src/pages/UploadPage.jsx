import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Eye,
  FileCheck2,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Timer,
} from 'lucide-react';

import { Stepper } from '../components/shared/Stepper.jsx';
import { PrivacyNote } from '../components/shared/PrivacyNote.jsx';
import { Dropzone } from '../components/upload/Dropzone.jsx';
import { FileValidationCard } from '../components/upload/FileValidationCard.jsx';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import {
  createSession,
  destroySession,
  extractDocument,
  uploadResume,
} from '../lib/sessionApi.js';
import { validateFile } from '../lib/fileValidation.js';
import { useSession } from '../context/SessionContext.jsx';

const FEATURES = [
  {
    icon: Fingerprint,
    title: 'Automatic detection',
    description: 'Finds names, emails, phone numbers, profiles, dates and locations in your document.',
  },
  {
    icon: Eye,
    title: 'Review before export',
    description: 'You decide which matches are redacted. Nothing is removed without your review.',
  },
  {
    icon: FileCheck2,
    title: 'Verified PDF redaction',
    description: 'Approved areas are removed from the file and checked before the download is saved.',
  },
  {
    icon: Timer,
    title: 'Temporary sessions',
    description: 'Files and extracted text are deleted automatically when your session expires.',
  },
];

const DROPZONE_STATUS = {
  idle: 'idle',
  validating: 'selected',
  uploading: 'uploading',
  extracting: 'extracting',
  done: 'success',
  error: 'error',
};

export default function UploadPage() {
  const navigate = useNavigate();
  const { sessionId, documentId, updateSession, clearSession } = useSession();

  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [extraction, setExtraction] = useState(null);
  const [error, setError] = useState(null);

  const busy = ['validating', 'uploading', 'extracting'].includes(phase);
  const dropzoneStatus = error ? 'error' : DROPZONE_STATUS[phase] ?? 'idle';

  async function handleFile(selected) {
    setFile(selected);
    setError(null);
    setExtraction(null);
    setProgress(0);
    setPhase('validating');

    // Validate first: a rejected file must never destroy an active session.
    const check = await validateFile(selected);
    if (!check.ok) {
      setError(check.message);
      setPhase('error');
      toast.error(check.message);
      return;
    }

    // A valid replacement destroys the previous temporary session before a new one is created.
    let activeSessionId = sessionId;
    if (activeSessionId) {
      try {
        await destroySession(activeSessionId);
      } catch {
        // The TTL sweeper will clean it up if the network call fails.
      }
      clearSession();
      activeSessionId = null;
    }

    try {
      const created = await createSession();
      activeSessionId = created.sessionId;
      updateSession({
        sessionId: created.sessionId,
        token: created.token,
        expiresAt: created.expiresAt,
        documentId: null,
      });

      setPhase('uploading');
      const uploaded = await uploadResume(created.sessionId, selected, setProgress);

      setPhase('extracting');
      const result = await extractDocument(created.sessionId, uploaded.documentId);

      setExtraction(result.extraction);
      updateSession({ documentId: uploaded.documentId });
      setPhase('done');
      toast.success('Resume processed. Review what we found.');
    } catch (uploadError) {
      if (activeSessionId) {
        try {
          await destroySession(activeSessionId);
        } catch {
          // The TTL sweeper will clean it up if the network call fails.
        }
      }
      clearSession();
      setError(uploadError.message ?? 'Upload failed. Try again.');
      setPhase('error');
      toast.error(uploadError.message ?? 'Upload failed.');
    }
  }

  async function handleRemove() {
    if (sessionId) {
      try {
        await destroySession(sessionId);
      } catch {
        // The TTL sweeper will clean it up if the network call fails.
      }
    }
    clearSession();
    setFile(null);
    setExtraction(null);
    setError(null);
    setProgress(0);
    setPhase('idle');
    toast.info('Temporary session closed. You can upload a new file.');
  }

  return (
    <div>
      <Stepper current={1} />

      <section className="hero-glow relative mt-2 max-w-3xl">
        <Badge variant="accent" className="w-fit gap-2 px-3 py-1">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Step 1 of 4 · Private workspace
        </Badge>

        <h1 className="mt-5 text-[2rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.75rem]">
          Share your resume, <span className="text-gradient">not your identity.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Upload a PDF or DOCX. ResumeShield finds personal details, lets you review every match,
          and exports a clean copy — inside a temporary session that expires automatically.
        </p>
      </section>

      <section aria-labelledby="upload-heading" className="mt-10 space-y-5 sm:mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              01 / Upload
            </p>
            <h2 id="upload-heading" className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
              Upload your resume
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">PDF or DOCX · up to 10 MB</p>
        </div>

        <Dropzone onFile={handleFile} disabled={busy} status={dropzoneStatus} />

        {file && (
          <FileValidationCard
            file={file}
            phase={phase}
            progress={progress}
            extraction={extraction}
            error={error}
            onRemove={handleRemove}
            onContinue={() => navigate(`/detect/${documentId}`)}
          />
        )}

        {file && extraction?.status === 'needs_ocr' && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
            <AlertTitle>Scanned document detected</AlertTitle>
            <AlertDescription>
              This PDF has no readable text layer. Continue to the review screen to
              run local OCR; we will not claim the resume was sanitized until that
              verification runs.
            </AlertDescription>
          </Alert>
        )}

        {file && extraction?.status === 'unsupported' && (
          <Alert variant="destructive">
            <LockKeyhole className="h-4 w-4 text-destructive" aria-hidden="true" />
            <AlertTitle>Password-protected PDF</AlertTitle>
            <AlertDescription>
              We cannot read or redact encrypted files. Export an unprotected copy
              and upload that instead.
            </AlertDescription>
          </Alert>
        )}

        {file && extraction?.status === 'failed' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
            <AlertTitle>Could not read this document</AlertTitle>
            <AlertDescription>
              The file may contain no text or use an unsupported format. Re-export it
              as a clean PDF or DOCX and try again.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
            <AlertTitle>Upload did not complete</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleRemove}>
                Remove and try again
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </section>

      <section aria-labelledby="privacy-heading" className="mt-12 space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            02 / Privacy
          </p>
          <h2 id="privacy-heading" className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
            Private from upload to export
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="surface-panel rounded-xl p-4 transition-colors hover:border-primary/30 sm:p-5"
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-accent">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <PrivacyNote />
      </section>
    </div>
  );
}
