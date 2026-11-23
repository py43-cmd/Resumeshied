import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';

import app from '../src/app.js';
import { config } from '../src/config/index.js';

const PDF_BUFFER = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');

async function newSession() {
  const response = await request(app).post('/api/sessions');
  assert.equal(response.status, 201);
  return response.body.data;
}

function auth(session) {
  return { 'X-Session-Token': session.token };
}

async function destroy(session) {
  await request(app).delete(`/api/sessions/${session.sessionId}`).set(auth(session));
}

test('creates a session with an opaque token and expiry', async () => {
  const session = await newSession();

  assert.match(session.sessionId, /^[0-9a-f-]{36}$/i);
  assert.equal(session.token.length, 64);
  assert.ok(new Date(session.expiresAt).getTime() > Date.now());
  assert.deepEqual(session.files, []);

  await destroy(session);
});

test('uploads a valid PDF into a private session folder', async () => {
  const session = await newSession();

  const response = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set(auth(session))
    .attach('file', PDF_BUFFER, {
      filename: 'rahul_resume.pdf',
      contentType: 'application/pdf',
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.originalName, 'rahul_resume.pdf');
  assert.equal(response.body.data.sizeBytes, PDF_BUFFER.length);
  assert.equal(response.body.data.extractionStatus, 'pending');
  assert.equal(response.body.data.absolutePath, undefined);
  assert.equal(response.body.data.storedName, undefined);

  const storedPath = path.join(
    config.tempRoot,
    session.sessionId,
    `${response.body.data.documentId}.pdf`,
  );
  const stats = await fs.stat(storedPath);
  assert.equal(stats.size, PDF_BUFFER.length);

  await destroy(session);
});

test('rejects a missing or mismatched session token', async () => {
  const session = await newSession();

  const missing = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .attach('file', PDF_BUFFER, 'resume.pdf');
  assert.equal(missing.status, 401);
  assert.equal(missing.body.error.code, 'SESSION_TOKEN_REQUIRED');

  const wrong = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set('X-Session-Token', 'f'.repeat(64))
    .attach('file', PDF_BUFFER, 'resume.pdf');
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.error.code, 'SESSION_TOKEN_MISMATCH');

  await destroy(session);
});

test('rejects disallowed extensions, MIME mismatches and bad signatures', async () => {
  const session = await newSession();

  const wrongExtension = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set(auth(session))
    .attach('file', Buffer.from('image'), {
      filename: 'resume.png',
      contentType: 'image/png',
    });
  assert.equal(wrongExtension.status, 415);
  assert.equal(wrongExtension.body.error.code, 'FILE_TYPE_NOT_ALLOWED');

  const wrongMime = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set(auth(session))
    .attach('file', PDF_BUFFER, {
      filename: 'resume.pdf',
      contentType: 'text/plain',
    });
  assert.equal(wrongMime.status, 415);
  assert.equal(wrongMime.body.error.code, 'MIME_MISMATCH');

  const badSignature = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set(auth(session))
    .attach('file', Buffer.from('not really a pdf'), {
      filename: 'resume.pdf',
      contentType: 'application/pdf',
    });
  assert.equal(badSignature.status, 415);
  assert.equal(badSignature.body.error.code, 'INVALID_FILE_SIGNATURE');

  await destroy(session);
});

test('rejects files larger than the configured limit', async () => {
  const session = await newSession();
  const oversized = Buffer.alloc(config.maxUploadBytes + 1, 0x41);

  const response = await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set(auth(session))
    .attach('file', oversized, {
      filename: 'huge.pdf',
      contentType: 'application/pdf',
    });

  assert.equal(response.status, 413);
  assert.equal(response.body.error.code, 'FILE_TOO_LARGE');

  await destroy(session);
});

test('destroying a session deletes its folder and invalidates the token', async () => {
  const session = await newSession();
  await request(app)
    .post(`/api/sessions/${session.sessionId}/files`)
    .set(auth(session))
    .attach('file', PDF_BUFFER, {
      filename: 'resume.pdf',
      contentType: 'application/pdf',
    });

  const directory = path.join(config.tempRoot, session.sessionId);
  await fs.access(directory);

  const deleted = await request(app)
    .delete(`/api/sessions/${session.sessionId}`)
    .set(auth(session));
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.data.destroyed, true);

  await assert.rejects(fs.access(directory));

  const reuse = await request(app)
    .get(`/api/sessions/${session.sessionId}`)
    .set(auth(session));
  assert.equal(reuse.status, 404);
  assert.equal(reuse.body.error.code, 'SESSION_NOT_FOUND');
});
