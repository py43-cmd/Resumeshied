import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import * as mupdf from 'mupdf';

import app from '../src/app.js';
import {
  createMultiPagePdf,
  createPdfFromLines,
  createPdfWithLogo,
  createPdfWithVectorIcons,
} from './fixtures/documents.js';

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

test('all common phone formats are permanently removed from the download', async () => {
  const phones = [
    '+91 98765 43210',
    '9876543210',
    '+91-9876543210',
    '+91 9876543210',
    '(555) 123-4567',
    '+1 555-123-4567',
    '020 7946 0958',
  ];
  const SURVIVOR = 'Keep this line visible';

  const sessionResponse = await request(app).post('/api/sessions');
  assert.equal(sessionResponse.status, 201);
  const session = sessionResponse.body.data;
  const upload = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set('X-Session-Token', session.token)
    .attach('file', createPdfFromLines([NAME, ...phones.map((phone) => `Phone: ${phone}`), SURVIVOR]), {
      filename: 'phones.pdf',
      contentType: 'application/pdf',
    });
  assert.equal(upload.status, 201);
  const documentId = upload.body.data.documentId;

  const extraction = await post(session, documentId, '/extract');
  assert.equal(extraction.status, 200);
  const detection = await post(session, documentId, '/detect');
  assert.equal(detection.status, 200);

  const phoneDetections = detection.body.data.detections.filter((item) => item.type === 'PHONE');
  assert.equal(phoneDetections.length, phones.length);
  assert.ok(phoneDetections.every((item) => item.needsReview === false));

  // Simulate the UI: default decisions accept high-confidence regex matches.
  const decisions = Object.fromEntries(
    detection.body.data.detections.map((item) => [item.detectionId, 'accepted']),
  );
  const plan = await putPlan(session, documentId, { decisions, manualRegions: [] });
  assert.equal(plan.status, 200);
  assert.equal(plan.body.data.planStatus, 'ready');

  const redaction = await post(session, documentId, '/redact');
  assert.equal(redaction.status, 201);
  assert.equal(redaction.body.data.verification.privacy.status, 'passed');

  const download = await fetchDownload(session, redaction.body.data.redactionId);
  assert.equal(download.status, 200);
  const output = pageTexts(download.body).join('\n');
  assert.ok(output.includes(SURVIVOR), 'non-PII text must survive');

  const digitSequences = phones.map((phone) => phone.replace(/\D/g, '').slice(-7));
  for (const sequence of digitSequences) {
    assert.equal(output.includes(sequence), false, `phone digits survived: ${sequence}`);
  }
  for (const phone of phones) {
    assert.equal(output.includes(phone), false, `phone survived: ${phone}`);
  }

  await destroy(session);
});

