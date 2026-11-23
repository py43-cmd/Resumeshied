import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';

// This file runs in its own process under `node --test`, so a short TTL here
// cannot affect the other suites. Set it before any app/config import.
process.env.SESSION_TTL_SECONDS = '1';

const { default: app } = await import('../src/app.js');
const { config } = await import('../src/config/index.js');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('an expired session is rejected and its files are deleted', async () => {
  assert.equal(config.sessionTtlSeconds, 1);

  const created = await request(app).post('/api/sessions');
  assert.equal(created.status, 201);
  const session = created.body.data;

  const headers = { 'X-Session-Token': session.token };
  const url = `/api/sessions/${session.sessionId}`;
  const directory = path.join(config.tempRoot, session.sessionId);
  await fs.access(directory);

  const fresh = await request(app).get(url).set(headers);
  assert.equal(fresh.status, 200);

  await delay(1200);

  const expired = await request(app).get(url).set(headers);
  assert.equal(expired.status, 404);
  assert.equal(expired.body.error.code, 'SESSION_EXPIRED');

  // Expiry destroys the folder asynchronously; allow one short tick.
  await delay(100);
  await assert.rejects(fs.access(directory));
});
