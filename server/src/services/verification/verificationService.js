// Canvas globals must exist before pdfjs is evaluated, including when this
// service is imported directly by a test instead of through src/app.js.
import '../pdf/nodeCanvasSetup.js';

import * as mupdf from 'mupdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Phase 8 verification.
 *
 * Privacy check (hard gate): re-extract text from the redacted PDF and make
 * sure no surviving text item substantially overlaps an approved box.
 * Fidelity check (advisory): render both PDFs to raw RGB pixels and compare
 * everything outside the boxes. No PII is ever read, stored or logged here —
 * only geometry and counts.
 */

const RENDER_SCALE = 2;
const COLOR_TOLERANCE = 8;
const MIN_OVERLAP_POINTS = 1;
const OVERLAP_RATIO = 0.25;

/**
 * pdfjs reports a text box based on font size, while MuPDF removes whole glyph
 * boxes (including ascenders/descenders). Those can extend a few points past
 * the reported box. The visual check ignores that inherent halo so ordinary
 * redactions are not reported as unapproved changes, but still flags anything
 * changed beyond the genuinely affected area.
 */
const MIN_GLYPH_MARGIN = 3;
function glyphMargin(box) {
  return Math.max(MIN_GLYPH_MARGIN, box.height * 0.25);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function toBoundingBox(item, viewport) {
  const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
  const height = Math.abs(item.height) || 12;

  return {
    x: round(transform[4]),
    y: round(transform[5] - height),
    width: round(item.width ?? 0),
    height: round(height),
  };
}

function boxesByPage(plan) {
  const pages = new Map();

  for (const item of plan?.items ?? []) {
    if (!Number.isInteger(item.pageNumber) || item.pageNumber < 1) continue;
    if (!Array.isArray(item.bboxes) || item.bboxes.length === 0) continue;
    if (!pages.has(item.pageNumber)) pages.set(item.pageNumber, []);
    pages.get(item.pageNumber).push(...item.bboxes.filter(isValidBox));
  }

  return pages;
}

function isValidBox(box) {
  return (
    box &&
    [box.x, box.y, box.width, box.height].every(Number.isFinite) &&
    box.width > 0 &&
    box.height > 0
  );
}

/**
 * A text item counts as "still in the box" only when a meaningful part of its
 * glyph box overlaps. This avoids false positives from a point or two of
 * overlap caused by font-metric differences between pdfjs and MuPDF.
 */
function textItemRemainsInBox(box, item) {
  if (!item.width || !item.height) return false;

  const overlapX = Math.min(item.x + item.width, box.x + box.width) - Math.max(item.x, box.x);
  const overlapY = Math.min(item.y + item.height, box.y + box.height) - Math.max(item.y, box.y);

  if (overlapX <= MIN_OVERLAP_POINTS || overlapY <= MIN_OVERLAP_POINTS) return false;
  return (overlapX * overlapY) / (item.width * item.height) >= OVERLAP_RATIO;
}

/** Re-extract the rewritten PDF and verify every approved box is text-free. */
export async function verifyTextRemoval(pdfBytes, plan) {
  const byPage = boxesByPage(plan);
  const checkedBoxCount = [...byPage.values()].reduce((total, boxes) => total + boxes.length, 0);

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(pdfBytes),
      verbosityLevel: 0,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
  } catch {
    return {
      status: 'unverifiable',
      blockers: ['VERIFICATION_FAILED'],
      checkedBoxCount,
      failedBoxCount: 0,
    };
  }

  try {
    let failedBoxCount = 0;

    for (const [pageNumber, boxes] of byPage) {
      if (pageNumber > pdf.numPages || boxes.length === 0) continue;

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const items = content.items
        .filter((item) => typeof item.str === 'string' && item.str.trim().length > 0)
        .map((item) => toBoundingBox(item, viewport));

      for (const box of boxes) {
        if (items.some((item) => textItemRemainsInBox(box, item))) failedBoxCount += 1;
      }

      page.cleanup();
    }

    return {
      status: failedBoxCount > 0 ? 'failed' : 'passed',
      blockers: failedBoxCount > 0 ? ['TEXT_REMAINS_IN_BOX'] : [],
      checkedBoxCount,
      failedBoxCount,
    };
  } catch {
    return {
      status: 'unverifiable',
      blockers: ['VERIFICATION_FAILED'],
      checkedBoxCount,
      failedBoxCount: 0,
    };
  } finally {
    await pdf.destroy();
  }
}

