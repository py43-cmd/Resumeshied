import { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  CheckCircle2,
  FileText,
  Loader2,
  LockKeyhole,
  UploadCloud,
} from 'lucide-react';

import { cn } from '../../lib/utils.js';

const STATUS_COPY = {
  idle: {
    title: 'Drop your resume here',
    hint: 'or browse files from your device',
    action: 'Browse files',
  },
  selected: {
    title: 'Resume selected',
    hint: 'Checking the file before we upload it',
    action: 'Choose another file',
  },
  uploading: {
    title: 'Uploading your resume',
    hint: 'Keep this tab open while we transfer the file',
    action: 'Choose another file',
  },
  extracting: {
    title: 'Reading your document',
    hint: 'Extracting text and page layout',
    action: 'Choose another file',
  },
  success: {
    title: 'Resume ready to review',
    hint: 'Upload a different file to replace it',
    action: 'Choose another file',
  },
  error: {
    title: 'We could not process that file',
    hint: 'Check the message below and try another file',
    action: 'Try another file',
  },
};

export function Dropzone({ onFile, disabled = false, status = 'idle' }) {
  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const current = STATUS_COPY[status] ?? STATUS_COPY.idle;
  const copy = isDragging
    ? { title: 'Drop to upload', hint: 'Release to start processing', action: current.action }
    : current;

  const spinning = !isDragging && ['selected', 'uploading', 'extracting'].includes(status);

  let Icon = FileText;
  if (isDragging) Icon = UploadCloud;
  else if (status === 'success') Icon = CheckCircle2;
  else if (status === 'error') Icon = AlertTriangle;
  else if (spinning) Icon = Loader2;

  const iconTone = isDragging
    ? 'border-primary/40 bg-primary/15 text-accent'
    : status === 'success'
      ? 'border-success/30 bg-success/10 text-success'
      : status === 'error'
        ? 'border-destructive/30 bg-destructive/10 text-destructive'
        : 'border-primary/20 bg-primary/10 text-accent';

  function handleDragEnter(event) {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div className="relative">
      <input
        id="resume-upload-input"
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="peer sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />

      <label
        htmlFor="resume-upload-input"
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'upload-zone group relative flex min-h-[288px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center shadow-[0_14px_40px_-26px_rgba(75,12,223,0.45)] sm:min-h-[320px]',
          'transition-[border-color,background-color,box-shadow] duration-200',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
          !isDragging && !['success', 'error'].includes(status) && 'border-border hover:border-primary/45',
          isDragging && 'border-primary bg-primary/10 shadow-glow',
          status === 'success' && !isDragging && 'border-success/40',
          status === 'error' && !isDragging && 'border-destructive/40',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <span
          className={cn(
            'relative flex h-[76px] w-[76px] items-center justify-center rounded-[20px] border',
            'transition-transform duration-200 group-hover:scale-[1.03]',
            isDragging && 'scale-105',
            iconTone,
          )}
        >
          <Icon className={cn('h-9 w-9', spinning && 'animate-spin')} aria-hidden="true" />
          <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-card">
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </span>

        <p aria-live="polite" className="mt-6 text-lg font-semibold tracking-tight sm:text-xl">
          {copy.title}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{copy.hint}</p>

        <span className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-cta px-5 text-sm font-semibold text-white shadow-[0_10px_26px_-12px_rgba(106,54,251,0.8)] transition-[filter] duration-200 group-hover:brightness-110">
          {copy.action}
        </span>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-muted-foreground sm:text-xs">
          <span className="rounded-full border border-border bg-background/40 px-3 py-1">
            PDF or DOCX
          </span>
          <span className="rounded-full border border-border bg-background/40 px-3 py-1">
            Up to 10 MB
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-accent">
            <LockKeyhole className="h-3 w-3" aria-hidden="true" />
            Private session
          </span>
        </div>
      </label>
    </div>
  );
}
