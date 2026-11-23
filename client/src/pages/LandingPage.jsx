import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileSearch,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { MarketingHeader } from '../components/layout/MarketingHeader.jsx';
import { MarketingFooter } from '../components/layout/MarketingFooter.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';

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

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="relative flex-1 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-backdrop opacity-50" />

        <section className="hero-glow relative border-b border-border">
          <div className="container grid gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
            <div className="relative space-y-7">
              <Badge variant="accent" className="w-fit gap-2 border-primary/30 bg-primary/10 text-primary">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Private by design
              </Badge>

              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Share your resume.
                <br />
                <span className="text-gradient">Not your identity.</span>
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                ResumeShield finds personal information in your resume and permanently
                removes the parts you choose — so you can get honest technical feedback
                without exposing yourself.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg">
                  <Link to="/dashboard">
                    Get Started <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>

              <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> No account</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> No permanent storage</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> No external AI APIs</li>
              </ul>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-8 rounded-[3rem] bg-primary/10 blur-3xl animate-float-soft"
              />
              <Card className="relative overflow-hidden shadow-panel">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                />
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Only the sensitive parts change</CardTitle>
                    <Badge variant="success">Layout preserved</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Before
                      </p>
                      <p className="font-medium">Rahul Sharma</p>
                      <p>rahul@gmail.com</p>
                      <p>+91 9876543210</p>
                      <p className="mt-3">E-commerce app using MERN stack</p>
                      <p>Skills: C++, React, Node.js</p>
                    </div>

                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed shadow-glow">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
                        After
                      </p>
                      <p className="font-medium text-primary">[REDACTED]</p>
                      <p className="text-primary">[REDACTED]</p>
                      <p className="text-primary">[REDACTED]</p>
                      <p className="mt-3">E-commerce app using MERN stack</p>
                      <p>Skills: C++, React, Node.js</p>
                    </div>
                  </div>
                  <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                    The original page layout, fonts and technical content stay in place.
                    Redaction removes the underlying text and image pixels.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="features" className="container relative py-20">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline" className="w-fit">Built for safe sharing</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Three things that make the difference.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="group p-1">
                <CardHeader>
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25 transition-colors group-hover:bg-primary/15">
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

        <section id="how-it-works" className="relative border-y border-border bg-card/40 py-20 backdrop-blur-sm">
          <div className="container">
            <div className="max-w-2xl space-y-3">
              <Badge variant="outline" className="w-fit">How it works</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Four clear steps</h2>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map(({ icon: Icon, title, text }, index) => (
                <Card key={title} className="relative overflow-hidden p-5">
                  <div
                    aria-hidden="true"
                    className="absolute right-3 top-2 text-5xl font-bold text-foreground/[0.03]"
                  >
                    0{index + 1}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Step {index + 1}
                  </span>
                  <span className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="container relative py-20">
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25 shadow-glow">
              <ShieldCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Privacy isn’t a setting here
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Your file lives in a short-lived, private session on the server and is deleted
              when that session ends. We never log resume contents, never offer the original
              for download, and never send it to a third-party AI service.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Detection is AI-assisted and OCR can misread text. You review every decision,
              and the app tells you clearly whenever complete redaction or exact formatting
              preservation cannot be guaranteed.
            </p>
            <div className="flex justify-center pt-3">
              <Button asChild size="lg">
                <Link to="/dashboard">
                  Protect my resume <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
