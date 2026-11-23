import { Link, NavLink } from 'react-router-dom';
import { Clock3, LayoutDashboard, UploadCloud } from 'lucide-react';

import { useSession } from '../../context/SessionContext.jsx';
import { BrandMark } from '../ui/BrandMark.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { navPillClass } from './navStyles.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload', icon: UploadCloud },
];

function formatExpiry(expiresAt) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString();
}

export function AppShell({ children }) {
  const { isActive, expiresAt } = useSession();
  const expiry = formatExpiry(expiresAt);

  return (
    <div className="relative flex min-h-screen flex-col">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 grid-backdrop opacity-25" />

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
          />

          <div className="container relative flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/" className="group flex items-center gap-2.5">
                <BrandMark size="sm" className="transition-transform group-hover:scale-105" />
                <span className="text-[15px] font-semibold tracking-tight sm:text-base">
                  ResumeShield
                </span>
              </Link>
              <span className="hidden h-5 w-px bg-border lg:block" />
              <span className="hidden text-xs text-muted-foreground lg:block">
                Private workspace
              </span>
            </div>

            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-surface/60 p-1 md:flex"
              aria-label="App navigation"
            >
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive: current }) => navPillClass(current)}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {isActive ? (
                <Badge variant="accent" className="gap-2">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden lg:inline">
                    Session active{expiry ? ` · until ${expiry}` : ''}
                  </span>
                  <span className="lg:hidden">Active</span>
                </Badge>
              ) : (
                <Badge variant="muted">No session</Badge>
              )}
              <Button asChild size="sm">
                <Link to="/upload">
                  <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">New Upload</span>
                  <span className="sm:hidden">Upload</span>
                </Link>
              </Button>
            </div>
          </div>

          <nav
            className="border-t border-border/70 bg-background/70 md:hidden"
            aria-label="Mobile app navigation"
          >
            <div className="container flex gap-1 overflow-x-auto py-2">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive: current }) => navPillClass(current)}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="container relative z-10 flex-1 py-10">{children}</main>

      <footer className="relative z-10 border-t border-border py-5 text-center text-xs text-muted-foreground">
        Temporary processing only · Files are deleted when your session expires
      </footer>
    </div>
  );
}
