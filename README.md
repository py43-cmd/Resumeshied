# ResumeShield

Privacy-first web application that finds and permanently removes personally
identifiable information (PII) from resumes before they are shared for feedback.

ResumeShield runs locally/on infrastructure you control: no database, no
permanent upload storage, no external AI APIs, and no raw PII in browser
responses or logs.

---

## Table of contents

- [Status](#status)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Privacy and security model](#privacy-and-security-model)
- [Redaction and verification](#redaction-and-verification)
- [Testing](#testing)
- [Deployment](#deployment)
- [Engineering conventions](#engineering-conventions)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Roadmap and non-goals](#roadmap-and-non-goals)

---

## Status

| Area | Status |
| --- | --- |
| Product planning | Complete |
| UI/UX and visual-preservation design | Complete |
| Backend foundation | Complete |
| Frontend foundation | Complete |
| Upload and extraction | Complete |
| PII detection, including local OCR | Complete |
| Privacy editor | Complete |
| Native PDF redaction | Complete |
| Verification and visual QA | Complete |
| Automated tests | Complete |
| Deployment | In progress |

Deployment state:

- Render API is live at `https://resumeshied.onrender.com`.
- `GET https://resumeshied.onrender.com/api/health` returned HTTP 200 with
  `success: true` and `data.status: "ok"` on 2026-11-23.
- Vercel frontend configuration is pending final environment setup and
  end-to-end browser verification.

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the production runbook.

---

## Architecture

Production topology:

```text
Browser
   |
   | HTTPS
   v
Vercel: React + Vite SPA
   |
   | VITE_API_URL=https://<render-service>.onrender.com/api
   | X-Session-Token header on protected requests
   v
Render: Express API
   |
   |-- in-memory session map
   |-- /tmp/resumeshield per-session directories
   |-- pdfjs text/geometry extraction
   |-- MuPDF native redaction + PNG rendering
   `-- tesseract.js local OCR
   |
   v
Sanitized PDF download (no-store)
```

The API is intentionally deployed as a long-running Node service, not as a
Vercel Function. ResumeShield uses in-memory sessions and per-session temp
directories across multiple requests. Serverless instances do not guarantee
request affinity, so a function deployment can lose a session mid-flow.

### Request lifecycle

1. `POST /api/sessions` creates an opaque session ID and token.
2. `POST /api/sessions/:sessionId/files` stores the uploaded file in a private
   temp directory after MIME and magic-byte validation.
3. `POST .../extract` uses pdfjs to obtain text items, page geometry, image
   draw counts, and annotation counts. Raw text is never returned to the
   browser.
4. If no text layer exists, `POST .../ocr` runs local `tesseract.js` and marks
   all OCR-derived detections as requiring human review.
5. `POST .../detect` runs local rules and returns masked matches with page,
   bounding boxes, confidence, category, and optional icon hints.
6. `PUT .../redaction-plan` accepts only review decisions and manual boxes.
   Matched values are server-owned and never accepted from the client.
7. `POST .../redact` applies the plan with MuPDF and verifies that no approved
   box still contains text.
8. `GET .../download` re-checks the privacy verdict and streams the rewritten
   PDF with `Cache-Control: no-store`.

### Module boundaries

| Layer | Location | Responsibility |
| --- | --- | --- |
| HTTP | `server/src/routes`, `server/src/controllers` | Routing, request validation, response envelopes |
| Session | `server/src/sessions` | In-memory sessions, TTL, allowlisted public views |
| Extraction | `server/src/services/extraction`, `server/src/services/pdf` | pdfjs text/geometry, local canvas setup, page rendering |
| Detection | `server/src/services/detection` | Local PII rules, icon-aware association, image discovery |
| Redaction | `server/src/services/redaction` | Privacy-safe plan, MuPDF coordinate redaction |
| Verification | `server/src/services/verification` | Text-overlap hard gate and advisory pixel diff |
| Client API | `client/src/lib/*Api.js` | Thin endpoint wrappers |
| Client state | `client/src/context/SessionContext.jsx` | Session token lifecycle and stale-session recovery |
| Client views | `client/src/pages`, `client/src/lib/*View.js` | UI state and presentation helpers |

Canvas globals must be installed before any pdfjs-importing module is evaluated.
This is handled by `server/src/services/pdf/nodeCanvasSetup.js`, which is the
first import in `server/src/app.js`.

---

## Technology stack

| Area | Choice | Notes |
| --- | --- | --- |
| Frontend | React 18, Vite 6, React Router 7 | JavaScript only, ESM |
| Styling | Tailwind CSS 3, tailwindcss-animate, Radix Slot | Component utilities in `client/src/lib/utils.js` |
| Client HTTP | axios | Single instance, envelope unwrapped in `client/src/lib/api.js` |
| Backend | Express 4, Node.js 20+ | ESM, `"type": "module"` |
| Security headers | helmet | `X-Powered-By` disabled |
| CORS | cors | Exact origin allowlist; no wildcards in production |
| Uploads | multer | Memory storage, magic-byte checks before disk write |
| PDF text/geometry | `pdfjs-dist@4.10.38` | Legacy build path; do not upgrade to v6 on Node 20/22 |
| PDF rewriting | `mupdf@1.28.6` | Official Artifex JS/WASM build; no native binary |
| Canvas | `canvas`, `@napi-rs/canvas` | Required by pdfjs/MuPDF rendering paths |
| OCR | `tesseract.js`, local `eng` data | No network OCR calls |
| DOCX text | mammoth, jszip | DOCX can be inspected but not coordinate-redacted yet |
| Tests | Node built-in `node --test` | No external test runner |

---

## Repository layout

```text
resumeshield/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/            # API wrappers and pure view helpers
│   │   ├── pages/          # Upload, detection, editor, export flows
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tests/
│   ├── .env.example
│   ├── vercel.json         # Vite SPA fallback
│   └── vite.config.js      # Dev proxy: /api -> localhost:4000
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── detection/
│   │   │   ├── extraction/
│   │   │   ├── ocr/
│   │   │   ├── pdf/
│   │   │   ├── redaction/
│   │   │   └── verification/
│   │   ├── sessions/
│   │   ├── utils/
│   │   ├── app.js           # Express app; no listener
│   │   └── server.js        # Listener, sweeper, graceful shutdown
│   ├── tests/
│   └── .env.example
├── DEPLOYMENT.md            # Production runbook
├── render.yaml              # Render Blueprint for the API
└── README.md
```

---

## Prerequisites

- Node.js 20 or newer.
- npm.
- A local PDF resume for manual verification.
- Optional: a scanned PDF to exercise the local OCR path.

There is no root `package.json`. Install and run dependencies inside `server/`
and `client/` separately.

---

## Local development

Clone:

```bash
git clone https://github.com/py43-cmd/Resumeshied.git
cd Resumeshied
```

### Backend

Windows:

```bat
cd server
npm ci
copy .env.example .env
npm run dev
```

macOS/Linux:

```bash
cd server
npm ci
cp .env.example .env
npm run dev
```

The API listens on `http://localhost:4000` by default.

Health check:

```bash
curl http://localhost:4000/api/health
```

### Frontend

In a second terminal:

```bash
cd client
npm ci
npm run dev
```

Open `http://localhost:5173`.

The Vite dev server proxies `/api` to `http://localhost:4000`, so leave
`VITE_API_URL=/api` during local development and start the backend first.

### Scripts

| Directory | Command | Purpose |
| --- | --- | --- |
| `server/` | `npm run dev` | Start with nodemon |
| `server/` | `npm start` | Start production listener |
| `server/` | `npm test` | Run backend tests |
| `client/` | `npm run dev` | Start Vite dev server |
| `client/` | `npm run build` | Build into `client/dist` |
| `client/` | `npm run preview` | Preview production build |
| `client/` | `npm test` | Run client logic tests |

---

## Environment variables

### Server (`server/.env`)

| Name | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` enables strict origin checks. |
| `PORT` | `4000` | Listener port. Do not set on Render; Render injects it. |
| `LOG_LEVEL` | `info` | Structured logging level. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Exact browser origin allowed by CORS. |
| `SESSION_TTL_SECONDS` | `1800` | Session lifetime; temp files are deleted on expiry. |
| `MAX_UPLOAD_BYTES` | `10485760` | Per-file upload cap (10 MiB). |
| `TEMP_ROOT` | OS temp dir | Parent directory for per-session folders. |

`CLIENT_ORIGIN` must not contain `*` when `NODE_ENV=production`.

### Client (`client/.env`)

| Name | Local value | Production value |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | `https://<render-service>.onrender.com/api` |

Vite inlines `VITE_*` variables at build time. Change the value **before**
building, then redeploy.

---

## API reference

Base URL:

```text
http://localhost:4000/api
```

Production base URL:

```text
https://resumeshied.onrender.com/api
```

### Response envelope

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "uuid-or-request-id",
    "sessionExpiresInSeconds": 1800
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "SESSION_TOKEN_REQUIRED",
    "message": "A session token is required."
  },
  "meta": {
    "requestId": "uuid-or-request-id"
  }
}
```

`details` may be present for 4xx errors. Non-operational 5xx errors intentionally
hide internal messages.

### Authentication

All routes except `GET /api/health` and `POST /api/sessions` require:

```text
X-Session-Token: <token returned by createSession>
```

The browser client injects this header through an axios interceptor. Downloads
and page previews also use the header; the token is never placed in a URL.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness and service metadata |
| `POST` | `/api/sessions` | Create a short-lived session |
| `GET` | `/api/sessions/:sessionId` | Read session state and remaining TTL |
| `DELETE` | `/api/sessions/:sessionId` | Destroy session and delete temp files |
| `POST` | `/api/sessions/:sessionId/files` | Upload one PDF or DOCX as multipart `file` |
| `GET` | `/api/sessions/:sessionId/documents/:documentId` | Read document status |
| `POST` | `/api/sessions/:sessionId/documents/:documentId/extract` | Extract text and geometry |
| `POST` | `/api/sessions/:sessionId/documents/:documentId/ocr` | Run local OCR on image-only PDFs |
| `POST` | `/api/sessions/:sessionId/documents/:documentId/detect` | Run PII detection |
| `GET` | `/api/sessions/:sessionId/documents/:documentId/detections` | Read the last detection result |
| `GET` | `/api/sessions/:sessionId/documents/:documentId/pages/:pageNumber/preview?scale=1.5` | Render an original page as PNG |
| `GET` | `/api/sessions/:sessionId/documents/:documentId/redaction-plan` | Read the saved plan |
| `PUT` | `/api/sessions/:sessionId/documents/:documentId/redaction-plan` | Save review decisions and manual boxes |
| `POST` | `/api/sessions/:sessionId/documents/:documentId/redact` | Apply the saved plan |
| `GET` | `/api/sessions/:sessionId/redactions/:redactionId/download` | Download the sanitized PDF |

Binary endpoints return `Cache-Control: no-store` and
`X-Content-Type-Options: nosniff`.

### Save plan payload

The server never accepts detected values from the browser. It only accepts
decisions keyed by server-owned detection IDs and manual geometry.

```json
{
  "decisions": {
    "7b1f...": "accepted",
    "c02a...": "rejected",
    "e991...": "undecided"
  },
  "manualRegions": [
    {
      "pageNumber": 1,
      "bbox": { "x": 72, "y": 96, "width": 180, "height": 14 }
    }
  ]
}
```

Accepted decisions: `accepted`, `rejected`, `undecided`. `undecided` produces a
privacy blocker rather than a validation failure.

### Detection fields

Each detection contains:

```text
detectionId, type, method, confidence, pageNumber, bboxes,
maskedValue, needsReview
```

Optional fields:

```text
reason, iconContext, iconHints, iconContextSources, iconDistancePoints
```

`maskedValue` is the only value representation sent to the browser. Raw matched
PII never reaches the public view layer.

---

## Privacy and security model

1. **No permanent storage.** Uploads live only in a per-session temp directory.
   Sessions and files disappear on expiry, explicit destroy, or process restart.
2. **No PII in logs.** Access logs are allowlisted to timestamp, event, request
   ID, method, path, status, and duration. No query strings, IPs, bodies, file
   names, or detection values.
3. **No raw PII to the browser.** Public views use allowlists. Detection responses
   include only `maskedValue`, category, page, box, confidence, and review state.
4. **No external inference.** Detection rules, OCR, extraction, and redaction all
   run locally. No resume content is sent to a third-party API.
5. **Verified file types.** Uploads are checked for extension, MIME type, and
   magic bytes before being written to disk.
6. **Private binaries.** Page previews and downloads require `X-Session-Token`
   and are marked `no-store`.
7. **Native redaction only.** Text and image pixels are removed from the PDF
   object stream; black rectangles over recoverable text are not used.
8. **Privacy gate.** If verification finds text remaining in an approved box,
   the redacted file is not stored and download is blocked.

CORS is configured from `CLIENT_ORIGIN`. Production requires one exact origin.

---

## Redaction and verification

### Redaction

`POST .../redact` applies the saved plan using MuPDF:

- text removal, line-art removal, and image pixel redaction
- save options: `garbage=deduplicate,compress=yes,encrypt=none,regenerate-id`
- removal of existing annotations, embedded files, and standard Info metadata
- coordinate-based edits that preserve page dimensions, fonts, layout, and
  unrelated graphics

Privacy failures such as a blocked plan or non-PDF input return HTTP 422.
Fidelity failures warn but do not block the download.

### Verification

Every redacted file is checked before storage:

- **Privacy — hard gate.** The rewritten PDF is re-extracted with pdfjs. If a
  text item substantially overlaps an approved box, the operation returns
  `TEXT_REMAINS_IN_BOX` (HTTP 422) and the file is never stored. The download
  endpoint re-checks the recorded verdict.
- **Fidelity — advisory.** Original and redacted pages are rendered to raw RGB
  pixels with MuPDF and compared outside approved boxes. A change produces
  `VISUAL_DIFF_OUTSIDE_BOXES`, which the UI shows as a warning but does not block
  download.

Boxes are padded by up to 25% of their height (minimum 3pt) because MuPDF clears
whole glyph boxes, including descenders beyond the pdfjs-reported box. Only
counts and codes are stored, never text.

Responses include `data.verification.privacy` and
`data.verification.fidelity`.

---

## Testing

Run both suites from the repository root:

```bash
cd server
npm ci
npm test
```

Expected: **57 pass, 0 fail**.

```bash
cd ../client
npm ci
npm test
npm run build
```

Expected: **29 pass, 0 fail**, followed by a successful Vite build into
`client/dist`.

### Coverage map

| Area | File | Key assertions |
| --- | --- | --- |
| API envelope and routing | `server/tests/health.test.js` | Request IDs, 404 envelope |
| Sessions and uploads | `server/tests/session.test.js` | Token auth, MIME/signature checks, size limit, folder cleanup |
| Expiry | `server/tests/session-expiry.test.js` | 1s TTL via env, `SESSION_EXPIRED`, temp folder deletion |
| Extraction | `server/tests/extraction.test.js` | Geometry, OCR handoff, no text in responses |
| Detection | `server/tests/detection.test.js` | Masked values, page-accurate boxes, no raw PII |
| OCR | `server/tests/ocr.test.js` | Local tesseract, mandatory human review |
| Editor | `server/tests/editor.test.js` | PNG preview, privacy-safe plan, blocked plans |
| Redaction | `server/tests/redaction.test.js` | Permanent removal, private download, privacy gates |
| Verification | `server/tests/verification.test.js` | `TEXT_REMAINS_IN_BOX`, `VISUAL_DIFF_OUTSIDE_BOXES` |
| End-to-end | `server/tests/e2e.test.js` | Full two-page pipeline, download-time plan re-check |
| Log privacy | `server/tests/logging.test.js` | Allowlist drops filenames and values |
| Client | `client/tests/*.test.js` | Validation, view helpers, export verdict logic |

Run one file while debugging:

```bash
cd server && node --test tests/e2e.test.js
cd client && node --test tests/exportView.test.js
```

### Test notes

- `node --test` prints a `# tests / # pass / # fail / # duration_ms` summary.
  Exit code is `0` only when all assertions pass.
- MuPDF may print warnings such as
  `getPathGenerator - ignoring character: "Helvetica_path_R."` while rendering
  the minimal hand-built test fixture. These are harmless and do not indicate a
  failed assertion.
- `SESSION_TTL_SECONDS=1` is set only inside `session-expiry.test.js` via a
  dynamic import. Do not set it globally.
- Keep pure logic in `client/src/lib/*.js`. The Node test runner cannot import
  JSX directly.

---

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the complete runbook.

Summary:

| Component | Platform | Root | Build | Start/Output |
| --- | --- | --- | --- | --- |
| API | Render | `server` | `npm ci` | `npm start` |
| SPA | Vercel | `client` | `npm run build` | `dist` |

Render is defined by [`render.yaml`](render.yaml):

- Node 20, plan `1c-2g`, one instance
- health check `/api/health`
- `CLIENT_ORIGIN` is the only prompted value
- do not set `PORT`
- do not attach a persistent disk
- do not use the Free plan: sleeping destroys in-memory sessions

Vercel uses [`client/vercel.json`](client/vercel.json) for SPA rewrites.

Required production environment variables:

```bash
# Render
NODE_ENV=production
CLIENT_ORIGIN=https://<vercel-domain>
SESSION_TTL_SECONDS=1800
MAX_UPLOAD_BYTES=10485760
TEMP_ROOT=/tmp/resumeshield
LOG_LEVEL=info

# Vercel
VITE_API_URL=https://<render-service>.onrender.com/api
```

Current API health check:

```bash
curl https://resumeshied.onrender.com/api/health
```

---

## Engineering conventions

- JavaScript only. No TypeScript.
- ESM modules in both `client/` and `server/`.
- Every API response goes through `sendSuccess` or `sendError`.
- Public data goes through view allowlists in `server/src/sessions/*Views.js`.
- Session auth is header-based: `X-Session-Token`.
- Client API calls are thin wrappers in `client/src/lib/*Api.js`.
- Pure client logic belongs in `client/src/lib/*.js` so it is testable with
  `node --test`.
- No file names, resume text, detection values, or request bodies in logs.
- No external API calls with document content.
- Privacy failures block. Fidelity failures warn.
- When changing detection or redaction behavior, update the matching test file
  in the same change.

---

## Known limitations

- A manual box that misses a line entirely cannot be detected by geometry alone.
  Review the preview carefully.
- XMP metadata and AcroForm field values are not yet cleared. Treat documents
  using those features as unverified.
- DOCX files can be inspected for text, but coordinate redaction requires PDF.
  The redact endpoint rejects them with `PDF_REQUIRED`.
- Visual comparison assumes unrotated pages. Unusual geometry may report
  `VISUAL_CHECK_UNAVAILABLE`.
- OCR can misread characters. All OCR-derived detections require explicit human
  confirmation.
- Icons can be located but not semantically named with high confidence. Icon
  proximity is a hint; value regexes remain authoritative.
- Sessions are in-memory. Restarting or scaling the API invalidates active
  sessions.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Browser shows `500` for every `/api/*` request locally | Vite is running but the API on port 4000 is not | Start the backend: `cd server && npm run dev` |
| `EADDRINUSE :::4000` | Another process owns port 4000 | Find with `Get-NetTCPConnection -LocalPort 4000 -State Listen`, then stop the PID |
| Review/editor fails after backend restart | Sessions are in-memory and were wiped | Start a new session and re-upload |
| `SESSION_EXPIRED` on Render after idle time | Free or sleeping instance restarted | Use the `1c-2g` plan and one instance |
| `400 INVALID_REVIEW_DECISION` | Stale detection IDs, often from React StrictMode double effects | Client sends current IDs only; re-run detection if the page is stale |
| Browser calls Vercel `/api/...` and gets HTML/404 | `VITE_API_URL` missing at Vercel build time | Set it to the Render API URL with `/api`, then redeploy |
| CORS error in browser console | `CLIENT_ORIGIN` does not exactly match the Vercel origin | Set exact origin, e.g. `https://resumeshield.vercel.app` |
| `FILE_TOO_LARGE` in production | Host/proxy body limit below `MAX_UPLOAD_BYTES` | Raise host limit or lower `MAX_UPLOAD_BYTES` |
| `Cannot find module 'mupdf'` | Dependencies not installed in `server/` | `cd server && npm ci` |
| `Promise.try is not a function` | `pdfjs-dist` v6 on Node 20/22 | Keep `pdfjs-dist@4.10.38` pinned and use the legacy build path |
| Phone number still visible in output | Wrong number format, marked Keep, or stale backend | Confirm Hide is selected; restart backend after rule changes |
| Logo/photo not listed | Not a PDF, image under 8x8 pt, or stale backend | Re-run detection on the PDF and restart after upgrades |
| Contact icon value not detected | Unrecognized value shape, scanned PDF, or stale backend | Run local OCR first and confirm every match |
| Build passes but UI shows stale warnings | Vite cache or old build | Stop dev server and run `npm run build` again |

---

## Roadmap and non-goals

Future work only:

- Optional Presidio/NER sidecar for higher-recall detection.
- MongoDB-backed sessions if multi-instance scaling is required.
- Sharing links with short-lived access tokens.
- AI-assisted feedback on anonymized documents.
- Batch processing.
- LibreOffice-based DOCX-to-PDF conversion before coordinate redaction.

Explicit non-goals for the MVP:

- Permanent resume storage.
- User accounts and databases.
- External AI APIs receiving document content.
- Rectangle overlays that leave recoverable text.
- Multi-instance backend deployment without a session-storage redesign.
