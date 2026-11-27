import { Check, ShieldCheck } from 'lucide-react';

import { Badge } from '../ui/Badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card.jsx';

const BLOCKS = [
  { label: 'Name', width: 'w-[118px]' },
  { label: 'Email address', width: 'w-[164px]' },
  { label: 'Phone number', width: 'w-[126px]' },
  { label: 'Profile link', width: 'w-[142px]' },
  { label: 'Location', width: 'w-[108px]' },
];

function DemoDocument({ redacted }) {
  return (
    <div
      role="img"
      aria-label={
        redacted
          ? 'Resume with five solid black redaction blocks covering personal information'
          : 'Resume sample showing a name, email, phone number, profile link and location'
      }
      className="document-sheet min-h-[340px] rounded-lg p-5 sm:p-6"
    >
      <div aria-hidden="true" className="space-y-5">
        <div className="space-y-2">
          {redacted ? (
            <span className={`redaction-mask block h-4 ${BLOCKS[0].width}`} />
          ) : (
            <p className="text-lg font-semibold tracking-tight">Jordan Lee</p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-neutral-600 sm:text-[11px]">
            {redacted ? (
              <>
                <span className={`redaction-mask block h-2.5 ${BLOCKS[1].width}`} />
                <span className={`redaction-mask block h-2.5 ${BLOCKS[2].width}`} />
                <span className={`redaction-mask block h-2.5 ${BLOCKS[3].width}`} />
              </>
            ) : (
              <>
                <span>jordan.lee@example.com</span>
                <span>+1 (415) 555-0138</span>
                <span>linkedin.com/in/jordanlee</span>
              </>
            )}
          </div>
          {redacted ? (
            <span className={`redaction-mask mt-2 block h-2.5 ${BLOCKS[4].width}`} />
          ) : (
            <p className="text-[10px] text-neutral-600 sm:text-[11px]">
              San Francisco, CA · Open to product design roles
            </p>
          )}
        </div>

        <div className="h-px bg-neutral-300" />

        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-800">
            Experience
          </p>
          <div className="space-y-1.5">
            <div className="h-2 w-1/3 rounded-none bg-neutral-800" />
            <div className="h-1.5 w-5/6 bg-neutral-300" />
            <div className="h-1.5 w-4/5 bg-neutral-300" />
            <div className="h-1.5 w-2/3 bg-neutral-300" />
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-800">
            Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['Research', 'Systems', 'Prototyping', 'Analytics'].map((skill) => (
              <span key={skill} className="border border-neutral-300 px-1.5 py-0.5 text-[9px]">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-800">
            Education
          </p>
          <div className="h-2 w-2/5 bg-neutral-700" />
          <div className="h-1.5 w-3/5 bg-neutral-300" />
        </div>
      </div>
    </div>
  );
}

export function BeforeAfterDemo() {
  return (
    <section id="demo" className="section-pad relative border-b border-border">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline" className="w-fit">
              Before / after
            </Badge>
            <h2 className="text-section font-semibold">
              See exactly what a reviewer sees.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Personal details become solid black rectangles on the page. In the exported PDF,
              approved text is removed from the file — not simply covered up.
            </p>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Illustrative sample. Your own resume is rendered from its original pages, with masks
            placed at the detected coordinates.
          </p>
        </div>

        <Card className="mt-9 overflow-hidden">
          <CardHeader className="border-b border-border pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>A shared resume, before and after redaction</CardTitle>
                <CardDescription>
                  Same layout. Only the details you choose to hide change.
                </CardDescription>
              </div>
              <Badge variant="success" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Solid black masks
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="grid gap-5 pt-5 lg:grid-cols-2 lg:gap-6">
            <figure className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge variant="warning">Before</Badge>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Personal details visible
                </span>
              </div>
              <DemoDocument redacted={false} />
              <figcaption className="mt-3 text-xs text-muted-foreground">
                Names, contact details and locations can identify you immediately.
              </figcaption>
            </figure>

            <figure className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge variant="success">After</Badge>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Ready to share
                </span>
              </div>
              <DemoDocument redacted />
              <figcaption className="mt-3 text-xs text-muted-foreground">
                Black rectangles mark hidden areas; underlying supported text is removed on export.
              </figcaption>
            </figure>
          </CardContent>

          <div className="border-t border-border px-5 py-4 sm:px-6">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm">
              {['Names', 'Emails', 'Phone numbers', 'Links', 'Addresses', 'Image regions'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </Card>
      </div>
    </section>
  );
}
