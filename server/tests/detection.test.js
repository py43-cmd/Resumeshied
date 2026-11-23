import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.js';
import {
  createMinimalDocx,
  createMinimalPdf,
  createPdfFromLines,
  createPdfWithLogo,
  createPdfWithUnicodeIcons,
  createPdfWithVectorIcons,
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

test('re-running detection reuses stable IDs from a ready result', async () => {
  const { session, document } = await upload(
    createPdfFromLines(RESUME_LINES),
    'resume.pdf',
    'application/pdf',
  );
  await extract(session, document.documentId);

  const first = await detect(session, document.documentId);
  assert.equal(first.status, 200);
  const second = await detect(session, document.documentId);
  assert.equal(second.status, 200);

  const firstIds = first.body.data.detections.map((item) => item.detectionId).sort();
  const secondIds = second.body.data.detections.map((item) => item.detectionId).sort();
  assert.deepEqual(secondIds, firstIds);
  assert.ok(firstIds.length > 0);

  await destroy(session);
});

test('detects unlabelled contact values with no field labels present', async () => {
  const { session, document } = await upload(
    createPdfFromLines([
      'Rahul Sharma',
      '+91 9876543210',
      'rahul@gmail.com',
      'linkedin.com/in/rahul',
      'github.com/rahul',
      'Delhi, India',
      'rahul.dev',
    ]),
    'unlabelled.pdf',
    'application/pdf',
  );
  await extract(session, document.documentId);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);
  const types = response.body.data.detections.map((item) => item.type);
  for (const expected of ['PHONE', 'EMAIL', 'LINKEDIN', 'GITHUB']) {
    assert.ok(types.includes(expected), `missing ${expected} without a text label`);
  }

  await destroy(session);
});

test('detects every common phone format and accepts them by default', async () => {
  const phones = [
    '+91 98765 43210',
    '9876543210',
    '+91-9876543210',
    '+91 9876543210',
    '(555) 123-4567',
    '+1 555-123-4567',
    '020 7946 0958',
  ];
  const { session, document } = await upload(
    createPdfFromLines(['Rahul Sharma', ...phones.map((phone) => `Phone: ${phone}`)]),
    'phones.pdf',
    'application/pdf',
  );
  await extract(session, document.documentId);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);

  const detected = response.body.data.detections.filter((item) => item.type === 'PHONE');
  assert.equal(
    detected.length,
    phones.length,
    `expected ${phones.length} phone detections, got ${detected.length}`,
  );
  for (const detection of detected) {
    assert.equal(detection.needsReview, false, 'valid phones should be redacted by default');
    assert.equal(detection.maskedValue.includes('98765'), false);
    assert.equal(detection.maskedValue.includes('123-4567'), false);
  }

  await destroy(session);
});

test('detects images as confirm-required matches with their page position', async () => {
  const { session, document } = await upload(
    createPdfWithLogo(['Rahul Sharma', 'Keep this line']),
    'resume-with-logo.pdf',
    'application/pdf',
  );
  await extract(session, document.documentId);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);

  const images = response.body.data.detections.filter((item) => item.type === 'IMAGE');
  assert.equal(images.length, 1);
  assert.equal(images[0].pageNumber, 1);
  assert.equal(images[0].method, 'image');
  assert.equal(images[0].needsReview, true);
  assert.equal(images[0].maskedValue, '[image]');
  assert.equal(images[0].bboxes.length, 1);
  assert.ok(images[0].bboxes[0].width > 0);
  assert.ok(images[0].bboxes[0].height > 0);

  await destroy(session);
});

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

test('detects unlabelled contact values beside Unicode icons without covering the glyphs', async () => {
  const PHONE_VALUE = '+91 9876543210';
  const EMAIL_VALUE = 'rahul@gmail.com';
  const LOCATION_VALUE = 'Delhi, India';
  const WEBSITE_VALUE = 'rahul.dev';
  const { session, document } = await upload(
    createPdfWithUnicodeIcons([
      { glyph: 'phone', text: PHONE_VALUE },
      { glyph: 'email', text: EMAIL_VALUE },
      { glyph: 'location', text: LOCATION_VALUE },
      { glyph: 'website', text: WEBSITE_VALUE },
      { glyph: 'link', text: 'https://rahul.dev' },
    ]),
    'unicode-icons.pdf',
    'application/pdf',
  );
  await extract(session, document.documentId);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);
  const result = response.body.data;
  const types = result.detections.map((item) => item.type);
  for (const expected of ['PHONE', 'EMAIL', 'LOCATION', 'URL']) {
    assert.ok(types.includes(expected), `missing ${expected} beside a Unicode icon`);
  }

  const contexts = new Map(result.detections.map((item) => [item.type, item.iconContext]));
  assert.equal(contexts.get('PHONE'), 'phone');
  assert.equal(contexts.get('EMAIL'), 'email');
  assert.equal(contexts.get('LOCATION'), 'location');
  assert.equal(contexts.get('URL'), 'website');

  for (const detection of result.detections) {
    assert.ok(
      detection.bboxes.every((box) => box.x >= 86),
      `${detection.type} redaction box overlaps the icon glyph area`,
    );
  }

  const body = JSON.stringify(response.body);
  for (const secret of [PHONE_VALUE, EMAIL_VALUE, LOCATION_VALUE, WEBSITE_VALUE]) {
    assert.equal(body.includes(secret), false, `raw value leaked: ${secret}`);
  }

  await destroy(session);
});

