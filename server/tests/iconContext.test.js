import test from 'node:test';
import assert from 'node:assert/strict';

import { attachIconContext } from '../src/services/detection/iconContext.js';
import {
  findUnicodeIconRanges,
  subBboxForRange,
} from '../src/services/detection/unicodeIcons.js';

test('finds Unicode contact glyphs with their exact UTF-16 positions', () => {
  const ranges = findUnicodeIconRanges('☎ +91 9876543210 ✉ rahul@gmail.com 📍 Delhi, India');
  assert.deepEqual(
    ranges.map((range) => range.kind),
    ['phone', 'email', 'location'],
  );
  assert.equal(ranges[0].start, 0);
  assert.equal(ranges[0].end, 1);
  assert.equal(ranges[2].end - ranges[2].start, 2, 'emoji occupies two UTF-16 units');
});

test('sub-box for a value excludes a leading Unicode icon glyph', () => {
  const text = '☎ +91 9876543210';
  const itemBox = { x: 72, y: 60, width: 100, height: 12 };
  const [glyph] = findUnicodeIconRanges(text);
  const glyphBox = subBboxForRange(text, itemBox, glyph.start, glyph.end);
  const valueBox = subBboxForRange(text, itemBox, glyph.end + 1, text.length);

  assert.ok(glyphBox.x >= itemBox.x);
  assert.ok(valueBox.x > glyphBox.x + glyphBox.width, 'value starts after the icon box');
  assert.ok(
    valueBox.x + valueBox.width <= itemBox.x + itemBox.width + 0.01,
    'value stays inside the original text item',
  );
  assert.equal(valueBox.y, glyphBox.y);
});

test('associates icon context by glyph kind and by geometry', () => {
  const page = {
    pageNumber: 1,
    textItems: [{ text: '✉ rahul@gmail.com', bbox: { x: 86, y: 80, width: 90, height: 12 } }],
    iconBoxes: [{ x: 300, y: 200, width: 10, height: 10 }],
    imageBoxes: [{ x: 400, y: 300, width: 14, height: 14 }],
  };
  const email = {
    type: 'EMAIL',
    pageNumber: 1,
    bboxes: [{ x: 86, y: 80, width: 90, height: 12 }],
  };
  const distant = {
    type: 'PHONE',
    pageNumber: 1,
    bboxes: [{ x: 86, y: 400, width: 90, height: 12 }],
  };
  const unknown = {
    type: 'URL',
    pageNumber: 1,
    bboxes: [{ x: 292, y: 198, width: 90, height: 12 }],
  };

  attachIconContext([email, distant, unknown], [page]);

  assert.equal(email.iconContext, 'email', 'Unicode glyph names the icon');
  assert.deepEqual(email.iconContextSources, ['unicode']);
  assert.equal(distant.iconContext, undefined, 'decorative icons must not create hints');
  assert.equal(unknown.iconContext, 'near-icon', 'vector icons are located but not named');
  assert.deepEqual(unknown.iconContextSources, ['vector']);
});

test('does not treat a full-page scan as a contact icon', () => {
  const page = {
    pageNumber: 2,
    textItems: [{ text: 'rahul@gmail.com', bbox: { x: 86, y: 80, width: 90, height: 12 } }],
    iconBoxes: [],
    imageBoxes: [{ x: 0, y: 0, width: 612, height: 792 }],
  };
  const detection = {
    type: 'EMAIL',
    pageNumber: 2,
    bboxes: [{ x: 86, y: 80, width: 90, height: 12 }],
  };

  attachIconContext([detection], [page]);
  assert.equal(detection.iconContext, undefined);
});
