import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.js';

test('GET /api/health returns the standard success envelope', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'ok');
  assert.equal(response.body.data.service, 'resumeshield-api');
  assert.ok(response.body.data.uptimeSeconds >= 0);
  assert.ok(response.body.meta.requestId);

  assert.equal(
    response.headers['x-request-id'],
    response.body.meta.requestId,
  );
});

test('unknown routes return a 404 error envelope', async () => {
  const response = await request(app).get('/api/does-not-exist');

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
  assert.ok(response.body.meta.requestId);
});

test('caller-supplied request IDs are echoed when safe', async () => {
  const requestId = 'test-request-1234';
  const response = await request(app)
    .get('/api/health')
    .set('X-Request-Id', requestId);

  assert.equal(response.headers['x-request-id'], requestId);
  assert.equal(response.body.meta.requestId, requestId);
});
