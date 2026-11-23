import test from 'node:test';
import assert from 'node:assert/strict';

import { checkStatus, EXPORT_CHECKS } from '../src/lib/exportView.js';

const byKey = (key) => EXPORT_CHECKS.find((check) => check.key === key);

const PASSED = {
  warnings: [],
  verification: {
    privacy: { status: 'passed' },
    fidelity: { status: 'passed' },
  },
};

test('every check passes for a clean verification result', () => {
  for (const check of EXPORT_CHECKS) {
    assert.equal(checkStatus(check, PASSED, []), 'pass', `${check.key} should pass`);
  }
});

test('a visual diff warns only the visual check', () => {
  assert.equal(checkStatus(byKey('visual'), PASSED, ['VISUAL_DIFF_OUTSIDE_BOXES']), 'warning');
  assert.equal(checkStatus(byKey('text'), PASSED, ['VISUAL_DIFF_OUTSIDE_BOXES']), 'pass');
});

test('geometry drift warns only the geometry check', () => {
  assert.equal(checkStatus(byKey('geometry'), PASSED, ['PAGE_DIMENSIONS_CHANGED']), 'warning');
  assert.equal(checkStatus(byKey('geometry'), PASSED, ['PAGE_COUNT_CHANGED']), 'warning');
  assert.equal(checkStatus(byKey('geometry'), PASSED, []), 'pass');
});

test('privacy failures mark the text check as failed', () => {
  const failed = {
    ...PASSED,
    verification: { ...PASSED.verification, privacy: { status: 'failed' } },
  };
  assert.equal(checkStatus(byKey('text'), failed, []), 'fail');
});

test('a missing or unverifiable verdict is shown as needing review', () => {
  assert.equal(checkStatus(byKey('text'), {}, []), 'warning');
  assert.equal(checkStatus(byKey('text'), null, []), 'warning');

  const unverifiable = {
    ...PASSED,
    verification: { ...PASSED.verification, fidelity: { status: 'unverifiable' } },
  };
  assert.equal(checkStatus(byKey('visual'), unverifiable, []), 'warning');
});

test('malformed warning input does not throw', () => {
  assert.equal(checkStatus(byKey('visual'), PASSED, null), 'pass');
  assert.equal(checkStatus(byKey('text'), PASSED, undefined), 'pass');
});
