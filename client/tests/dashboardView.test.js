import test from 'node:test';
import assert from 'node:assert/strict';

import { resumeAction, sessionStatusLabel } from '../src/lib/dashboardView.js';

test('resumeAction starts with upload when no document is active', () => {
  assert.deepEqual(resumeAction(), {
    to: '/upload',
    label: 'Upload a resume',
    status: 'No active document',
  });
  assert.equal(resumeAction({ isActive: true, documentId: null }).to, '/upload');
});

test('resumeAction opens the download when a redaction exists', () => {
  assert.deepEqual(
    resumeAction({ isActive: true, documentId: 'doc-1', redactionId: 'red-1' }),
    {
      to: '/export/doc-1',
      label: 'Open download',
      status: 'Redaction ready',
    },
  );
});

test('resumeAction returns to the editor for a saved review or blocked plan', () => {
  assert.deepEqual(
    resumeAction({
      isActive: true,
      documentId: 'doc-1',
      activeFile: { redactionPlanStatus: 'blocked' },
    }),
    {
      to: '/editor/doc-1',
      label: 'Resume redaction',
      status: 'Review needed',
    },
  );

  assert.equal(
    resumeAction({
      isActive: true,
      documentId: 'doc-1',
      activeFile: { redactionPlanStatus: 'ready' },
    }).to,
    '/export/doc-1',
  );
});

test('resumeAction continues detection for an extracted document', () => {
  assert.deepEqual(
    resumeAction({
      isActive: true,
      documentId: 'doc-1',
      activeFile: { extractionStatus: 'ready' },
    }),
    {
      to: '/detect/doc-1',
      label: 'Continue detection',
      status: 'Ready to review',
    },
  );
});

test('sessionStatusLabel describes extraction state without document values', () => {
  assert.equal(sessionStatusLabel(false, 'ready'), 'No session');
  assert.equal(sessionStatusLabel(true, 'needs_ocr'), 'OCR required');
  assert.equal(sessionStatusLabel(true, 'failed'), 'Needs attention');
  assert.equal(sessionStatusLabel(true, 'ready'), 'Document ready');
  assert.equal(sessionStatusLabel(true, null), 'Session active');
});
