import { Link } from 'react-router-dom';
import { ArrowRight, FileSearch, ScanLine, ShieldCheck } from 'lucide-react';

import { Button } from '../ui/Button.jsx';
import { BrandMark } from '../ui/BrandMark.jsx';
import { navPillClass } from './navStyles.js';

const NAV_ITEMS = [
  { href: '#features', label: 'Features', icon: FileSearch },
  { href: '#how-it-works', label: 'How it works', icon: ScanLine },
  { href: '#privacy', label: 'Privacy', icon: ShieldCheck },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
        />

        <div className="container relative flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className="group flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-foreground sm:text-base"
          >
            <BrandMark size="sm" className="transition-transform group-hover:scale-105" />
            ResumeShield
          </Link>

          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-surface/60 p-1 md:flex"
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} className={navPillClass()}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Privacy first
            </span>
            <Button asChild size="sm">
              <Link to="/dashboard">
                Open app <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <nav
          className="border-t border-border/70 bg-background/70 md:hidden"
          aria-label="Mobile main navigation"
        >
          <div className="container flex gap-1 overflow-x-auto py-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} className={navPillClass()}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
