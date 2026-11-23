import { Link } from 'react-router-dom';
import { Clock3, ShieldCheck } from 'lucide-react';
import { useSession } from '../../context/SessionContext.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';

function formatExpiry(expiresAt) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString();
}

export function AppShell({ children }) {
  const { isActive, expiresAt } = useSession();
  const expiry = formatExpiry(expiresAt);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              ResumeShield
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex" aria-label="App navigation">
              <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
              <Link to="/upload" className="hover:text-foreground">Upload</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isActive ? (
              <Badge variant="accent" className="gap-1">
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                Session active{expiry ? ` · until ${expiry}` : ''}
              </Badge>
            ) : (
              <Badge variant="muted">No active session</Badge>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/upload">New Upload</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-8">{children}</main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Temporary processing only · Files are deleted when your session expires
      </footer>
    </div>
  );
}
