import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-medium text-foreground">ResumeShield</span>
          <span>· Privacy first</span>
        </div>
        <div className="flex gap-6">
          <a href="#privacy" className="hover:text-foreground">Privacy</a>
          <a href="#how-it-works" className="hover:text-foreground">How it works</a>
          <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        </div>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
