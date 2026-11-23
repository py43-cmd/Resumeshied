import { useState } from 'react';
import { FileText, UploadCloud } from 'lucide-react';
import { Stepper } from '../components/shared/Stepper.jsx';
import { PrivacyNote } from '../components/shared/PrivacyNote.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { cn } from '../lib/utils.js';

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);

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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Choose a file</CardTitle>
            <CardDescription>PDF or DOCX · maximum 10 MB · up to 20 pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              onDragEnter={() => setIsDragging(true)}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
              )}
            >
              <UploadCloud className="mb-4 h-10 w-10 text-primary" aria-hidden="true" />
              <p className="font-medium">Drop your resume here</p>
              <p className="mt-1 text-sm text-muted-foreground">or browse files (Phase 4)</p>
              <Badge variant="muted" className="mt-4">Upload handling arrives in Phase 4</Badge>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-4 text-sm">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <div className="text-muted-foreground">
                <p className="font-medium text-foreground">Validation happens twice</p>
                <p>
                  First in your browser for fast feedback, then again on the server with
                  extension, MIME type, magic bytes and size checks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <PrivacyNote />
        </div>
      </div>
    </div>
  );
}
