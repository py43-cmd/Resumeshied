import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import * as mupdf from 'mupdf';

import app from '../src/app.js';
import { createMultiPagePdf } from './fixtures/documents.js';

const NAME = 'Rahul Sharma';
const EMAIL = 'rahul.sharma@example.com';
const PHONE = '+91 98765 43210';
const LINKEDIN = 'linkedin.com/in/rahul-sharma';
const SURVIVOR_PAGE_1 = 'Keep this line visible';
const SURVIVOR_PAGE_2 = 'Another survivor line';
const SECRETS = [NAME, EMAIL, PHONE, LINKEDIN];

const DOCUMENT = createMultiPagePdf([
  [NAME, EMAIL, SURVIVOR_PAGE_1],
  [PHONE, LINKEDIN, SURVIVOR_PAGE_2],
]);

async function uploadDocument() {
  const sessionResponse = await request(app).post('/api/sessions');
  assert.equal(sessionResponse.status, 201);
  const session = sessionResponse.body.data;

  const uploadResponse = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set('X-Session-Token', session.token)
    .attach('file', DOCUMENT, { filename: 'multi-page-resume.pdf', contentType: 'application/pdf' });
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

function downloadUrl(session, redactionId) {
  return `/api/sessions/${session.sessionId}/redactions/${redactionId}/download`;
}

function fetchDownload(session, redactionId) {
  return request(app).get(downloadUrl(session, redactionId)).set('X-Session-Token', session.token);
}

async function destroy(session) {
  await request(app).delete(`/api/sessions/${session.sessionId}`).set('X-Session-Token', session.token);
}

function assertNoSecrets(value, label) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  for (const secret of SECRETS) {
    assert.equal(serialized.includes(secret), false, `${label} leaked ${secret}`);
  }
}

function pageTexts(pdfBytes) {
  const doc = mupdf.Document.openDocument(new Uint8Array(pdfBytes), 'application/pdf');
  try {
    const texts = [];
    for (let index = 0; index < doc.countPages(); index += 1) {
      const page = doc.loadPage(index);
      try {
        texts.push(page.toStructuredText('preserve-whitespace').asText());
      } finally {
        page.destroy();
      }
    }
    return texts;
  } finally {
    doc.destroy();
  }
}

test('full pipeline: multi-page upload to private redacted download', async () => {
  const { session, document } = await uploadDocument();

  const extraction = await post(session, document.documentId, '/extract');
  assert.equal(extraction.status, 200);
  assert.equal(extraction.body.data.extraction.pageCount, 2);
  assert.equal(extraction.body.data.extraction.pageGeometry.length, 2);
  assertNoSecrets(extraction.body, 'extraction response');

  const detection = await post(session, document.documentId, '/detect');
  assert.equal(detection.status, 200);
  const detections = detection.body.data.detections;
  assert.ok(detections.length >= 4);

  for (const type of ['NAME', 'EMAIL', 'PHONE', 'LINKEDIN']) {
    assert.ok(detections.some((item) => item.type === type), `missing ${type}`);
  }
  assert.equal(detections.find((item) => item.type === 'EMAIL').pageNumber, 1);
  assert.equal(detections.find((item) => item.type === 'PHONE').pageNumber, 2);
  assertNoSecrets(detection.body, 'detection response');

  const decisions = Object.fromEntries(detections.map((item) => [item.detectionId, 'accepted']));
  const plan = await putPlan(session, document.documentId, { decisions, manualRegions: [] });
  assert.equal(plan.status, 200);
  assert.equal(plan.body.data.planStatus, 'ready');
  assertNoSecrets(plan.body, 'plan response');

  const redaction = await post(session, document.documentId, '/redact');
  assert.equal(redaction.status, 201);
  const result = redaction.body.data;
  assert.equal(result.pageCount, 2);
  assert.equal(result.verification.privacy.status, 'passed');
  assert.ok(result.verification.privacy.checkedBoxCount >= 4);
  assertNoSecrets(redaction.body, 'redaction response');

  const download = await fetchDownload(session, result.redactionId);
  assert.equal(download.status, 200);
  assert.equal(download.headers['cache-control'], 'no-store');

  const texts = pageTexts(download.body);
  assert.equal(texts.length, 2);
  assert.equal(texts[0].includes(SURVIVOR_PAGE_1), true);
  assert.equal(texts[1].includes(SURVIVOR_PAGE_2), true);
  for (const text of texts) assertNoSecrets(text, 'downloaded text');
  assertNoSecrets(download.body.toString('latin1'), 'downloaded bytes');

  await destroy(session);

  const afterDestroy = await fetchDownload(session, result.redactionId);
  assert.equal(afterDestroy.status, 404);
  assert.equal(afterDestroy.body.error.code, 'SESSION_NOT_FOUND');
});

test('a stored download is blocked if the plan becomes blocked afterwards', async () => {
  const { session, document } = await uploadDocument();

  await post(session, document.documentId, '/extract');
  const detection = await post(session, document.documentId, '/detect');
  const detections = detection.body.data.detections;

  const allDecisions = Object.fromEntries(
    detections.map((item) => [item.detectionId, 'accepted']),
  );
  const readyPlan = await putPlan(session, document.documentId, {
    decisions: allDecisions,
    manualRegions: [],
  });
  assert.equal(readyPlan.body.data.planStatus, 'ready');

  const redaction = await post(session, document.documentId, '/redact');
  assert.equal(redaction.status, 201);

  // Replace the plan with one that leaves a needsReview detection undecided.
  const partialDecisions = Object.fromEntries(
    detections.filter((item) => !item.needsReview).map((item) => [item.detectionId, 'accepted']),
  );
  const blockedPlan = await putPlan(session, document.documentId, {
    decisions: partialDecisions,
    manualRegions: [],
  });
  assert.equal(blockedPlan.body.data.planStatus, 'blocked');

  const download = await fetchDownload(session, redaction.body.data.redactionId);
  assert.equal(download.status, 422);
  assert.equal(download.body.error.code, 'PRIVACY_BLOCKERS');

  await destroy(session);
});
