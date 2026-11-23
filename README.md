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
- [x] Phase 9 — Testing
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

## Testing (Phase 9)

Run both suites from the repository root. Each `node --test` file runs in its
own process, so the short-TTL expiry test cannot affect the other suites.

```bash
cd server && npm test       # expected: 39 tests, 39 pass, 0 fail
cd ../client && npm test    # expected: 21 tests, 21 pass, 0 fail
cd ../client && npm run build
```

### What is covered

| Area | File | Key assertions |
| --- | --- | --- |
| API envelope / routing | `server/tests/health.test.js` | request IDs, 404 envelope |
| Sessions & uploads | `server/tests/session.test.js` | token auth, MIME/signature checks, size limit, folder cleanup |
| Expiry | `server/tests/session-expiry.test.js` | 1s TTL via env, `SESSION_EXPIRED`, temp folder deleted |
| Extraction | `server/tests/extraction.test.js` | geometry, OCR handoff, no text in responses |
| Detection | `server/tests/detection.test.js` | masked values, page-accurate bboxes, no raw PII |
| OCR | `server/tests/ocr.test.js` | local tesseract, mandatory human review |
| Editor | `server/tests/editor.test.js` | PNG preview, privacy-safe plan, blocked plans |
| Redaction | `server/tests/redaction.test.js` | permanent removal, private download, privacy gates |
| Verification | `server/tests/verification.test.js` | `TEXT_REMAINS_IN_BOX`, `VISUAL_DIFF_OUTSIDE_BOXES` |
| End-to-end | `server/tests/e2e.test.js` | full 2-page pipeline, download-time plan re-check |
| Log privacy | `server/tests/logging.test.js` | allowlist drops filenames and values |
| Client | `client/tests/*.test.js` | validation, view helpers, export verdict logic |

Run a single file while debugging:

```bash
cd server && node --test tests/e2e.test.js
cd client && node --test tests/exportView.test.js
```

### Expected output notes

- `node --test` prints a `# tests / # pass / # fail / # duration_ms` summary.
  Exit code is `0` only when everything passes.
- MuPDF may print warnings such as
  `getPathGenerator - ignoring character: "Helvetica_path_R."` during page
  rendering tests. These come from the minimal hand-built test fixture's font
  mapping and are harmless; they do not indicate a failed assertion.
- `SESSION_TTL_SECONDS` is intentionally set to `1` inside
  `session-expiry.test.js` using a dynamic import. Do not set it globally.

### Common errors

| Symptom | Cause | Fix |
| --- | --- | --- |
| Browser shows `500` for every `/api/*` request | Vite is running but the API on port 4000 is not — the proxy returns 500 when its target is down | Start the backend first: `cd server && npm run dev` |
| `EADDRINUSE :::4000` on startup | A backend is already listening on port 4000 (only one process can bind a port) | Use the running server, or stop it first: find the PID with `Get-NetTCPConnection -LocalPort 4000 -State Listen`, then `Stop-Process -Id <pid>` |
| Review/editor page errors right after restarting the backend | Sessions are in-memory, so a restart wipes them while the browser keeps the old token | The client now drops the dead session automatically and shows "Start a new session" — re-upload from the Upload page |
| `400 INVALID_REVIEW_DECISION` on "Save & continue" | Detection IDs are regenerated on each run; React StrictMode (dev) can double-run detection, leaving stale IDs in the review state | Fixed on both sides: the client sends only current detection IDs, and the server reuses a ready detection result instead of re-minting IDs |
| `Cannot find module 'mupdf'` | Dependencies not installed in `server/` | `cd server && npm install` |
| `Promise.try is not a function` | `pdfjs-dist` 6.x on Node 22 | Keep `pdfjs-dist@4.10.38` pinned and import from `pdfjs-dist/legacy/build/pdf.mjs` |
| `SESSION_EXPIRED` test flakes | System clock/timer delay under heavy load | Re-run; the test already allows a 100ms cleanup window |
| Client test cannot import a `.jsx` file | Node test runner cannot parse JSX | Keep pure logic in `client/src/lib/*.js` (see `exportView.js`) |
| Build passes but UI shows stale warnings | Vite cache | Stop the dev server and run `npm run build` again |
