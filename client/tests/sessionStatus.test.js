import test from 'node:test';
import assert from 'node:assert/strict';

import { isSessionInvalidCode, SESSION_INVALID_CODES } from '../src/lib/sessionStatus.js';

test('recognizes every dead-session code', () => {
  for (const code of ['SESSION_NOT_FOUND', 'SESSION_EXPIRED', 'SESSION_TOKEN_MISMATCH']) {
    assert.equal(isSessionInvalidCode(code), true, `${code} should invalidate the session`);
  }
});

test('does not invalidate unrelated errors', () => {
  for (const code of [
    'DOCUMENT_NOT_FOUND',
    'INVALID_REVIEW_DECISION',
    'PRIVACY_BLOCKERS',
    'NETWORK_ERROR',
    'ROUTE_NOT_FOUND',
    undefined,
    null,
  ]) {
    assert.equal(isSessionInvalidCode(code), false, `${code} should not clear the session`);
  }
});

test('the code set stays limited to session lifecycle failures', () => {
  assert.equal(SESSION_INVALID_CODES.size, 3);
});
