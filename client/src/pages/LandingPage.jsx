import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Fingerprint,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
} from 'lucide-react';

import { MarketingHeader } from '../components/layout/MarketingHeader.jsx';
import { MarketingFooter } from '../components/layout/MarketingFooter.jsx';
import { BrandMark } from '../components/ui/BrandMark.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { SectionHeading } from '../components/ui/SectionHeading.jsx';
import { ScannerVisual } from '../components/visuals/ScannerVisual.jsx';

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Find personal information',
    text: 'Emails, phones, links, names, addresses, dates of birth and image regions — each with a confidence score.',
  },
  {
    icon: SlidersHorizontal,
    title: 'You stay in control',
    text: 'Deselect false positives, mask whole categories, or add your own sensitive text before exporting.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify, don’t trust',
    text: 'We re-extract the exported PDF, clean metadata and compare rendered pages against the original.',
  },
];

const HOW_IT_WORKS = [
  { icon: UploadCloud, title: 'Upload', text: 'PDF or DOCX. Validated and processed in a temporary session.' },
  { icon: ScanLine, title: 'Detect', text: 'Text rules, local OCR for scans, and image-region analysis.' },
  { icon: SlidersHorizontal, title: 'Review', text: 'Choose exactly what to mask. Nothing is exported until you say so.' },
  { icon: ShieldCheck, title: 'Export', text: 'Native redaction plus a verification report before download.' },
];

const PROMISES = [
  { icon: LockKeyhole, title: 'No external AI', text: 'Resume content never leaves the private session.' },
  { icon: Fingerprint, title: 'No permanent storage', text: 'Files expire with the session and are deleted.' },
  { icon: ShieldCheck, title: 'No fake redaction', text: 'Underlying text and image pixels are removed.' },
];

export default function LandingPage() {
  return (
    <div className="noise-overlay relative flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="relative z-10 flex-1 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-backdrop opacity-50" />

        <section className="hero-glow relative border-b border-border">
          <div className="container grid gap-14 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-28">
            <div className="relative space-y-8">
              <Badge
                variant="accent"
                className="w-fit gap-2 border-primary/30 bg-primary/10 text-primary"
              >
                <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-primary" />
                Private by design · local engine
              </Badge>

              <h1 className="text-[2.65rem] font-bold leading-[1.03] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Send the resume.
                <br />
                <span className="text-gradient">Keep the identity.</span>
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                ResumeShield finds personal information in your resume and permanently removes
                the parts you choose — so you can get honest technical feedback without exposing
                yourself.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button asChild size="lg">
                  <Link to="/dashboard">
                    Get Started <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>

              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> No account
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> No permanent storage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> No external AI APIs
                </li>
              </ul>

              <div className="grid max-w-xl grid-cols-3 gap-3 pt-2">
                <div className="surface-panel rounded-xl p-3">
                  <p className="text-lg font-semibold text-primary">0</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">external APIs</p>
                </div>
                <div className="surface-panel rounded-xl p-3">
                  <p className="text-lg font-semibold text-accent">100%</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">local redaction</p>
                </div>
                <div className="surface-panel rounded-xl p-3">
                  <p className="text-lg font-semibold text-success">TTL</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">sessions</p>
                </div>
              </div>
            </div>

            <ScannerVisual />
          </div>
        </section>

        <section id="features" className="container relative py-20">
          <SectionHeading
            eyebrow="Built for safe sharing"
            title="Three things that make the difference."
            description="Not a cosmetic blur. A privacy workflow with verification at every step."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, index) => (
              <Card key={title} className="group relative overflow-hidden p-1">
                <div
                  aria-hidden="true"
                  className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                />
                <CardHeader className="relative">
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground/60">
                      0{index + 1}
                    </span>
                  </div>
                  <CardTitle className="mt-4">{title}</CardTitle>
                </CardHeader>
                <CardContent className="relative text-sm leading-relaxed text-muted-foreground">
                  {text}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="relative border-y border-border bg-card/40 py-20 backdrop-blur-sm">
          <div className="container">
            <SectionHeading
              align="center"
              eyebrow="How it works"
              title="Four steps. One clean copy."
              description="You decide what disappears. The app proves what changed before you download."
            />

            <div className="relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div
                aria-hidden="true"
                className="absolute left-10 right-10 top-12 hidden h-px bg-gradient-to-r from-primary/50 via-accent/30 to-transparent lg:block"
              />
              {HOW_IT_WORKS.map(({ icon: Icon, title, text }, index) => (
                <Card key={title} className="relative z-10 overflow-hidden p-5">
                  <div
                    aria-hidden="true"
                    className="absolute right-3 top-1 text-6xl font-bold text-foreground/[0.025]"
                  >
                    0{index + 1}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Step {index + 1}
                  </span>
                  <span className="mt-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="relative py-20">
          <div className="container">
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card/60 p-8 text-center shadow-panel sm:p-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
              />

              <div className="relative">
                <BrandMark size="lg" className="mx-auto" />
                <SectionHeading
                  align="center"
                  className="mt-6"
                  eyebrow="Privacy guarantee"
                  title="Privacy isn’t a setting here"
                  description="Your file lives in a short-lived private session and is deleted when that session ends. We never log resume contents, never offer the original for download, and never send it to a third-party AI service."
                />

                <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
                  {PROMISES.map(({ icon: Icon, title, text }) => (
                    <div key={title} className="surface-panel rounded-xl p-4">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                  ))}
                </div>

                <p className="mx-auto mt-8 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                  Detection is automated and OCR can misread text. You review every decision, and
                  the app tells you clearly whenever complete redaction or exact formatting
                  preservation cannot be guaranteed.
                </p>

                <div className="mt-6 flex justify-center">
                  <Button asChild size="lg">
                    <Link to="/dashboard">
                      Protect my resume <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
