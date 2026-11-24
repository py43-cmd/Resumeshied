import test from 'node:test';
import assert from 'node:assert/strict';

// Query strings give each case a fresh module instance so the env values are
// read again instead of reusing the frozen config from another case.
async function loadConfig(env) {
  for (const key of ['NODE_ENV', 'CLIENT_ORIGIN', 'CLIENT_ORIGINS']) {
    delete process.env[key];
  }
  process.env.NODE_ENV = env.nodeEnv ?? 'production';
  if (env.origins !== undefined) process.env.CLIENT_ORIGINS = env.origins;
  if (env.origin !== undefined) process.env.CLIENT_ORIGIN = env.origin;

  return import(`../src/config/index.js?case=${Math.random()}`);
}

test('CLIENT_ORIGIN still works as a single-origin fallback', async () => {
  const { config, assertProductionConfig } = await loadConfig({
    origin: 'https://resumeshield.vercel.app',
  });

  assert.deepEqual(config.clientOrigins, ['https://resumeshield.vercel.app']);
  assert.doesNotThrow(() => assertProductionConfig());
});

test('localhost is the default when no origin variable is set', async () => {
  const { config } = await loadConfig({});

  assert.deepEqual(config.clientOrigins, ['http://localhost:5173']);
});

test('production rejects wildcards', async () => {
  const { assertProductionConfig } = await loadConfig({ origins: '*' });

  assert.throws(() => assertProductionConfig(), /no wildcards/);
});

test('production rejects trailing slashes and paths', async () => {
  const withSlash = await loadConfig({ origins: 'https://one.vercel.app/' });
  assert.throws(() => withSlash.assertProductionConfig(), /trailing slash/);

  const withPath = await loadConfig({ origins: 'https://one.vercel.app/dashboard' });
  assert.throws(() => withPath.assertProductionConfig(), /bare origin/);
});

test('production rejects insecure non-local origins', async () => {
  const { assertProductionConfig } = await loadConfig({ origins: 'http://resumeshield.vercel.app' });

  assert.throws(() => assertProductionConfig(), /https/);
});

test('production accepts a list of exact origins', async () => {
  const { config, assertProductionConfig } = await loadConfig({
    origins: 'https://one.vercel.app, https://two.vercel.app',
  });

  assert.deepEqual(config.clientOrigins, ['https://one.vercel.app', 'https://two.vercel.app']);
  assert.doesNotThrow(() => assertProductionConfig());
});