test('hiding a logo permanently removes its pixels from the download', async () => {
  const SURVIVOR = 'Keep this line visible';
  const sessionResponse = await request(app).post('/api/sessions');
  assert.equal(sessionResponse.status, 201);
  const session = sessionResponse.body.data;
  const upload = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set('X-Session-Token', session.token)
    .attach('file', createPdfWithLogo([NAME, SURVIVOR]), {
      filename: 'logo-resume.pdf',
      contentType: 'application/pdf',
    });
  assert.equal(upload.status, 201);
  const documentId = upload.body.data.documentId;

  const extraction = await post(session, documentId, '/extract');
  assert.equal(extraction.status, 200);
  const detection = await post(session, documentId, '/detect');
  assert.equal(detection.status, 200);

  const image = detection.body.data.detections.find((item) => item.type === 'IMAGE');
  assert.ok(image, 'logo image must be detected');

  const decisions = Object.fromEntries(
    detection.body.data.detections.map((item) => [item.detectionId, 'accepted']),
  );
  const plan = await putPlan(session, documentId, { decisions, manualRegions: [] });
  assert.equal(plan.body.data.planStatus, 'ready');

  const redaction = await post(session, documentId, '/redact');
  assert.equal(redaction.status, 201);
  assert.equal(redaction.body.data.verification.privacy.status, 'passed');

  const download = await fetchDownload(session, redaction.body.data.redactionId);
  assert.equal(download.status, 200);
  const text = pageTexts(download.body).join('\n');
  assert.ok(text.includes(SURVIVOR));

  // Render the downloaded page and sample the centre of the old logo area.
  // The blue logo must be gone (white/near-white after redaction).
  const doc = mupdf.Document.openDocument(new Uint8Array(download.body), 'application/pdf');
  try {
    const page = doc.loadPage(0);
    const pix = page.toPixmap(mupdf.Matrix.scale(1, 1), mupdf.ColorSpace.DeviceRGB, false, false);
    const pixels = pix.getPixels();
    const width = pix.getWidth();
    const components = pix.getNumberOfComponents();
    // Logo: x=72..192, y(top-left)=52..92 -> centre (132, 72).
    const offset = (72 * width + 132) * components;
    const [red, green, blue] = [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
    assert.ok(
      red > 200 && green > 200 && blue > 200,
      `logo pixels survived in the download (rgb ${red},${green},${blue})`,
    );
    pix.destroy();
    page.destroy();
  } finally {
    doc.destroy();
  }

  await destroy(session);
});

test('redacts an icon-adjacent phone value while the vector icon survives', async () => {
  const sessionResponse = await request(app).post('/api/sessions');
  assert.equal(sessionResponse.status, 201);
  const session = sessionResponse.body.data;

  const upload = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set('X-Session-Token', session.token)
    .attach(
      'file',
      createPdfWithVectorIcons([
        [
          { text: PHONE, x: 72, y: 720 },
          { text: 'Software Engineer', x: 72, y: 680, icon: false },
        ],
      ]),
      { filename: 'icon-contact.pdf', contentType: 'application/pdf' },
    );
  assert.equal(upload.status, 201);
  const documentId = upload.body.data.documentId;

  assert.equal((await post(session, documentId, '/extract')).status, 200);
  const detection = await post(session, documentId, '/detect');
  assert.equal(detection.status, 200);

  const phone = detection.body.data.detections.find((item) => item.type === 'PHONE');
  assert.ok(phone, 'icon-adjacent phone must be detected');
  assert.equal(phone.iconContext, 'near-icon');

  const decisions = Object.fromEntries(
    detection.body.data.detections.map((item) => [
      item.detectionId,
      item.type === 'PHONE' ? 'accepted' : 'rejected',
    ]),
  );
  const plan = await putPlan(session, documentId, { decisions, manualRegions: [] });
  assert.equal(plan.body.data.planStatus, 'ready');

  const redaction = await post(session, documentId, '/redact');
  assert.equal(redaction.status, 201);
  assert.equal(redaction.body.data.verification.privacy.status, 'passed');

  const download = await fetchDownload(session, redaction.body.data.redactionId);
  assert.equal(download.status, 200);
  assert.equal(pageTexts(download.body).join('\n').includes(PHONE), false);

  const doc = mupdf.Document.openDocument(new Uint8Array(download.body), 'application/pdf');
  try {
    const page = doc.loadPage(0);
    const pix = page.toPixmap(mupdf.Matrix.scale(1, 1), mupdf.ColorSpace.DeviceRGB, false, false);
    const pixels = pix.getPixels();
    const width = pix.getWidth();
    const components = pix.getNumberOfComponents();
    const sample = (x, y) => {
      const offset = (y * width + x) * components;
      return [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
    };

    // Icon rect is x=54..64, top-left y=64..74 -> centre (59, 69).
    const [red, green, blue] = sample(59, 69);
    assert.ok(blue > 180 && red < 80 && green < 80, `icon was removed (rgb ${red},${green},${blue})`);

    // The value's area is clear after permanent redaction.
    const cleared = sample(110, 66);
    assert.ok(
      cleared.every((channel) => channel > 200),
      `phone area was not cleared (rgb ${cleared.join(',')})`,
    );

    pix.destroy();
    page.destroy();
  } finally {
    doc.destroy();
  }

  await destroy(session);
});

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