test('handles multiple contact icons on one line without mixing their values', async () => {
  const { session, document } = await upload(
    createPdfWithUnicodeIcons([
      { glyph: 'phone', text: '+91 9876543210', x: 72, y: 720 },
      { glyph: 'email', text: 'rahul@gmail.com', x: 320, y: 720 },
    ]),
    'two-icons-one-line.pdf',
    'application/pdf',
  );
  await extract(session, document.documentId);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);
  const phone = response.body.data.detections.find((item) => item.type === 'PHONE');
  const email = response.body.data.detections.find((item) => item.type === 'EMAIL');
  assert.ok(phone && email);
  assert.equal(phone.iconContext, 'phone');
  assert.equal(email.iconContext, 'email');
  assert.ok(phone.bboxes[0].x < 200, 'phone box stays in the left column');
  assert.ok(email.bboxes[0].x > 300, 'email box stays in the right column');

  await destroy(session);
});

test('associates vector icons in two-column and multi-page layouts', async () => {
  const { session, document } = await upload(
    createPdfWithVectorIcons([
      [
        { text: '+91 9876543210', x: 72, y: 720 },
        { text: 'rahul@gmail.com', x: 320, y: 720 },
        { text: 'github.com/rahul', x: 320, y: 690 },
      ],
      [{ text: 'linkedin.com/in/rahul', x: 72, y: 720 }],
    ]),
    'vector-icons.pdf',
    'application/pdf',
  );
  await extract(session, document.documentId);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);
  const detections = response.body.data.detections;

  for (const detection of detections) {
    assert.equal(detection.iconContext, 'near-icon');
    assert.deepEqual(detection.iconContextSources, ['vector']);
  }
  assert.deepEqual(
    detections.filter((item) => item.pageNumber === 1).map((item) => item.type).sort(),
    ['EMAIL', 'GITHUB', 'PHONE'],
  );
  assert.deepEqual(
    detections.filter((item) => item.pageNumber === 2).map((item) => item.type),
    ['LINKEDIN'],
  );
  assert.ok(detections.find((item) => item.type === 'EMAIL').bboxes[0].x > 300);
  assert.ok(detections.find((item) => item.type === 'PHONE').bboxes[0].x < 200);

  await destroy(session);
});

test('does not attach icon hints to values far from decorative icons', async () => {
  const { session, document } = await upload(
    createPdfWithVectorIcons([
      [
        { text: 'rahul@gmail.com', x: 72, y: 720, icon: false },
        { text: 'Decorative only', x: 480, y: 300, icon: true, iconX: 470 },
      ],
    ]),
    'false-positive-icon.pdf',
    'application/pdf',
  );
  await extract(session, document.documentId);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);
  const email = response.body.data.detections.find((item) => item.type === 'EMAIL');
  assert.ok(email, 'email must still be detected without an icon');
  assert.equal(email.iconContext, undefined);

  await destroy(session);
});

test('detects protocol-less websites and locations without labels', async () => {
  const { session, document } = await upload(
    createPdfFromLines([
      'Rahul Sharma',
      'rahul.dev',
      'https://rahul.dev/portfolio',
      'Delhi, India',
      'San Francisco, CA',
      'v1.2.3',
      '192.168.1.1',
    ]),
    'bare-urls-and-locations.pdf',
    'application/pdf',
  );
  await extract(session, document.documentId);

  const response = await detect(session, document.documentId);
  assert.equal(response.status, 200);
  const detections = response.body.data.detections;
  const urls = detections.filter((item) => item.type === 'URL');
  const locations = detections.filter((item) => item.type === 'LOCATION');

  assert.equal(urls.length, 2, 'both prefixed and protocol-less URLs are detected');
  assert.equal(locations.length, 2, 'both city/country and city/state are detected');
  assert.ok(urls.every((item) => item.maskedValue.includes('.dev')));
  assert.ok(locations.every((item) => item.needsReview === true));
  assert.equal(detections.some((item) => item.type === 'PHONE'), false, 'IP/version are not phones');

  await destroy(session);
});
