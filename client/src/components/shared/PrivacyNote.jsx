import { LockKeyhole } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/Alert.jsx';

export function PrivacyNote({ children }) {
  return (
    <Alert variant="info">
      <LockKeyhole className="h-4 w-4 text-primary" aria-hidden="true" />
      <AlertDescription>
        {children ?? (
          <>
            Processed in a temporary private session. Files are deleted automatically,
            no account is required, and resume content is never sent to external AI APIs.
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
