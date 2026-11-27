import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
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
import { BeforeAfterDemo } from '../components/visuals/BeforeAfterDemo.jsx';
import { ScannerVisual } from '../components/visuals/ScannerVisual.jsx';

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Find personal information',
    text: 'Emails, phones, profile links, names, addresses, dates of birth and image regions — each with a confidence score.',
  },
  {
    icon: SlidersHorizontal,
    title: 'You decide what disappears',
    text: 'High-confidence matches are preselected. Confirm anything flagged for review, keep false positives, or mark your own areas.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify before you download',
    text: 'Approved areas are removed with native PDF redaction, then the saved file is checked before it is offered for download.',
  },
];

const HOW_IT_WORKS = [
  { icon: UploadCloud, title: 'Upload', text: 'Add a PDF or DOCX in a temporary private session.' },
  { icon: ScanLine, title: 'Detect', text: 'Review masked matches and their page positions.' },
  { icon: SlidersHorizontal, title: 'Redact', text: 'Choose Hide or Keep for every detected item.' },
  { icon: ShieldCheck, title: 'Download', text: 'Export a redacted copy with the layout preserved.' },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="relative flex-1">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-backdrop opacity-30" />

        <section className="hero-glow relative border-b border-border">
          <div className="container grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div className="relative min-w-0 space-y-7">
              <Badge variant="accent" className="w-fit gap-2 border-primary/30 bg-primary/10 text-primary">
                Private by design
              </Badge>

              <h1 className="text-display font-semibold">
                Share your resume.
                <br />
                <span className="text-gradient">Not your identity.</span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                ResumeShield finds personal details in your resume, lets you decide what to hide,
                and exports a clean copy with the original layout intact.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/upload">
                    Start redacting <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#demo">See before / after</a>
                </Button>
              </div>

              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> No account needed
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> Temporary sessions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> No external AI APIs
                </li>
              </ul>
            </div>

            <div className="min-w-0">
              <ScannerVisual />
            </div>
          </div>
        </section>

        <BeforeAfterDemo />

        <section id="features" className="container section-pad">
          <SectionHeading
            eyebrow="Built for safe sharing"
            title="Privacy work that stays understandable."
            description="A focused workflow, not a cosmetic blur. You can see every decision before the file is rewritten."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title} interactive>
                <CardHeader>
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {text}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="section-pad border-y border-border bg-card/40">
          <div className="container">
            <SectionHeading
              align="center"
              eyebrow="How it works"
              title="Four steps. One clean copy."
              description="You stay in control of what is hidden, and the app tells you when a match cannot be placed reliably."
            />

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map(({ icon: Icon, title, text }, index) => (
                <Card key={title} className="p-5">
                  <span className="text-eyebrow font-semibold uppercase text-primary">
                    Step {index + 1}
                  </span>
                  <span className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="section-pad">
          <div className="container">
            <Card className="mx-auto max-w-3xl p-7 text-center sm:p-10">
              <BrandMark size="lg" className="mx-auto" />
              <SectionHeading
                align="center"
                className="mt-5"
                eyebrow="Privacy by design"
                title="Your resume is not a public document."
                description="Files are processed in a short-lived session and deleted when that session ends. Resume contents are not logged, and no third-party AI API receives your file."
              />
              <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Detection is automated and OCR can misread text. You review every match, and the
                app says clearly when complete redaction or exact formatting cannot be guaranteed.
              </p>
              <div className="mt-6 flex justify-center">
                <Button asChild size="lg">
                  <Link to="/upload">
                    Protect my resume <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
