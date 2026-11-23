import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.js';
import { createPdfFromLines } from './fixtures/documents.js';

const NAME = 'Rahul Sharma';
const EMAIL = 'rahul.sharma@example.com';
const LINES = [NAME, EMAIL, 'Phone: +91 98765 43210'];

async function upload(buffer) {
  const sessionResponse = await request(app).post('/api/sessions');
  assert.equal(sessionResponse.status, 201);
  const session = sessionResponse.body.data;

  const uploadResponse = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set('X-Session-Token', session.token)
    .attach('file', buffer, {
      filename: 'resume.pdf',
      contentType: 'application/pdf',
    });

  assert.equal(uploadResponse.status, 201);
  return { session, document: uploadResponse.body.data };
}

function endpoint(session, documentId, path) {
  return request(app)
    .get(`/api/sessions/${session.sessionId}/documents/${documentId}${path}`)
    .set('X-Session-Token', session.token);
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

async function prepare(buffer = createPdfFromLines(LINES)) {
  const uploaded = await upload(buffer);
  const extraction = await post(uploaded.session, uploaded.document.documentId, '/extract');
  assert.equal(extraction.status, 200);
  const detections = await post(uploaded.session, uploaded.document.documentId, '/detect');
  assert.equal(detections.status, 200);
  return { ...uploaded, detections: detections.body.data };
}

test('renders an original PDF page as a private PNG preview', async () => {
  const { session, document } = await prepare();

  const response = await endpoint(session, document.documentId, '/pages/1/preview?scale=1');

  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /image\/png/);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.ok(response.body.length > 100);
  assert.equal(response.body.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

  await destroy(session);
});

test('saves a privacy-safe redaction plan with detection and manual boxes', async () => {
  const { session, document, detections } = await prepare();

  const decisions = Object.fromEntries(
    detections.detections.map((detection) => [detection.detectionId, 'accepted']),
  );
  const payload = {
    decisions,
    manualRegions: [
      { pageNumber: 1, bbox: { x: 100, y: 100, width: 80, height: 24 } },
    ],
  };

  const response = await putPlan(session, document.documentId, payload);
  assert.equal(response.status, 200);

  const saved = response.body.data;
  assert.equal(saved.planStatus, 'ready');
  assert.equal(saved.plan.status, 'ready');
  assert.equal(saved.plan.itemCount, detections.detectionCount + 1);
  assert.deepEqual(saved.plan.privacyBlockers, []);
  assert.ok(saved.plan.items.some((item) => item.source === 'manual'));

  for (const item of saved.plan.items) {
    assert.ok(item.bboxes.length > 0);
    for (const box of item.bboxes) {
      assert.ok(box.width > 0 && box.height > 0);
    }
  }

  const body = JSON.stringify(response.body);
  for (const secret of [NAME, EMAIL, '98765 43210']) {
    assert.equal(body.includes(secret), false, `plan leaked ${secret}`);
  }

  const cached = await endpoint(session, document.documentId, '/redaction-plan');
  assert.equal(cached.status, 200);
  assert.equal(cached.body.data.plan.planId, saved.plan.planId);

  await destroy(session);
});

test('marks a plan blocked when a needsReview detection has no decision', async () => {
  const { session, document, detections } = await prepare(createPdfFromLines([NAME, EMAIL]));

  const email = detections.detections.find((detection) => detection.type === 'EMAIL');
  const response = await putPlan(session, document.documentId, {
    decisions: { [email.detectionId]: 'accepted' },
    manualRegions: [],
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.planStatus, 'blocked');
  assert.ok(response.body.data.plan.privacyBlockers.includes('REVIEW_INCOMPLETE'));

  await destroy(session);
});

test('rejects manual regions outside the page', async () => {
  const { session, document, detections } = await prepare();

  const decisions = Object.fromEntries(
    detections.detections.map((detection) => [detection.detectionId, 'accepted']),
  );
  const response = await putPlan(session, document.documentId, {
    decisions,
    manualRegions: [
      { pageNumber: 1, bbox: { x: 600, y: 100, width: 80, height: 24 } },
    ],
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_BBOX');

  await destroy(session);
});
