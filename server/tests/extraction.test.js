import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.js';
import {
  createMinimalDocx,
  createMinimalPdf,
  createTextlessPdf,
} from './fixtures/documents.js';

const PDF_TEXT = 'Rahul Sharma rahul@gmail.com';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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

test('extracts a digital PDF with page geometry but never returns its text', async () => {
  const { session, document } = await upload(
    createMinimalPdf(PDF_TEXT),
    'resume.pdf',
    'application/pdf',
  );

  const response = await extract(session, document.documentId);
  assert.equal(response.status, 200);

  const extraction = response.body.data.extraction;
  assert.equal(extraction.status, 'ready');
  assert.equal(extraction.pageCount, 1);
  assert.equal(extraction.hasCoordinates, true);
  assert.equal(extraction.hasTextLayer, true);
  assert.equal(extraction.pageGeometry.length, 1);
  assert.equal(extraction.pageGeometry[0].width, 612);
  assert.equal(extraction.pageGeometry[0].height, 792);
  assert.equal(extraction.pageGeometry[0].textItemCount, 1);

  assert.equal(JSON.stringify(response.body).includes(PDF_TEXT), false);

  await request(app)
    .delete(`/api/sessions/${session.sessionId}`)
    .set('X-Session-Token', session.token);
});

test('reports a textless PDF as needs_ocr instead of claiming success', async () => {
  const { session, document } = await upload(
    createTextlessPdf(),
    'scanned.pdf',
    'application/pdf',
  );

  const response = await extract(session, document.documentId);
  assert.equal(response.status, 200);

  const extraction = response.body.data.extraction;
  assert.equal(extraction.status, 'needs_ocr');
  assert.equal(extraction.reasonCode, 'NO_TEXT_LAYER');
  assert.equal(extraction.hasTextLayer, false);
  assert.equal(extraction.pageCount, 1);

  await request(app)
    .delete(`/api/sessions/${session.sessionId}`)
    .set('X-Session-Token', session.token);
});

test('extracts DOCX text and reports that it has no coordinates', async () => {
  const { session, document } = await upload(
    await createMinimalDocx(PDF_TEXT),
    'resume.docx',
    DOCX_MIME,
  );

  const response = await extract(session, document.documentId);
  assert.equal(response.status, 200);

  const extraction = response.body.data.extraction;
  assert.equal(extraction.status, 'ready');
  assert.equal(extraction.hasCoordinates, false);
  assert.ok(extraction.warnings.includes('DOCX_NO_COORDINATES'));
  assert.equal(JSON.stringify(response.body).includes(PDF_TEXT), false);

  await request(app)
    .delete(`/api/sessions/${session.sessionId}`)
    .set('X-Session-Token', session.token);
});

test('returns 404 when extracting an unknown document', async () => {
  const sessionResponse = await request(app).post('/api/sessions');
  const session = sessionResponse.body.data;

  const response = await extract(session, '00000000-0000-4000-8000-000000000000');
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'DOCUMENT_NOT_FOUND');

  await request(app)
    .delete(`/api/sessions/${session.sessionId}`)
    .set('X-Session-Token', session.token);
});
