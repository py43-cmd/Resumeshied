import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3 font-semibold tracking-tight text-foreground"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          ResumeShield
        </Link>

        <nav
          className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
          aria-label="Main navigation"
        >
          <a className="transition-colors hover:text-primary" href="#features">Features</a>
          <a className="transition-colors hover:text-primary" href="#how-it-works">How it works</a>
          <a className="transition-colors hover:text-primary" href="#privacy">Privacy</a>
        </nav>

        <Button asChild size="sm">
          <Link to="/dashboard">Get Started</Link>
        </Button>
      </div>
    </header>
  );
}
