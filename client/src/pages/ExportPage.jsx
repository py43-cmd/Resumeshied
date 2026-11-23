import { useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Stepper } from '../components/shared/Stepper.jsx';
import { PrivacyNote } from '../components/shared/PrivacyNote.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx';

const CHECKS = [
  'Page count and page dimensions identical',
  'Selected values absent from extracted text',
  'Metadata and annotations cleaned',
  'Image regions removed where selected',
  'Rendered pages differ only inside approved boxes',
];

export default function ExportPage() {
  const { redactionId } = useParams();

  return (
    <div>
      <Stepper current={4} />

      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Your sanitized resume</h1>
          <Badge variant="muted">Phase 3 shell</Badge>
        </div>
        <p className="text-muted-foreground">Redaction: <code className="text-xs">{redactionId}</code></p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sanitized preview</CardTitle>
            <CardDescription>Rendered PDF preview arrives in Phase 8</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-border bg-muted/30">
              <ShieldCheck className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy verification</CardTitle>
            <CardDescription>Nothing is reported as passed until the check actually runs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {CHECKS.map((check) => (
              <div key={check} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{check}</span>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <PrivacyNote />
      </div>
    </div>
  );
}
