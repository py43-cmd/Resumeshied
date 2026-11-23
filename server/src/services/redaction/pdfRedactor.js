import * as mupdf from 'mupdf';

import { ApiError } from '../../utils/ApiError.js';

/**
 * Full rewrite (never incremental) with garbage collection so removed objects
 * are physically purged instead of lingering as recoverable PDF history.
 */
const SAVE_OPTIONS = 'garbage=deduplicate,compress=yes,encrypt=none,regenerate-id';

const METADATA_KEYS = [
  'info:Title',
  'info:Author',
  'info:Subject',
  'info:Keywords',
  'info:Creator',
  'info:Producer',
  'info:CreationDate',
  'info:ModDate',
];

function cleanMetadata(doc) {
  let cleared = 0;
  for (const key of METADATA_KEYS) {
    try {
      doc.setMetaData(key, '');
      cleared += 1;
    } catch {
      // Some PDFs do not expose every Info key; ignore absent fields.
    }
  }
  return cleared;
}

function removeEmbeddedFiles(doc) {
  let removed = 0;
  try {
    const files = doc.getEmbeddedFiles() ?? {};
    for (const name of Object.keys(files)) {
      doc.deleteEmbeddedFile(name);
      removed += 1;
    }
  } catch {
    // Embedded file tables are optional; absence is not an error.
  }
  return removed;
}

function itemsByPage(plan) {
  const pages = new Map();

  for (const item of plan.items ?? []) {
    if (!Number.isInteger(item.pageNumber) || item.pageNumber < 1) continue;
    if (!Array.isArray(item.bboxes) || item.bboxes.length === 0) continue;
    if (!pages.has(item.pageNumber)) pages.set(item.pageNumber, []);
    pages.get(item.pageNumber).push(...item.bboxes);
  }

  return pages;
}

function removeAnnotations(page) {
  let removed = 0;
  try {
    const annotations = page.getAnnotations() ?? [];
    for (const annotation of annotations) {
      page.delete(annotation);
      removed += 1;
    }
  } catch {
    // Some annotation types cannot be deleted; redaction still proceeds.
  }
  return removed;
}

function applyBoxes(page, boxes) {
  for (const box of boxes) {
    const { x, y, width, height } = box;
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) continue;

    const annotation = page.createAnnotation('Redact');
    annotation.setRect([x, y, x + width, y + height]);
    annotation.update();
  }

  page.applyRedactions(
    false,
    mupdf.PDFPage.REDACT_IMAGE_PIXELS,
    mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_COVERED,
    mupdf.PDFPage.REDACT_TEXT_REMOVE,
  );

  return boxes.length;
}

function assertGeometry(doc, expectedGeometry) {
  const warnings = [];
  if (!Array.isArray(expectedGeometry) || expectedGeometry.length === 0) return warnings;

  if (doc.countPages() !== expectedGeometry.length) {
    warnings.push('PAGE_COUNT_CHANGED');
    return warnings;
  }

  expectedGeometry.forEach((expected, index) => {
    if (!Number.isFinite(expected.width) || !Number.isFinite(expected.height)) return;

    const page = doc.loadPage(index);
    try {
      const [x0, y0, x1, y1] = page.getBounds();
      const width = Math.abs(x1 - x0);
      const height = Math.abs(y1 - y0);
      if (Math.abs(width - expected.width) > 0.5 || Math.abs(height - expected.height) > 0.5) {
        warnings.push('PAGE_DIMENSIONS_CHANGED');
      }
    } finally {
      page.destroy();
    }
  });

  return warnings;
}

/**
 * Permanently rewrite a PDF using MuPDF's destructive redaction API.
 * Plan boxes are canonical top-left PDF points — the same space MuPDF uses.
 */
export function redactPdf(originalBytes, plan, expectedGeometry = []) {
  let doc;
  try {
    doc = mupdf.Document.openDocument(new Uint8Array(originalBytes), 'application/pdf').asPDF();
  } catch {
    throw ApiError.unprocessable('REDACTION_FAILED', 'We could not open this PDF for redaction.');
  }

  const byPage = itemsByPage(plan);
  let redactedBoxCount = 0;
  let removedAnnotationCount = 0;
  let removedEmbeddedFileCount = 0;

  try {
    for (let pageIndex = 1; pageIndex <= doc.countPages(); pageIndex += 1) {
      const boxes = byPage.get(pageIndex) ?? [];
      const page = doc.loadPage(pageIndex - 1);
      try {
        removedAnnotationCount += removeAnnotations(page);
        if (boxes.length > 0) redactedBoxCount += applyBoxes(page, boxes);
      } finally {
        page.destroy();
      }
    }

    cleanMetadata(doc);
    removedEmbeddedFileCount = removeEmbeddedFiles(doc);

    const output = doc.saveToBuffer(SAVE_OPTIONS);
    const bytes = Buffer.from(output.asUint8Array());

    let verify;
    try {
      verify = mupdf.Document.openDocument(new Uint8Array(bytes), 'application/pdf');
    } catch {
      throw ApiError.unprocessable('REDACTION_VERIFY_FAILED', 'The redacted PDF could not be reopened.');
    }

    const warnings = [];
    try {
      if (verify.countPages() !== doc.countPages()) warnings.push('PAGE_COUNT_CHANGED');
      warnings.push(...assertGeometry(verify, expectedGeometry));
    } finally {
      verify.destroy();
    }

    return {
      bytes,
      pageCount: doc.countPages(),
      redactedBoxCount,
      removedAnnotationCount,
      removedEmbeddedFileCount,
      warnings: [...new Set(warnings)],
    };
  } catch (error) {
    if (error?.isOperational) throw error;
    throw ApiError.unprocessable('REDACTION_FAILED', 'Local PDF redaction could not be completed.');
  } finally {
    doc.destroy();
  }
}
