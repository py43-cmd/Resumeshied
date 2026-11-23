import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/Alert.jsx';

export function AccuracyDisclaimer() {
  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
      <AlertDescription>
        Detection is automated and can make mistakes. Review every item — especially
        low-confidence, heuristic and OCR-derived results — before exporting.
      </AlertDescription>
    </Alert>
  );
}
