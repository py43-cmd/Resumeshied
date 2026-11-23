import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          ResumeShield
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Main navigation">
          <a className="hover:text-foreground" href="#features">Features</a>
          <a className="hover:text-foreground" href="#how-it-works">How it works</a>
          <a className="hover:text-foreground" href="#privacy">Privacy</a>
        </nav>

        <Button asChild size="sm">
          <Link to="/dashboard">Get Started</Link>
        </Button>
      </div>
    </header>
  );
}