function renderPage(page) {
  const pixmap = page.toPixmap(
    mupdf.Matrix.scale(RENDER_SCALE, RENDER_SCALE),
    mupdf.ColorSpace.DeviceRGB,
    false,
    false,
  );

  return {
    width: pixmap.getWidth(),
    height: pixmap.getHeight(),
    components: pixmap.getNumberOfComponents(),
    pixels: pixmap.getPixels(),
    destroy() {
      try {
        pixmap.destroy();
      } catch {
        // Disposal is best-effort; the process is short-lived.
      }
    },
  };
}

function destroyAll(resources) {
  for (const resource of resources) {
    try {
      resource?.destroy();
    } catch {
      // Ignore double-disposal from MuPDF's finalizer.
    }
  }
}

/**
 * Compare rendered pages outside the approved boxes. Advisory only: a diff can
 * be legitimate (e.g. a visible annotation was removed for privacy).
 */
export function compareVisualFidelity(originalBytes, redactedBytes, plan) {
  const byPage = new Map();
  for (const [pageNumber, boxes] of boxesByPage(plan)) {
    byPage.set(
      pageNumber,
      boxes.map((box) => {
        const margin = glyphMargin(box);
        return {
          x: box.x - margin,
          y: box.y - margin,
          width: box.width + margin * 2,
          height: box.height + margin * 2,
        };
      }),
    );
  }
  let originalDoc;
  let redactedDoc;

  try {
    originalDoc = mupdf.Document.openDocument(new Uint8Array(originalBytes), 'application/pdf').asPDF();
    redactedDoc = mupdf.Document.openDocument(new Uint8Array(redactedBytes), 'application/pdf').asPDF();
  } catch {
    return {
      status: 'unverifiable',
      warnings: ['VISUAL_CHECK_UNAVAILABLE'],
      differingPixels: 0,
      comparedPixels: 0,
    };
  }

  const warnings = new Set();
  let differingPixels = 0;
  let comparedPixels = 0;

  try {
    const pageCount = Math.min(originalDoc.countPages(), redactedDoc.countPages());

    for (let index = 0; index < pageCount; index += 1) {
      const boxes = byPage.get(index + 1) ?? [];
      const originalPage = originalDoc.loadPage(index);
      const redactedPage = redactedDoc.loadPage(index);
      let originalPix;
      let redactedPix;

      try {
        originalPix = renderPage(originalPage);
        redactedPix = renderPage(redactedPage);

        if (
          originalPix.width !== redactedPix.width ||
          originalPix.height !== redactedPix.height ||
          originalPix.components !== redactedPix.components
        ) {
          warnings.add('VISUAL_DIFF_OUTSIDE_BOXES');
          continue;
        }

        const { width, height, components } = originalPix;
        const before = originalPix.pixels;
        const after = redactedPix.pixels;

        for (let y = 0; y < height; y += 1) {
          const pdfY = y / RENDER_SCALE;
          // Only check boxes that cover this row — keeps large plans fast.
          const activeBoxes = boxes.filter(
            (box) => pdfY >= box.y && pdfY <= box.y + box.height,
          );

          for (let x = 0; x < width; x += 1) {
            const pdfX = x / RENDER_SCALE;
            if (activeBoxes.some((box) => pdfX >= box.x && pdfX <= box.x + box.width)) continue;

            const offset = (y * width + x) * components;
            comparedPixels += 1;

            for (let channel = 0; channel < components; channel += 1) {
              if (Math.abs(before[offset + channel] - after[offset + channel]) > COLOR_TOLERANCE) {
                differingPixels += 1;
                break;
              }
            }
          }
        }
      } finally {
        destroyAll([originalPix, redactedPix]);
        destroyAll([originalPage, redactedPage]);
      }
    }
  } catch {
    warnings.add('VISUAL_CHECK_UNAVAILABLE');
  } finally {
    destroyAll([originalDoc, redactedDoc]);
  }

  if (differingPixels > 0) warnings.add('VISUAL_DIFF_OUTSIDE_BOXES');

  return {
    status: warnings.size > 0 ? 'warning' : 'passed',
    warnings: [...warnings],
    differingPixels,
    comparedPixels,
  };
}
