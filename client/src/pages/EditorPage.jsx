import { useParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { Stepper } from '../components/shared/Stepper.jsx';
import { AccuracyDisclaimer } from '../components/shared/AccuracyDisclaimer.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx';

export default function EditorPage() {
  const { documentId } = useParams();

  return (
    <div>
      <Stepper current={3} />

      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Choose what to hide</h1>
          <Badge variant="muted">Phase 3 shell</Badge>
        </div>
        <p className="text-muted-foreground">Document: <code className="text-xs">{documentId}</code></p>
      </div>

      <AccuracyDisclaimer />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
            <CardDescription>Original / Sanitized tabs arrive in Phase 6</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-border bg-muted/30">
              <SlidersHorizontal className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Masking controls</CardTitle>
            <CardDescription>Categories, individual items, manual redactions</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Implemented in Phase 6. Decisions will be saved to the temporary session, not a database.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
