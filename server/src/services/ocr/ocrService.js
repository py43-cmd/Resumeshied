import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createWorker } from 'tesseract.js';

import { renderPdfPages } from '../pdf/pdfRenderer.js';
import { ApiError } from '../../utils/ApiError.js';

const SERVER_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const LANG_PATH = path.join(
  SERVER_ROOT,
  'node_modules',
  '@tesseract.js-data',
  'eng',
  '4.0.0_best_int',
);
const ENGINE = 'tesseract.js';
const LANGUAGE = 'eng';

function round(value) {
  return Math.round(value * 100) / 100;
}

async function createLocalOcrWorker() {
  try {
    await fs.access(path.join(LANG_PATH, 'eng.traineddata.gz'));
  } catch {
    throw ApiError.internal(
      'OCR_UNAVAILABLE',
      'Local OCR language data is not installed on this server.',
    );
  }

  try {
    return await createWorker(LANGUAGE, 1, {
      langPath: LANG_PATH,
      gzip: true,
      cacheMethod: 'readOnly',
      logger: () => {},
    });
  } catch {
    throw ApiError.internal('OCR_UNAVAILABLE', 'Local OCR could not be started.');
  }
}

function toCanonicalBBox(box, page, scale) {
  if (!box) return null;

  const x0 = Number(box.x0);
  const y0 = Number(box.y0);
  const x1 = Number(box.x1);
  const y1 = Number(box.y1);
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;

  const left = Math.max(0, Math.min(page.width, Math.min(x0, x1) / scale));
  const top = Math.max(0, Math.min(page.height, Math.min(y0, y1) / scale));
  const right = Math.max(0, Math.min(page.width, Math.max(x0, x1) / scale));
  const bottom = Math.max(0, Math.min(page.height, Math.max(y0, y1) / scale));

  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;

  return {
    x: round(left),
    y: round(top),
    width: round(width),
    height: round(height),
  };
}

function cleanLineText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTextItems(data, page, scale) {
  const items = [];

  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const text = cleanLineText(line.text);
        if (!text) continue;

        const bbox = toCanonicalBBox(line.bbox, page, scale);
        const lineConfidence = Number(line.confidence);

        items.push({
          text,
          bbox,
          fontName: 'ocr',
          height: bbox ? bbox.height : round(page.height * 0.02),
          direction: 'ltr',
          ...(Number.isFinite(lineConfidence)
            ? { ocrConfidence: round(lineConfidence / 100) }
            : {}),
        });
      }
    }
  }

  if (items.length === 0) {
    for (const line of String(data.text ?? '').split('\n')) {
      const text = cleanLineText(line);
      if (!text) continue;

      items.push({
        text,
        bbox: null,
        fontName: 'ocr',
        height: round(page.height * 0.02),
        direction: 'ltr',
      });
    }
  }

  return items;
}

async function recognizePage(worker, renderedPage, page) {
  try {
    const { data } = await worker.recognize(
      renderedPage.pngBuffer,
      {},
      { text: true, blocks: true },
    );

    const textItems = buildTextItems(data, page, renderedPage.scale);
    const confidence = Number.isFinite(Number(data.confidence))
      ? Number(data.confidence)
      : 0;

    return {
      textItems,
      text: textItems.map((item) => item.text).join('\n'),
      confidence,
    };
  } catch {
    throw ApiError.unprocessable(
      'OCR_FAILED',
      'Local OCR could not read this PDF page.',
      { pageNumber: renderedPage.pageNumber },
    );
  }
}

/**
 * OCR a PDF that extraction honestly reported as having no text layer.
 * Only safe summary metadata is attached to extraction; recognized text stays
 * inside the short-lived session object and is never returned by an API view.
 */
export async function ocrPdfDocument(document) {
  const existing = document.extraction;
  if (!existing || existing.status !== 'needs_ocr') {
    throw ApiError.conflict(
      'OCR_NOT_REQUIRED',
      'OCR is only available for documents that need a text layer.',
    );
  }

  const renderedPages = await renderPdfPages(document.absolutePath);
  const worker = await createLocalOcrWorker();

  try {
    const pages = [];
    let lineCount = 0;
    let weightedConfidence = 0;

    for (const renderedPage of renderedPages) {
      const originalPage =
        (existing.pages ?? []).find((page) => page.pageNumber === renderedPage.pageNumber) ?? {};

      const page = {
        pageNumber: renderedPage.pageNumber,
        width: originalPage.width ?? renderedPage.width,
        height: originalPage.height ?? renderedPage.height,
        rotation: originalPage.rotation ?? 0,
      };

      const recognized = await recognizePage(worker, renderedPage, page);
      const hasLineBoxes = recognized.textItems.some((item) => item.bbox);

      pages.push({
        ...page,
        textItems: recognized.textItems,
        text: recognized.text,
        imageDrawCount: originalPage.imageDrawCount ?? 0,
        annotationCount: originalPage.annotationCount ?? 0,
      });

      lineCount += recognized.textItems.length;
      weightedConfidence += recognized.confidence * recognized.textItems.length;

      if (!hasLineBoxes) {
        // Keep processing: redaction can still be attempted text-only, but the
        // caller must be warned that exact placement cannot be guaranteed.
        pages[pages.length - 1].hasCoordinates = false;
      }
    }

    const fullText = pages.map((page) => page.text).join('\n');
    const characterCount = fullText.replace(/\s/g, '').length;
    const hasText = characterCount >= 16;
    const hasCoordinates = pages.every((page) => page.hasCoordinates !== false);
    const averageConfidence =
      lineCount > 0 ? round(weightedConfidence / lineCount / 100) : 0;

    const warnings = new Set([
      ...(existing.warnings ?? []),
      'OCR_APPLIED',
      'OCR_REVIEW_REQUIRED',
    ]);
    if (!hasCoordinates) warnings.add('OCR_NO_COORDINATES');

    return {
      ...existing,
      status: hasText ? 'ready' : 'failed',
      reasonCode: hasText ? null : 'OCR_NO_TEXT',
      pages,
      fullText,
      hasTextLayer: hasText,
      hasCoordinates,
      source: 'ocr',
      warnings: [...warnings],
      ocr: {
        engine: ENGINE,
        language: LANGUAGE,
        averageConfidence,
        lineCount,
        renderScale: renderedPages[0]?.scale ?? 1,
        performedAt: new Date().toISOString(),
      },
    };
  } finally {
    await worker.terminate();
  }
}
