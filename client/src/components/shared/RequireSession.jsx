import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import { useSession } from '../../context/SessionContext.jsx';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert.jsx';
import { Button } from '../ui/Button.jsx';

export function RequireSession({ children }) {
  const { isActive } = useSession();

  if (!isActive) {
    return (
      <Alert variant="warning">
        <Clock3 className="h-4 w-4 text-warning" aria-hidden="true" />
        <AlertTitle>No active session</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Your temporary session is missing or expired. Expired files are deleted,
            so there is nothing to continue here.
          </p>
          <Button asChild size="sm">
            <Link to="/upload">Start a new session</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return children;
}
