import test from 'node:test';
import assert from 'node:assert/strict';

import { logEvent } from '../src/utils/logger.js';

function captureLog(level, event, meta) {
  const originalWrite = process.stdout.write;
  const chunks = [];

  process.stdout.write = (chunk) => {
    chunks.push(String(chunk));
    return true;
  };

  try {
    logEvent(level, event, meta);
  } finally {
    process.stdout.write = originalWrite;
  }

  return chunks.join('');
}

test('log events allow only safe metadata keys', () => {
  const output = captureLog('info', 'TEST_EVENT', {
    requestId: 'req-123',
    status: 200,
    method: 'POST',
    path: '/api/sessions/some-id/files',
    durationMs: 4,
    fileName: 'rahul_resume.pdf',
    value: 'rahul.sharma@example.com',
    matchedText: 'Rahul Sharma',
  });

  const entry = JSON.parse(output.trim());
  assert.equal(entry.event, 'TEST_EVENT');
  assert.equal(entry.requestId, 'req-123');
  assert.equal(entry.status, 200);
  assert.equal(entry.method, 'POST');
  assert.equal(entry.path, '/api/sessions/some-id/files');
  assert.equal('fileName' in entry, false);
  assert.equal('value' in entry, false);
  assert.equal('matchedText' in entry, false);

  for (const secret of ['rahul_resume.pdf', 'rahul.sharma@example.com', 'Rahul Sharma']) {
    assert.equal(output.includes(secret), false, `log leaked ${secret}`);
  }
});

test('log events always start with a timestamp and level', () => {
  const output = captureLog('warn', 'TEST_WARNING', { count: 2 });
  assert.match(output, /^\{"time":"\d{4}-\d{2}-\d{2}T/);
  assert.match(output, /"level":"warn"/);
  assert.match(output, /"count":2/);
});
