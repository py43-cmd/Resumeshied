import test from 'node:test';
import assert from 'node:assert/strict';

import {
  confidencePercent,
  groupDetectionsByPage,
  iconContextLabel,
  initialReviewState,
  reviewSummary,
  typeLabel,
  warningMessages,
} from '../src/lib/detectionView.js';

const DETECTIONS = [
  {
    detectionId: 'a',
    type: 'NAME',
    needsReview: true,
    pageNumber: 2,
    maskedValue: 'R•••• •••••',
  },
  {
    detectionId: 'b',
    type: 'EMAIL',
    needsReview: false,
    pageNumber: 1,
    maskedValue: 'r•••@•••••.com',
  },
  {
    detectionId: 'c',
    type: 'DOB',
    needsReview: false,
    pageNumber: null,
    maskedValue: '••/••/••••',
  },
];

test('formats only allowlisted presentation labels', () => {
  assert.equal(typeLabel('EMAIL'), 'Email address');
  assert.equal(typeLabel('SOMETHING_NEW'), 'Something New');
  assert.equal(confidencePercent(0.956), '96%');
  assert.equal(confidencePercent(null), '—');
});

test('labels icon hints without revealing the detected value', () => {
  assert.equal(iconContextLabel({ iconContext: 'phone' }), 'Phone icon');
  assert.equal(iconContextLabel({ iconContext: 'near-icon' }), 'Near an icon');
  assert.equal(iconContextLabel({}), null);
  assert.match(iconContextLabel({ iconContext: 'custom' }), /^Near .* icon$/);
});

test('maps warnings to honest messages without dropping unknown codes', () => {
  const messages = warningMessages(['OCR_APPLIED', 'OCR_APPLIED', 'CUSTOM_CHECK']);
  assert.deepEqual(
    messages.map((item) => item.code),
    ['OCR_APPLIED', 'CUSTOM_CHECK'],
  );
  assert.match(messages[0].message, /Local OCR/);
  assert.match(messages[1].message, /CUSTOM_CHECK/);
});

test('groups detections by page with text-only items last', () => {
  const groups = groupDetectionsByPage(DETECTIONS);
  assert.deepEqual(
    groups.map((group) => group.pageNumber),
    [1, 2, null],
  );
  assert.equal(groups[1].detections[0].detectionId, 'a');
});

test('requires explicit review for needsReview detections', () => {
  const state = initialReviewState(DETECTIONS);
  assert.deepEqual(state, { a: 'undecided', b: 'accepted', c: 'accepted' });

  const pending = reviewSummary(DETECTIONS, state);
  assert.deepEqual(pending, {
    total: 3,
    accepted: 2,
    rejected: 0,
    undecided: 1,
    ready: false,
  });

  const complete = reviewSummary(DETECTIONS, {
    a: 'rejected',
    b: 'accepted',
    c: 'accepted',
  });
  assert.equal(complete.ready, true);
  assert.equal(complete.rejected, 1);
});
