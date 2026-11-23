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
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <UploadCloud className="mb-4 h-10 w-10 text-primary" aria-hidden="true" />
      <p className="font-medium">Drop your resume here</p>
      <p className="mt-1 text-sm text-muted-foreground">or</p>
      <button
        type="button"
        className="mt-2 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        browse files
      </button>
      <p className="mt-4 text-xs text-muted-foreground">PDF or DOCX · up to 10 MB</p>
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
