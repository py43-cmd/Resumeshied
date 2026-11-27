import test from 'node:test';
import assert from 'node:assert/strict';

import { createId, formatBytes } from '../src/lib/utils.js';

test('formatBytes reports invalid and valid sizes', () => {
  assert.equal(formatBytes(-1), '—');
  assert.equal(formatBytes(undefined), '—');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
});

test('createId returns a non-empty local UI identifier', () => {
  const first = createId();
  const second = createId();

  assert.match(first, /^[\w-]+$/);
  assert.notEqual(first, second);
});
