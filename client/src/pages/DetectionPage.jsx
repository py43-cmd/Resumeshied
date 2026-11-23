import { useParams } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import { Stepper } from '../components/shared/Stepper.jsx';
import { AccuracyDisclaimer } from '../components/shared/AccuracyDisclaimer.jsx';
import { PrivacyNote } from '../components/shared/PrivacyNote.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx';

export default function DetectionPage() {
  const { documentId } = useParams();

  return (
    <div>
      <Stepper current={2} />

      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Personal information found</h1>
          <Badge variant="muted">Phase 3 shell</Badge>
        </div>
        <p className="text-muted-foreground">Document: <code className="text-xs">{documentId}</code></p>
      </div>

      <AccuracyDisclaimer />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Document preview</CardTitle>
            <CardDescription>Page images and highlights are implemented in Phase 6</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-border bg-muted/30">
              <FileSearch className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detections</CardTitle>
            <CardDescription>Type, confidence, page and detection method</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The detection engine and this list are implemented in Phase 5.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <PrivacyNote />
      </div>
    </div>
  );
}
