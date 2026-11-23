import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function Dropzone({ onFile, disabled = false }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/60 p-12 text-center shadow-card transition-colors hover:border-primary/40',
        isDragging && 'border-primary bg-primary/10',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <span
        className={cn(
          'mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25 transition-transform duration-300',
          !disabled && 'group-hover:scale-105',
          isDragging && 'scale-110 bg-primary/20',
        )}
      >
        <UploadCloud className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="text-lg font-semibold tracking-tight">Drop your resume here</p>
      <p className="mt-1 text-sm text-muted-foreground">or choose a file from your device</p>
      <button
        type="button"
        className="mt-3 rounded-lg px-2 py-1 text-sm font-semibold text-primary underline-offset-4 transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        browse files
      </button>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1">PDF or DOCX</span>
        <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1">Up to 10 MB</span>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
          Private session
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
