import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

const allowedOrigins = [
  'https://client-cy8n2d7re-py431035-8358s-projects.vercel.app',
  'https://resumeshield-git-main-py431035.vercel.app',
];

// Must be set before app.js/config are evaluated — each test file runs in its
// own process, so this does not affect other tests.
// A stale single-origin value must not win over the new list.
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.CLIENT_ORIGINS = allowedOrigins.join(', ');

const { default: app } = await import('../src/app.js');
const { config } = await import('../src/config/index.js');

test('CLIENT_ORIGINS overrides CLIENT_ORIGIN and splits into exact origins', () => {
  assert.deepEqual(config.clientOrigins, allowedOrigins);
  assert.equal(config.clientOrigin, allowedOrigins[0]);
});

test('every configured origin receives its exact CORS header', async () => {
  for (const origin of allowedOrigins) {
    const response = await request(app).get('/api/health').set('Origin', origin);

    assert.equal(response.status, 200);
    assert.equal(response.headers['access-control-allow-origin'], origin);
    assert.match(response.headers['vary'] ?? '', /Origin/);
  }
});

test('unknown origins receive no CORS header', async () => {
  const response = await request(app)
    .get('/api/health')
    .set('Origin', 'https://unknown.example');

  assert.equal(response.status, 200);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
});

test('preflight succeeds for a configured preview origin', async () => {
  const response = await request(app)
    .options('/api/sessions')
    .set('Origin', allowedOrigins[1])
    .set('Access-Control-Request-Method', 'POST');

  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-origin'], allowedOrigins[1]);
});
