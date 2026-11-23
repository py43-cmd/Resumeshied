# ResumeShield

Privacy-first tool for removing personal information from resumes before sharing
them for feedback.

## Status

- [x] Phase 1 — Product planning
- [x] Phase 2 — UI/UX design + visual-preservation addendum
- [x] Phase 3A — Backend foundation
- [x] Phase 3B — Frontend foundation
- [x] Phase 4 — Upload and extraction (4A session/upload, 4B extraction, 4C frontend flow)
- [x] Phase 5 — PII detection (including local OCR)
- [x] Phase 6 — Privacy editor
- [x] Phase 7 — Native PDF redaction
- [x] Phase 8 — Verification and visual QA
- [ ] Phase 9 — Testing
- [ ] Phase 10 — Deployment

## Repository layout

```
resumeshield/
├── client/    React + Vite SPA (Phase 3B)
└── server/    Express API (Phase 3A)
```

## Quick start (backend)

```bash
cd server
npm install
copy .env.example .env
npm run dev
npm test
```

Health check: `GET http://localhost:4000/api/health`

## Quick start (frontend)

```bash
cd client
npm install
npm run dev        # http://localhost:5173
npm test           # browser-side file validation tests
npm run build      # production build into client/dist
```

The Vite dev server proxies `/api` to `http://localhost:4000`, so start the
backend first. Create `client/.env` from `client/.env.example` only if the API
is hosted elsewhere.

## Privacy rules for contributors

1. Never log resume text, file names, detection values, or request bodies.
2. Never store uploaded files outside a per-session temporary directory.
3. Never send resume content to an external API.
4. Never cover text with a rectangle and call it redaction.

## Redaction engine (Phase 7)

Native redaction uses [MuPDF.js](https://mupdf.com/mupdf-js) (`mupdf` on npm),
an official Artifex WebAssembly build that runs locally with no native
dependencies or external calls.

- `POST /api/sessions/:sessionId/documents/:documentId/redact` applies the saved
  plan using `applyRedactions()` with text removal, line-art removal, and image
  pixel redaction.
- The PDF is saved with `garbage=deduplicate,compress=yes,encrypt=none`, which
  physically purges superseded objects — no incremental history is left behind.
- Existing annotations, embedded files, and standard Info metadata are cleared.
- `GET /api/sessions/:sessionId/redactions/:redactionId/download` returns the
  rewritten PDF with `no-store` headers; both endpoints re-check the privacy
  plan before proceeding.
- Privacy failures (blocked plan, non-PDF input) return HTTP 422 and block the
  download. Fidelity issues (page count or dimension drift) warn but still allow
  the download.

### Verification and visual QA (Phase 8)

Every redacted file is checked locally before it is stored:

- **Privacy (hard gate).** The rewritten PDF is re-extracted with pdfjs. If any
  text item substantially overlaps an approved box, the operation returns
  `TEXT_REMAINS_IN_BOX` (HTTP 422) and the file is **never stored**. The download
  endpoint also re-checks the recorded privacy verdict.
- **Fidelity (advisory).** Original and redacted pages are rendered to raw RGB
  pixels with MuPDF and compared outside the approved boxes. A change there
  produces `VISUAL_DIFF_OUTSIDE_BOXES`, which the UI shows as a warning but does
  **not** block download.

The visual comparison pads each box by up to 25% of its height (minimum 3pt)
because MuPDF clears whole glyph boxes, including descenders that extend past
pdfjs's reported text box. Only counts and codes are stored — never text.

The response includes `data.verification.privacy` and `data.verification.fidelity`
with statuses and pixel counts, and the export page renders one status row per
check.

### Known limitations

- A manual box that misses a line entirely cannot be detected by geometry alone
  (there is no approved box to compare against). Review the preview carefully.
- XMP metadata and AcroForm field values are not yet cleared. If a document uses
  those features, treat the output as unverified.
- DOCX files require conversion to PDF before coordinate redaction; until then
  the redact endpoint rejects them with `PDF_REQUIRED`.
- Visual comparison assumes unrotated pages; heavily rotated or unusual page
  geometry may report `VISUAL_CHECK_UNAVAILABLE`.
