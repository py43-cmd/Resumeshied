# Deployment

Production architecture for ResumeShield:

```text
Vercel:  React + Vite SPA
           |
           | VITE_API_URL=https://<api-domain>/api
           v
Node host: Express API + MuPDF/pdfjs/tesseract
           |
           | in-memory sessions + short-lived temp files
           v
       Redacted PDF download
```

The API is deliberately not deployed as a Vercel Function. ResumeShield uses
in-memory sessions and per-session temp directories across several requests.
Vercel Functions do not guarantee that later requests reach the same instance,
so a serverless deployment can lose sessions mid-flow.

## 1. Deploy the API first

Use a long-running Node host such as Render, Railway, Fly.io, or a VPS.

Settings:

| Setting | Value |
| --- | --- |
| Root Directory / working directory | `server` |
| Runtime | Node.js 20 or newer |
| Install command | `npm ci` |
| Start command | `npm start` |
| Instance count | 1 |

Environment variables:

| Name | Example | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Enables production config checks. |
| `CLIENT_ORIGIN` | `https://resumeshield.vercel.app` | Exact Vercel origin, no wildcard, no path, no trailing slash. |
| `PORT` | `4000` | Or let the host inject `PORT`; the app reads it. |
| `SESSION_TTL_SECONDS` | `1800` | 30 minutes. |
| `MAX_UPLOAD_BYTES` | `10485760` | 10 MiB. |
| `TEMP_ROOT` | `/tmp/resumeshield` | Short-lived processing files only. |
| `LOG_LEVEL` | `info` | Never log file names, resume text, or detection values. |

Deploy, then verify health:

```bash
curl https://<api-domain>/api/health
```

Expected: HTTP 200 with `success: true` and `data.status` equal to `"ok"`.

If the API host provides a public URL only after first deploy, copy that URL and
return to update `CLIENT_ORIGIN` if needed.

## 2. Deploy the frontend to Vercel

Import the GitHub repository into Vercel.

Settings:

| Setting | Value |
| --- | --- |
| Root Directory | `client` |
| Framework Preset | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

The included `client/vercel.json` adds the SPA rewrite so routes such as
`/dashboard` and `/editor` load `index.html` correctly.

Environment variable:

| Name | Value |
| --- | --- |
| `VITE_API_URL` | `https://<api-domain>/api` |

Important: Vite inlines environment variables at build time. Set
`VITE_API_URL` before the build, then redeploy after changing it.

Do not set it to `https://<api-domain>` without `/api`.

## 3. Verify the deployed flow

Open the Vercel URL and check:

1. The landing page loads.
2. Open browser DevTools > Network.
3. Create a session. The request URL should be on the API domain.
4. Upload a PDF resume.
5. Extract text.
6. Run detection.
7. Review cards show category, masked value, page, confidence, and Hide/Keep.
8. Save the review plan.
9. Redact the PDF.
10. Download `sanitized-resume.pdf`.

Browser console should not warn about a missing `VITE_API_URL`.

## 4. Local pre-deploy checks

Run from the repository root:

```bash
cd server
npm ci
npm test
```

Expected: 57 pass, 0 fail.

```bash
cd ../client
npm ci
npm test
npm run build
```

Expected: 29 pass, 0 fail, and a successful Vite build into `client/dist`.

## 5. Common deployment errors

| Symptom | Cause | Fix |
| --- | --- | --- |
| Browser calls `https://<vercel-domain>/api/...` and gets HTML or 404 | `VITE_API_URL` was not set when Vercel built the client | Set `VITE_API_URL=https://<api-domain>/api` and redeploy the frontend. |
| CORS error in browser console | `CLIENT_ORIGIN` does not exactly match the Vercel origin | Set it to the exact origin, e.g. `https://resumeshield.vercel.app`. |
| Preview deployment is blocked by CORS | API allows only the production Vercel origin | Use a staging API with the preview origin, or temporarily set `CLIENT_ORIGIN` to that preview URL. |
| `SESSION_EXPIRED` immediately after upload | API restarted, scaled to multiple instances, or several workers are running | Use one API instance. Sessions are in-memory by design. |
| `FILE_TOO_LARGE` on the API host | Reverse proxy limit is below `MAX_UPLOAD_BYTES` | Raise the host/proxy body limit to at least 10 MiB, or lower `MAX_UPLOAD_BYTES`. |
| API fails to install `canvas` or `mupdf` | Node version too old or wrong install directory | Use Node 20+, run `npm ci` inside `server/`. |
| App works locally but not in production | Old Vite build without the API URL | Rebuild/redeploy after setting environment variables. |

## 6. Production notes

- Keep the API on one instance unless session storage is redesigned.
- Do not enable Vercel Functions for the API in this deployment mode.
- `TEMP_ROOT` is cleaned by the session sweeper; it should not be mounted as permanent storage.
- Do not add resume text, file names, detection values, or request bodies to host logs.
- After any backend restart, users must start a new session.
