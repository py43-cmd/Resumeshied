# ResumeShield

Privacy-first tool for removing personal information from resumes before sharing
them for feedback.

## Status

- [x] Phase 1 — Product planning
- [x] Phase 2 — UI/UX design + visual-preservation addendum
- [ ] Phase 3A — Backend foundation (this step)
- [ ] Phase 3B — Frontend foundation
- [ ] Phase 4 — Upload and extraction
- [ ] Phase 5 — PII detection (including local OCR)
- [ ] Phase 6 — Privacy editor
- [ ] Phase 7 — Native PDF redaction
- [ ] Phase 8 — Verification and visual QA
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

## Privacy rules for contributors

1. Never log resume text, file names, detection values, or request bodies.
2. Never store uploaded files outside a per-session temporary directory.
3. Never send resume content to an external API.
4. Never cover text with a rectangle and call it redaction.
