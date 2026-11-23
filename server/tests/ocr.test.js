import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.js';
import { createMinimalPdf, createScannedPdf } from './fixtures/documents.js';

const NAME = 'Rahul Sharma';
const EMAIL = 'rahul.sharma@example.com';
const PHONE = '+91 98765 43210';
const SCAN_LINES = [NAME, EMAIL, `Phone: ${PHONE}`];

async function upload(buffer) {
  const sessionResponse = await request(app).post('/api/sessions');
  assert.equal(sessionResponse.status, 201);
  const session = sessionResponse.body.data;

  const uploadResponse = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set('X-Session-Token', session.token)
    .attach('file', buffer, {
      filename: 'scanned-resume.pdf',
      contentType: 'application/pdf',
    });

  assert.equal(uploadResponse.status, 201);
  return { session, document: uploadResponse.body.data };
}

function post(session, documentId, action) {
  return request(app)
    .post(`/api/sessions/${session.sessionId}/documents/${documentId}/${action}`)
    .set('X-Session-Token', session.token);
}

async function destroy(session) {
  await request(app)
    .delete(`/api/sessions/${session.sessionId}`)
    .set('X-Session-Token', session.token);
}

test('OCRs an image-only PDF with local data, then detects PII with mandatory review', async () => {
  const { session, document } = await upload(createScannedPdf(SCAN_LINES));

  const extractionResponse = await post(session, document.documentId, 'extract');
  assert.equal(extractionResponse.status, 200);
  assert.equal(extractionResponse.body.data.extraction.status, 'needs_ocr');

  const ocrResponse = await post(session, document.documentId, 'ocr');
  assert.equal(ocrResponse.status, 200);

  const extraction = ocrResponse.body.data.extraction;
  assert.equal(extraction.status, 'ready');
  assert.equal(extraction.reasonCode, null);
  assert.equal(extraction.source, 'ocr');
  assert.equal(extraction.hasTextLayer, true);
  assert.ok(extraction.warnings.includes('OCR_APPLIED'));
  assert.ok(extraction.warnings.includes('OCR_REVIEW_REQUIRED'));
  assert.equal(extraction.ocr.engine, 'tesseract.js');
  assert.equal(extraction.ocr.language, 'eng');
  assert.ok(extraction.ocr.averageConfidence > 0.5);
  assert.ok(extraction.ocr.lineCount >= 3);
  assert.ok(extraction.pageGeometry[0].textItemCount >= 3);

  const ocrBody = JSON.stringify(ocrResponse.body);
  for (const secret of [NAME, EMAIL, PHONE]) {
    assert.equal(ocrBody.includes(secret), false, `OCR response leaked: ${secret}`);
  }

  const detectionResponse = await post(session, document.documentId, 'detect');
  assert.equal(detectionResponse.status, 200);

  const result = detectionResponse.body.data;
  assert.equal(result.detectionStatus, 'ready');
  assert.ok(result.warnings.includes('OCR_REVIEW_REQUIRED'));

  const types = result.detections.map((detection) => detection.type);
  for (const expected of ['NAME', 'EMAIL', 'PHONE']) {
    assert.ok(types.includes(expected), `missing ${expected} detection after OCR`);
  }

  for (const detection of result.detections) {
    assert.equal(detection.pageNumber, 1);
    assert.equal(detection.needsReview, true);
    assert.ok(detection.bboxes.length > 0);
    for (const box of detection.bboxes) {
      assert.ok(box.x >= 0 && box.y >= 0);
      assert.ok(box.x + box.width <= 612.01);
      assert.ok(box.y + box.height <= 792.01);
    }
  }

  const detectionBody = JSON.stringify(detectionResponse.body);
  for (const secret of [NAME, EMAIL, PHONE]) {
    assert.equal(detectionBody.includes(secret), false, `detection response leaked: ${secret}`);
  }

  await destroy(session);
});

test('OCR detects label-free contact values without mistaking the scan for a contact icon', async () => {
  const LOCATION = 'Delhi, India';
  const { session, document } = await upload(
    createScannedPdf([NAME, EMAIL, PHONE, LOCATION]),
  );

  assert.equal((await post(session, document.documentId, 'extract')).status, 200);
  const ocrResponse = await post(session, document.documentId, 'ocr');
  assert.equal(ocrResponse.status, 200);

  const detectionResponse = await post(session, document.documentId, 'detect');
  assert.equal(detectionResponse.status, 200);
  const detections = detectionResponse.body.data.detections;
  const types = detections.map((item) => item.type);

  for (const expected of ['EMAIL', 'PHONE', 'LOCATION']) {
    assert.ok(types.includes(expected), `missing ${expected} after OCR`);
  }
  for (const detection of detections) {
    assert.equal(detection.needsReview, true, 'OCR matches always require human review');
    assert.equal(detection.iconContext, undefined, 'a full-page scan is not an icon');
  }

  await destroy(session);
});

test('rejects OCR when the PDF already has a text layer', async () => {
  const { session, document } = await upload(createMinimalPdf('Digital resume text'));

  const extractionResponse = await post(session, document.documentId, 'extract');
  assert.equal(extractionResponse.status, 200);
  assert.equal(extractionResponse.body.data.extraction.status, 'ready');

  const ocrResponse = await post(session, document.documentId, 'ocr');
  assert.equal(ocrResponse.status, 409);
  assert.equal(ocrResponse.body.error.code, 'OCR_NOT_REQUIRED');

  await destroy(session);
});

test('requires extraction before running OCR', async () => {
  const { session, document } = await upload(createScannedPdf(SCAN_LINES));

  const ocrResponse = await post(session, document.documentId, 'ocr');
  assert.equal(ocrResponse.status, 409);
  assert.equal(ocrResponse.body.error.code, 'EXTRACTION_REQUIRED');

  await destroy(session);
});
