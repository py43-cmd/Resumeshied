import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileSearch,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
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

      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <div className="container grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
            <div className="space-y-6">
              <Badge variant="accent" className="w-fit">Private by design</Badge>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Share your resume.
                <br />
                <span className="text-primary">Not your identity.</span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                ResumeShield finds personal information in your resume and permanently
                removes the parts you choose — so you can get honest technical feedback
                without exposing yourself.
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
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <li>✓ No account</li>
                <li>✓ No permanent storage</li>
                <li>✓ No external AI APIs</li>
              </ul>
            </div>

            <Card className="shadow-panel">
              <CardHeader>
                <CardTitle>Only the sensitive parts change</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-border p-4 text-sm">
                    <p className="mb-3 font-semibold text-muted-foreground">Before</p>
                    <p>Rahul Sharma</p>
                    <p>rahul@gmail.com</p>
                    <p>+91 9876543210</p>
                    <p className="mt-3">E-commerce app using MERN stack</p>
                    <p>Skills: C++, React, Node.js</p>
                  </div>
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
                    <p className="mb-3 font-semibold text-primary">After</p>
                    <p>[REDACTED]</p>
                    <p>[REDACTED]</p>
                    <p>[REDACTED]</p>
                    <p className="mt-3">E-commerce app using MERN stack</p>
                    <p>Skills: C++, React, Node.js</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  The original page layout, fonts and technical content stay in place.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="features" className="container py-16">
          <h2 className="text-3xl font-bold tracking-tight">Built for safe sharing</h2>
          <p className="mt-2 text-muted-foreground">Three things that make the difference.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="mb-2 h-6 w-6 text-primary" aria-hidden="true" />
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-surface py-16">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tight">Four clear steps</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map(({ icon: Icon, title, text }, index) => (
                <div key={title} className="space-y-3">
                  <span className="text-xs font-semibold text-primary">STEP {index + 1}</span>
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="container py-16">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
            <h2 className="text-3xl font-bold tracking-tight">Privacy isn’t a setting here</h2>
            <p className="text-muted-foreground">
              Your file lives in a short-lived, private session on the server and is deleted
              when that session ends. We never log resume contents, never offer the original
              for download, and never send it to a third-party AI service.
            </p>
            <p className="text-sm text-muted-foreground">
              Detection is AI-assisted and OCR can misread text. You review every decision,
              and the app tells you clearly whenever complete redaction or exact formatting
              preservation cannot be guaranteed.
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
