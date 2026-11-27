import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import * as mupdf from 'mupdf';

import app from '../src/app.js';
import { createPdfFromLines, createMinimalDocx } from './fixtures/documents.js';

const NAME = 'Rahul Sharma';
const EMAIL = 'rahul.sharma@example.com';
const SURVIVOR = 'Keep this line visible';
const LINES = [NAME, EMAIL, SURVIVOR];

async function upload(buffer, filename = 'resume.pdf', contentType = 'application/pdf') {
  const sessionResponse = await request(app).post('/api/sessions');
  assert.equal(sessionResponse.status, 201);
  const session = sessionResponse.body.data;

  const uploadResponse = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set('X-Session-Token', session.token)
    .attach('file', buffer, { filename, contentType });

  assert.equal(uploadResponse.status, 201);
  return { session, document: uploadResponse.body.data };
}

function post(session, documentId, path) {
  return request(app)
    .post(`/api/sessions/${session.sessionId}/documents/${documentId}${path}`)
    .set('X-Session-Token', session.token);
}

function putPlan(session, documentId, payload) {
  return request(app)
    .put(`/api/sessions/${session.sessionId}/documents/${documentId}/redaction-plan`)
    .set('X-Session-Token', session.token)
    .send(payload);
}

async function destroy(session) {
  await request(app)
    .delete(`/api/sessions/${session.sessionId}`)
    .set('X-Session-Token', session.token);
}

async function prepare(buffer, filename, contentType) {
  const uploaded = await upload(buffer, filename, contentType);
  const extraction = await post(uploaded.session, uploaded.document.documentId, '/extract');
  assert.equal(extraction.status, 200);

  const detections = await post(uploaded.session, uploaded.document.documentId, '/detect');
  assert.equal(detections.status, 200);

  return { ...uploaded, extraction: extraction.body.data, detections: detections.body.data };
}

function acceptedDecisions(detections) {
  return Object.fromEntries(
    detections.detections.map((detection) => [detection.detectionId, 'accepted']),
  );
}

function extractText(pdfBytes) {
  const doc = mupdf.Document.openDocument(new Uint8Array(pdfBytes), 'application/pdf');
  try {
    return doc.loadPage(0).toStructuredText('preserve-whitespace').asText();
  } finally {
    doc.destroy();
  }
}

