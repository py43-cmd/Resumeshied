import { LockKeyhole } from 'lucide-react';

export function PrivacyNote({ children }) {
  return (
    <section className="surface-panel rounded-2xl p-5 sm:p-6" aria-label="Privacy note">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
        Privacy by design
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {children ?? (
          <>
            Processed in a temporary private session. Files are deleted automatically,
            no account is required, and resume values are masked before they reach this interface.
          </>
        )}
      </p>
    </section>
  );
}
