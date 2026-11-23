import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bboxToPercent,
  groupByType,
  planLabel,
  pointerToBbox,
  privacyBlockerMessages,
  toPlanDecisions,
} from '../src/lib/editorView.js';

test('converts top-left PDF bboxes to CSS percentages', () => {
  assert.deepEqual(bboxToPercent({ x: 50, y: 100, width: 100, height: 20 }, 500, 800), {
    left: '10%',
    top: '12.5%',
    width: '20%',
    height: '2.5%',
  });
  assert.equal(bboxToPercent(null, 500, 800), null);
});

test('builds a bounded bbox from two pointer positions', () => {
  assert.deepEqual(pointerToBbox({ x: 100, y: 80 }, { x: 140, y: 104 }, 500, 800), {
    x: 100,
    y: 80,
    width: 40,
    height: 24,
  });

  // Reverse drag direction still produces a canonical top-left box.
  assert.deepEqual(pointerToBbox({ x: 140, y: 104 }, { x: 100, y: 80 }, 500, 800), {
    x: 100,
    y: 80,
    width: 40,
    height: 24,
  });

  assert.equal(pointerToBbox({ x: 10, y: 10 }, { x: 11, y: 11 }, 500, 800), null);
});

test('clamps a drag that starts outside the page bounds', () => {
  const box = pointerToBbox({ x: -50, y: -20 }, { x: 200, y: 300 }, 500, 800);
  assert.equal(box.x, 0);
  assert.equal(box.y, 0);
  assert.equal(box.width, 250);
  assert.equal(box.height, 320);
});

test('groups detections by type with a stable order', () => {
  const groups = groupByType([
    { detectionId: 'a', type: 'EMAIL' },
    { detectionId: 'b', type: 'NAME' },
    { detectionId: 'c', type: 'EMAIL' },
  ]);
  assert.deepEqual(
    groups.map((group) => group.type),
    ['EMAIL', 'NAME'],
  );
  assert.equal(groups[0].items.length, 2);
});

test('maps privacy blockers to honest messages', () => {
  const messages = privacyBlockerMessages(['REVIEW_INCOMPLETE', 'REVIEW_INCOMPLETE', 'CUSTOM']);
  assert.deepEqual(
    messages.map((item) => item.code),
    ['REVIEW_INCOMPLETE', 'CUSTOM'],
  );
  assert.match(messages[0].message, /Hide or Keep/);
  assert.match(messages[1].message, /CUSTOM/);
  assert.equal(planLabel('blocked'), 'Blocked — action required');
});

test('toPlanDecisions sends only explicit accept/reject values', () => {
  assert.deepEqual(
    toPlanDecisions({
      a: 'accepted',
      b: 'rejected',
      c: 'undecided',
      d: 'something-else',
      e: null,
    }),
    { a: 'accepted', b: 'rejected' },
  );
});

test('toPlanDecisions tolerates missing or malformed review state', () => {
  assert.deepEqual(toPlanDecisions(), {});
  assert.deepEqual(toPlanDecisions(null), {});
  assert.deepEqual(toPlanDecisions([]), {});
});

test('toPlanDecisions drops decisions for stale detection IDs', () => {
  const reviewState = {
    current: 'accepted',
    stale: 'accepted',
    alsoStale: 'rejected',
  };
  const detections = [{ detectionId: 'current' }, { detectionId: 'other' }];

  assert.deepEqual(toPlanDecisions(reviewState, detections), { current: 'accepted' });
});

test('toPlanDecisions keeps all valid decisions when detection list is unavailable', () => {
  assert.deepEqual(
    toPlanDecisions({ a: 'accepted', b: 'rejected', c: 'undecided' }, null),
    { a: 'accepted', b: 'rejected' },
  );
});
