import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.js';
import {
  createMinimalDocx,
  createMinimalPdf,
  createPdfFromLines,
  createTextlessPdf,
} from './fixtures/documents.js';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const EMAIL = 'rahul.sharma@example.com';
const NAME = 'Rahul Sharma';
const PHONE = '+91 98765 43210';
const LINKEDIN_SLUG = 'rahul-sharma';

const RESUME_LINES = [
  NAME,
  EMAIL,
  `Phone: ${PHONE}`,
  `LinkedIn: linkedin.com/in/${LINKEDIN_SLUG}`,
  'DOB: 14/03/1992',
];

async function upload(buffer, filename, contentType) {
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

function extract(session, documentId) {
  return request(app)
    .post(`/api/sessions/${session.sessionId}/documents/${documentId}/extract`)
    .set('X-Session-Token', session.token);
}

function detect(session, documentId) {
  return request(app)
    .post(`/api/sessions/${session.sessionId}/documents/${documentId}/detect`)
    .set('X-Session-Token', session.token);
}

function getDetections(session, documentId) {
  return request(app)
    .get(`/api/sessions/${session.sessionId}/documents/${documentId}/detections`)
    .set('X-Session-Token', session.token);
}

async function destroy(session) {
  await request(app)
    .delete(`/api/sessions/${session.sessionId}`)
    .set('X-Session-Token', session.token);
}

test('detects PII with masked values and page-accurate bboxes', async () => {
  const { session, document } = await upload(
    createPdfFromLines(RESUME_LINES),
    'resume.pdf',
    'application/pdf',
  );

  const extractionResponse = await extract(session, document.documentId);
  assert.equal(extractionResponse.status, 200);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);

  const result = response.body.data;
  assert.equal(result.detectionStatus, 'ready');
  assert.ok(result.detectionCount >= 5);

  const types = result.detections.map((detection) => detection.type);
  for (const expected of ['NAME', 'EMAIL', 'PHONE', 'LINKEDIN', 'DOB']) {
    assert.ok(types.includes(expected), `missing ${expected} detection`);
  }

  for (const detection of result.detections) {
    assert.equal(detection.pageNumber, 1);
    assert.equal(detection.bboxes.length, 1);
    assert.equal(detection.bboxes[0].x, 72);
    assert.ok(detection.bboxes[0].y > 0);
    assert.ok(detection.bboxes[0].width > 0);
    assert.ok(detection.confidence > 0 && detection.confidence <= 1);
  }

  const email = result.detections.find((detection) => detection.type === 'EMAIL');
  assert.equal(email.method, 'regex');
  assert.equal(email.needsReview, false);
  assert.equal(email.maskedValue.includes(EMAIL), false);

  const name = result.detections.find((detection) => detection.type === 'NAME');
  assert.equal(name.method, 'heuristic');
  assert.equal(name.needsReview, true);
  assert.equal(name.maskedValue.includes(NAME), false);

  const body = JSON.stringify(response.body);
  for (const secret of [NAME, EMAIL, PHONE, LINKEDIN_SLUG, '14/03/1992']) {
    assert.equal(body.includes(secret), false, `raw value leaked: ${secret}`);
  }

  const cached = await getDetections(session, document.documentId);
  assert.equal(cached.status, 200);
  assert.equal(cached.body.data.detectionCount, result.detectionCount);

  await destroy(session);
});

test('reports needs_ocr instead of inventing detections for a scanned PDF', async () => {
  const { session, document } = await upload(
    createTextlessPdf(),
    'scanned.pdf',
    'application/pdf',
  );

  const extractionResponse = await extract(session, document.documentId);
  assert.equal(extractionResponse.status, 200);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.detectionStatus, 'needs_ocr');
  assert.equal(response.body.data.detectionCount, 0);
  assert.ok(response.body.data.warnings.includes('OCR_REQUIRED'));

  await destroy(session);
});

test('detects DOCX text but clearly reports missing coordinates', async () => {
  const { session, document } = await upload(
    await createMinimalDocx(`${NAME}\n${EMAIL}`),
    'resume.docx',
    DOCX_MIME,
  );

  const extractionResponse = await extract(session, document.documentId);
  assert.equal(extractionResponse.status, 200);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);

  const result = response.body.data;
  assert.equal(result.detectionStatus, 'ready');
  assert.ok(result.detectionCount >= 2);
  assert.ok(result.warnings.includes('DETECTIONS_WITHOUT_COORDINATES'));

  for (const detection of result.detections) {
    assert.equal(detection.pageNumber, null);
    assert.deepEqual(detection.bboxes, []);
    assert.equal(detection.needsReview, true);
  }

  assert.equal(JSON.stringify(response.body).includes(EMAIL), false);

  await destroy(session);
});

test('requires extraction before detection and exposes a pending state', async () => {
  const { session, document } = await upload(
    createMinimalPdf('Hello World'),
    'resume.pdf',
    'application/pdf',
  );

  const pending = await getDetections(session, document.documentId);
  assert.equal(pending.status, 200);
  assert.equal(pending.body.data.detectionStatus, 'pending');

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'EXTRACTION_REQUIRED');

  await destroy(session);
});
