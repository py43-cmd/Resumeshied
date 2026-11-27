import { Link } from 'react-router-dom';

import { BrandMark } from '../ui/BrandMark.jsx';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background/60 backdrop-blur-sm">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <BrandMark size="sm" className="h-7 w-7 rounded-lg" />
          <span className="font-semibold text-foreground">ResumeShield</span>
          <span>· Privacy first</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a href="#demo" className="transition-colors hover:text-primary">Example</a>
          <a href="#privacy" className="transition-colors hover:text-primary">Privacy</a>
          <a href="#how-it-works" className="transition-colors hover:text-primary">How it works</a>
          <Link to="/dashboard" className="transition-colors hover:text-primary">Dashboard</Link>
        </div>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
