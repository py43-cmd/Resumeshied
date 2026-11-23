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

## 1. Deploy the API on Render

The repository root contains `render.yaml`. Render uses it as a Blueprint, so
most settings are already defined.

### 1.1 Create the Blueprint

1. Go to <https://dashboard.render.com>.
2. Click **New +** > **Blueprint**.
3. Connect the GitHub account that owns `Resumeshied`.
4. Select the repository.
5. Select branch `main`.
6. Give the Blueprint a name, for example `resumeshield`.
7. Click **Apply**.

Render will create one web service:

| Setting | Value from `render.yaml` |
| --- | --- |
| Service name | `resumeshield-api` |
| Runtime | Node.js 20 |
| Root Directory | `server` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance count | 1 |
| Plan | `1c-2g` |

### 1.2 Set the one required value

Render will prompt for `CLIENT_ORIGIN` because it is marked `sync: false`.

Enter the exact Vercel frontend origin:

```text
https://<your-project>.vercel.app
```

Do not add:

- a path
- a trailing slash
- a wildcard
- `http://` instead of `https://`

Wrong:

```text
https://resumeshield.vercel.app/
https://resumeshield.vercel.app/dashboard
*
```

Right:

```text
https://resumeshield.vercel.app
```

### 1.3 Why the plan matters

Do **not** use the Render Free plan for this service.

Free instances sleep after inactivity. ResumeShield keeps sessions in memory,
so a sleeping/restarting instance destroys active sessions and users will see
`SESSION_EXPIRED`.

The Blueprint uses `1c-2g` and one instance. Keep `numInstances: 1` unless
session storage is redesigned.

Do not attach a persistent disk. Temporary PDF files are intentionally
short-lived.

### 1.4 Environment variables

These are set by `render.yaml`:

| Name | Value | Notes |
| --- | --- | --- |
| `NODE_VERSION` | `20` | Matches the required Node runtime. |
| `NODE_ENV` | `production` | Enables production config checks. |
| `SESSION_TTL_SECONDS` | `1800` | 30 minutes. |
| `MAX_UPLOAD_BYTES` | `10485760` | 10 MiB. |
| `TEMP_ROOT` | `/tmp/resumeshield` | Short-lived processing files only. |
| `LOG_LEVEL` | `info` | Never log resume text, file names, or values. |
| `CLIENT_ORIGIN` | Set in dashboard | Exact Vercel origin. |

Do **not** set `PORT`. Render injects its own `PORT` value and the app reads it.

### 1.5 Verify the API

Wait until Render shows the service as **Live**. Then run:

```bash
curl https://resumeshield-api.onrender.com/api/health
```

Expected: HTTP 200 with `success: true` and `data.status` equal to `"ok"`.

Your real URL may differ. Copy the `onrender.com` URL from the Render service
header.

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
| `VITE_API_URL` | `https://resumeshield-api.onrender.com/api` |

Important: Vite inlines environment variables at build time. Set
`VITE_API_URL` before the build, then redeploy after changing it.

Do not set it to `https://<api-domain>` without `/api`.

Use the real `onrender.com` URL shown in your Render service header. It may not
be exactly `resumeshield-api.onrender.com` if that name is already taken.

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
| `SESSION_EXPIRED` after some idle time on Render | Free instance slept and restarted | Upgrade from Free to the `1c-2g` plan in `render.yaml`. |
| Render deploy stays in "Starting" or fails health check | App is not listening on Render's injected `PORT`, or build used the wrong directory | Leave `PORT` unset, keep Root Directory `server`, and use `npm ci` / `npm start`. |
| `FILE_TOO_LARGE` on the API host | Reverse proxy limit is below `MAX_UPLOAD_BYTES` | Raise the host/proxy body limit to at least 10 MiB, or lower `MAX_UPLOAD_BYTES`. |
| API fails to install `canvas` or `mupdf` | Node version too old or wrong install directory | Use Node 20+, run `npm ci` inside `server/`. |
| App works locally but not in production | Old Vite build without the API URL | Rebuild/redeploy after setting environment variables. |

## 6. Production notes

- Keep the API on one instance unless session storage is redesigned.
- Do not enable Vercel Functions for the API in this deployment mode.
- `TEMP_ROOT` is cleaned by the session sweeper; it should not be mounted as permanent storage.
- Do not add resume text, file names, detection values, or request bodies to host logs.
- After any backend restart, users must start a new session.
