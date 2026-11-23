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
  { icon: UploadCloud, title: 'Upload', text: 'PDF or DOCX in a temporary private session.' },
  { icon: ScanLine, title: 'Detect', text: 'Text rules, local OCR and image-region analysis.' },
  { icon: SlidersHorizontal, title: 'Review', text: 'Choose exactly what to hide before export.' },
  { icon: ShieldCheck, title: 'Export', text: 'Native redaction plus verification before download.' },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="relative flex-1">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-backdrop opacity-30" />

        <section className="hero-glow relative border-b border-border">
          <div className="container grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-24">
            <div className="relative space-y-7">
              <Badge variant="accent" className="w-fit gap-2 border-primary/30 bg-primary/10 text-primary">
                Private by design
              </Badge>

              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Share your resume.
                <br />
                <span className="text-gradient">Not your identity.</span>
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                ResumeShield finds personal information in your resume and permanently removes
                the parts you choose — so you can get honest feedback without exposing yourself.
              </p>

              <div className="flex flex-wrap gap-3">
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

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title}>
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

        <section id="how-it-works" className="relative border-y border-border bg-card/40 py-20">
          <div className="container">
            <SectionHeading
              align="center"
              eyebrow="How it works"
              title="Four steps. One clean copy."
              description="You decide what disappears. The app proves what changed before you download."
            />

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map(({ icon: Icon, title, text }, index) => (
                <Card key={title} className="p-5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Step {index + 1}
                  </span>
                  <span className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
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
            <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/60 p-8 text-center sm:p-10">
              <BrandMark size="lg" className="mx-auto" />
              <SectionHeading
                align="center"
                className="mt-5"
                eyebrow="Privacy guarantee"
                title="Privacy isn’t a setting here"
                description="Your file lives in a short-lived private session and is deleted when that session ends. We never log resume contents, never offer the original for download, and never send it to a third-party AI service."
              />
              <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Detection is automated and OCR can misread text. You review every decision, and the
                app tells you clearly whenever complete redaction or exact formatting preservation
                cannot be guaranteed.
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
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
