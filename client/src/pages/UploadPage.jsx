import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, LockKeyhole } from 'lucide-react';

import { Stepper } from '../components/shared/Stepper.jsx';
import { PrivacyNote } from '../components/shared/PrivacyNote.jsx';
import { Dropzone } from '../components/upload/Dropzone.jsx';
import { FileValidationCard } from '../components/upload/FileValidationCard.jsx';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert.jsx';
import {
  createSession,
  destroySession,
  extractDocument,
  uploadResume,
} from '../lib/sessionApi.js';
import { validateFile } from '../lib/fileValidation.js';
import { useSession } from '../context/SessionContext.jsx';

export default function UploadPage() {
  const navigate = useNavigate();
  const { sessionId, documentId, updateSession, clearSession } = useSession();

  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [extraction, setExtraction] = useState(null);
  const [error, setError] = useState(null);

  const busy = ['validating', 'uploading', 'extracting'].includes(phase);

  async function handleFile(selected) {
    // Replacing a file destroys the previous temporary session first.
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

    setFile(selected);
    setError(null);
    setExtraction(null);
    setProgress(0);
    setPhase('validating');

    const check = await validateFile(selected);
    if (!check.ok) {
      setError(check.message);
      setPhase('error');
      toast.error(check.message);
      return;
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
    toast.info('Temporary session destroyed.');
  }

  return (
    <div>
      <Stepper current={1} />

      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Upload your resume</h1>
        <p className="text-muted-foreground">
          We create a temporary, private processing session for each upload.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Dropzone onFile={handleFile} disabled={busy} />

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
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <PrivacyNote />
      </div>
    </div>
  );
}