/** Sample one rendered pixel: bbox coordinates are top-left PDF points. */
function samplePixel(pdfBytes, x, y) {
  const doc = mupdf.Document.openDocument(new Uint8Array(pdfBytes), 'application/pdf');
  try {
    const page = doc.loadPage(0);
    const pix = page.toPixmap(
      mupdf.Matrix.scale(1, 1),
      mupdf.ColorSpace.DeviceRGB,
      false,
      false,
    );
    const width = pix.getWidth();
    const components = pix.getNumberOfComponents();
    const pixels = pix.getPixels();
    const offset = (Math.floor(y) * width + Math.floor(x)) * components;
    const rgb = [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
    pix.destroy();
    page.destroy();
    return rgb;
  } finally {
    doc.destroy();
  }
}

test('creates a permanently redacted PDF and downloads it privately', async () => {
  const { session, document, detections } = await prepare(createPdfFromLines(LINES));

  const plan = await putPlan(session, document.documentId, {
    decisions: acceptedDecisions(detections),
    manualRegions: [],
  });
  assert.equal(plan.body.data.planStatus, 'ready');

  const redact = await post(session, document.documentId, '/redact');
  assert.equal(redact.status, 201);
  const result = redact.body.data;
  assert.equal(result.documentId, document.documentId);
  assert.equal(result.pageCount, 1);
  assert.ok(result.redactedBoxCount > 0);
  assert.equal(result.verification.privacy.status, 'passed');
  assert.ok(result.verification.privacy.checkedBoxCount > 0);
  assert.equal(result.verification.privacy.failedBoxCount, 0);
  assert.equal(result.verification.fidelity.status, 'passed');

  const download = await request(app)
    .get(`/api/sessions/${session.sessionId}/redactions/${result.redactionId}/download`)
    .set('X-Session-Token', session.token);

  assert.equal(download.status, 200);
  assert.match(download.headers['content-type'], /application\/pdf/);
  assert.match(download.headers['content-disposition'], /attachment; filename="sanitized-resume.pdf"/);
  assert.equal(download.headers['cache-control'], 'no-store');
  assert.equal(download.body.subarray(0, 5).toString(), '%PDF-');

  const text = extractText(download.body);
  assert.equal(text.includes(NAME), false);
  assert.equal(text.includes(EMAIL), false);
  assert.equal(text.includes(SURVIVOR), true);

  const rawBytes = download.body.toString('latin1');
  assert.equal(rawBytes.includes(NAME), false);
  assert.equal(rawBytes.includes(EMAIL), false);

  // The approved box is painted solid black in the downloaded PDF, not white
  // or a transparent overlay. Sampling the detection box keeps this tied to
  // the real coordinates rather than a hard-coded pixel location.
  const nameBox = detections.detections.find((item) => item.type === 'NAME')?.bboxes?.[0];
  assert.ok(nameBox, 'the name detection must carry a page coordinate');
  const centerX = nameBox.x + nameBox.width / 2;
  const centerY = nameBox.y + nameBox.height / 2;
  const fill = samplePixel(download.body, centerX, centerY);
  assert.ok(
    fill.every((channel) => channel <= 10),
    `redaction fill must be solid black (rgb ${fill.join(',')})`,
  );

  await destroy(session);
});

test('blocks redaction when the saved plan has privacy blockers', async () => {
  const { session, document, detections } = await prepare(createPdfFromLines([NAME, EMAIL]));

  const email = detections.detections.find((detection) => detection.type === 'EMAIL');
  const plan = await putPlan(session, document.documentId, {
    decisions: { [email.detectionId]: 'accepted' },
    manualRegions: [],
  });
  assert.equal(plan.body.data.planStatus, 'blocked');

  const redact = await post(session, document.documentId, '/redact');
  assert.equal(redact.status, 422);
  assert.equal(redact.body.error.code, 'PRIVACY_BLOCKERS');

  await destroy(session);
});

test('rejects redaction before a plan is saved', async () => {
  const { session, document } = await prepare(createPdfFromLines([NAME, SURVIVOR]));

  const redact = await post(session, document.documentId, '/redact');
  assert.equal(redact.status, 422);
  assert.equal(redact.body.error.code, 'PLAN_NOT_READY');

  await destroy(session);
});

test('rejects non-PDF documents with an honest error', async () => {
  const { session, document } = await prepare(
    await createMinimalDocx(NAME),
    'resume.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );

  const redact = await post(session, document.documentId, '/redact');
  assert.equal(redact.status, 422);
  assert.equal(redact.body.error.code, 'PDF_REQUIRED');

  await destroy(session);
});

test('a download cannot be retrieved without a valid session token', async () => {
  const { session, document, detections } = await prepare(createPdfFromLines(LINES));
  await putPlan(session, document.documentId, {
    decisions: acceptedDecisions(detections),
    manualRegions: [],
  });
  const created = await post(session, document.documentId, '/redact');
  assert.equal(created.status, 201);

  const download = await request(app).get(
    `/api/sessions/${session.sessionId}/redactions/${created.body.data.redactionId}/download`,
  );
  assert.equal(download.status, 401);
  assert.equal(download.body.error.code, 'SESSION_TOKEN_REQUIRED');

  await destroy(session);
});

test('blocks a plan with no approved redaction areas', async () => {
  const { session, document, detections } = await prepare(createPdfFromLines(LINES));
  const decisions = Object.fromEntries(
    detections.detections.map((detection) => [detection.detectionId, 'rejected']),
  );

  const plan = await putPlan(session, document.documentId, { decisions, manualRegions: [] });
  assert.equal(plan.status, 200);
  assert.equal(plan.body.data.planStatus, 'blocked');
  assert.ok(plan.body.data.plan.privacyBlockers.includes('NO_REDACTIONS_REQUESTED'));

  await destroy(session);
});

test('blocks a stored download when the review plan changes', async () => {
  const { session, document, detections } = await prepare(createPdfFromLines(LINES));

  const accepted = await putPlan(session, document.documentId, {
    decisions: acceptedDecisions(detections),
    manualRegions: [],
  });
  assert.equal(accepted.body.data.planStatus, 'ready');

  const created = await post(session, document.documentId, '/redact');
  assert.equal(created.status, 201);

  const changed = await putPlan(session, document.documentId, {
    decisions: acceptedDecisions(detections),
    manualRegions: [],
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.data.planStatus, 'ready');
  assert.notEqual(changed.body.data.plan.planId, accepted.body.data.plan.planId);

  const download = await request(app)
    .get(`/api/sessions/${session.sessionId}/redactions/${created.body.data.redactionId}/download`)
    .set('X-Session-Token', session.token);
  assert.equal(download.status, 409);
  assert.equal(download.body.error.code, 'REDACTION_STALE');

  await destroy(session);
});
