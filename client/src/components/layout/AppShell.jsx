import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';

import { useSession } from '../../context/SessionContext.jsx';
import { BrandMark } from '../ui/BrandMark.jsx';
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
    <div className="noise-overlay relative flex min-h-screen flex-col">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 grid-backdrop opacity-40" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent"
      />

      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container relative flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 font-semibold tracking-tight">
              <BrandMark size="sm" />
              <span className="hidden sm:inline">ResumeShield</span>
            </Link>
            <nav
              className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex"
              aria-label="App navigation"
            >
              <Link to="/dashboard" className="transition-colors hover:text-primary">Dashboard</Link>
              <Link to="/upload" className="transition-colors hover:text-primary">Upload</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isActive ? (
              <Badge variant="accent" className="gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_10px_hsl(var(--success))]" />
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                <span className="hidden sm:inline">Session active{expiry ? ` · until ${expiry}` : ''}</span>
                <span className="sm:hidden">Active</span>
              </Badge>
            ) : (
              <Badge variant="muted">No session</Badge>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/upload">New Upload</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container relative z-10 flex-1 py-10">{children}</main>

      <footer className="relative z-10 border-t border-border py-5 text-center text-xs text-muted-foreground">
        Temporary processing only · Files are deleted when your session expires
      </footer>
    </div>
  );
}
