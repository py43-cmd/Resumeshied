import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background/60 backdrop-blur-sm">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <span className="font-semibold text-foreground">ResumeShield</span>
          <span>· Privacy first</span>
        </div>
        <div className="flex gap-6">
          <a href="#privacy" className="transition-colors hover:text-primary">Privacy</a>
          <a href="#how-it-works" className="transition-colors hover:text-primary">How it works</a>
          <Link to="/dashboard" className="transition-colors hover:text-primary">Dashboard</Link>
        </div>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
