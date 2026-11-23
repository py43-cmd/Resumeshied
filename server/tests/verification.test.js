import test from 'node:test';
import assert from 'node:assert/strict';
import * as mupdf from 'mupdf';

import {
  compareVisualFidelity,
  verifyTextRemoval,
} from '../src/services/verification/verificationService.js';
import { createPdfFromLines } from './fixtures/documents.js';

const NAME = 'Rahul Sharma';
const EMAIL = 'rahul.sharma@example.com';
const SURVIVOR = 'Keep this line visible';

const FULL_PAGE_BOX = { x: 0, y: 0, width: 612, height: 200 };
const TOP_LINES_BOX = { x: 0, y: 50, width: 612, height: 45 };

function planWithBoxes(...bboxes) {
  return { items: [{ pageNumber: 1, bboxes }] };
}

function redactWithBox(bytes, box) {
  const doc = mupdf.Document.openDocument(new Uint8Array(bytes), 'application/pdf').asPDF();
  const page = doc.loadPage(0);
  const annotation = page.createAnnotation('Redact');
  annotation.setRect([box.x, box.y, box.x + box.width, box.y + box.height]);
  annotation.update();
  page.applyRedactions(
    false,
    mupdf.PDFPage.REDACT_IMAGE_PIXELS,
    mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_COVERED,
    mupdf.PDFPage.REDACT_TEXT_REMOVE,
  );
  const output = Buffer.from(
    doc.saveToBuffer('garbage=deduplicate,compress=yes,encrypt=none,regenerate-id').asUint8Array(),
  );
  page.destroy();
  doc.destroy();
  return output;
}

test('TEXT_REMAINS_IN_BOX blocks an unredacted file', async () => {
  const original = createPdfFromLines([NAME, EMAIL, SURVIVOR]);

  const verdict = await verifyTextRemoval(original, planWithBoxes(FULL_PAGE_BOX));

  assert.equal(verdict.status, 'failed');
  assert.deepEqual(verdict.blockers, ['TEXT_REMAINS_IN_BOX']);
  assert.equal(verdict.checkedBoxCount, 1);
  assert.equal(verdict.failedBoxCount, 1);
});

test('text verification passes after the box has been redacted', async () => {
  const original = createPdfFromLines([NAME, EMAIL, SURVIVOR]);
  const redacted = redactWithBox(original, FULL_PAGE_BOX);

  const verdict = await verifyTextRemoval(redacted, planWithBoxes(FULL_PAGE_BOX));

  assert.equal(verdict.status, 'passed');
  assert.deepEqual(verdict.blockers, []);
  assert.equal(verdict.failedBoxCount, 0);
});

test('identical files produce no visual diff outside the boxes', () => {
  const original = createPdfFromLines([NAME, EMAIL, SURVIVOR]);

  const verdict = compareVisualFidelity(original, original, planWithBoxes(TOP_LINES_BOX));

  assert.equal(verdict.status, 'passed');
  assert.equal(verdict.differingPixels, 0);
  assert.ok(verdict.comparedPixels > 0);
});

test('selective redaction does not change pixels outside the boxes', () => {
  const original = createPdfFromLines([NAME, EMAIL, SURVIVOR]);
  const redacted = redactWithBox(original, TOP_LINES_BOX);

  const verdict = compareVisualFidelity(original, redacted, planWithBoxes(TOP_LINES_BOX));

  assert.equal(verdict.status, 'passed');
  assert.deepEqual(verdict.warnings, []);
  assert.equal(verdict.differingPixels, 0);
});

test('VISUAL_DIFF_OUTSIDE_BOXES warns about changes in untouched areas', () => {
  const original = createPdfFromLines([NAME, EMAIL, SURVIVOR]);
  const changed = createPdfFromLines([NAME, EMAIL, `${SURVIVOR} with an edit`]);

  const verdict = compareVisualFidelity(original, changed, planWithBoxes(TOP_LINES_BOX));

  assert.equal(verdict.status, 'warning');
  assert.ok(verdict.warnings.includes('VISUAL_DIFF_OUTSIDE_BOXES'));
  assert.ok(verdict.differingPixels > 0);
});
