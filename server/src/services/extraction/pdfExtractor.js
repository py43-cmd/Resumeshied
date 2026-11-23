// Install canvas globals before pdfjs is evaluated.
import '../pdf/nodeCanvasSetup.js';

import fs from 'node:fs/promises';

// The legacy build is required for Node.js in pdfjs-dist 4.x.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import { ApiError } from '../../utils/ApiError.js';

const MIN_TEXT_CHARACTERS = 16;
const IMAGE_OPERATORS = new Set([
  pdfjsLib.OPS.paintImageXObject,
  pdfjsLib.OPS.paintInlineImageXObject,
  pdfjsLib.OPS.paintImageMaskXObject,
]);

function round(value) {
  return Math.round(value * 100) / 100;
}

/** Convert pdfjs text transforms into our canonical top-left bbox (points). */
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

function scanRawWarnings(bytes) {
  const raw = Buffer.from(bytes).toString('latin1');
  const warnings = [];

  if (/\/XFA\b/.test(raw)) warnings.push('XFA_FORM_SUSPECTED');
  if (/\/Subtype\s*\/Sig\b/.test(raw) && /\/ByteRange\b/.test(raw)) {
    warnings.push('DIGITAL_SIGNATURE_SUSPECTED');
  }

  return warnings;
}

function isEncryptionError(error) {
  return (
    error?.name === 'PasswordException' ||
    /password|encrypted/i.test(error?.message ?? '')
  );
}

export async function extractPdf(absolutePath) {
  const bytes = await fs.readFile(absolutePath);
  const warnings = scanRawWarnings(bytes);

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(bytes),
      verbosityLevel: 0,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
  } catch (error) {
    if (isEncryptionError(error)) {
      return {
        status: 'unsupported',
        reasonCode: 'ENCRYPTED_PDF',
        pageCount: null,
        pages: [],
        fullText: '',
        hasTextLayer: false,
        hasCoordinates: false,
        warnings,
        source: 'pdf',
      };
    }
    throw ApiError.unprocessable(
      'PDF_PARSE_FAILED',
      'We could not read this PDF. It may be damaged or unsupported.',
    );
  }

  try {
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();

      const textItems = textContent.items
        .filter((item) => typeof item.str === 'string' && item.str.trim().length > 0)
        .map((item) => ({
          text: item.str,
          bbox: toBoundingBox(item, viewport),
          fontName: item.fontName ?? null,
          height: round(Math.abs(item.height) || 12),
          direction: item.dir ?? 'ltr',
        }));

      let imageDrawCount = 0;
      try {
        const operators = await page.getOperatorList();
        for (const operator of operators.fnArray) {
          if (IMAGE_OPERATORS.has(operator)) imageDrawCount += 1;
        }
      } catch {
        // Image inspection is best-effort; text extraction still succeeds.
      }

      let annotationCount = 0;
      try {
        const annotations = await page.getAnnotations({ intent: 'display' });
        annotationCount = annotations.length;
      } catch {
        // Annotation inspection is best-effort.
      }

      pages.push({
        pageNumber,
        width: round(viewport.width),
        height: round(viewport.height),
        rotation: page.rotate ?? 0,
        textItems,
        text: textItems.map((item) => item.text).join(' '),
        imageDrawCount,
        annotationCount,
      });

      page.cleanup();
    }

    const fullText = pages.map((page) => page.text).join('\n');
    const characterCount = fullText.replace(/\s/g, '').length;
    const hasTextLayer = characterCount >= MIN_TEXT_CHARACTERS;

    return {
      status: hasTextLayer ? 'ready' : 'needs_ocr',
      reasonCode: hasTextLayer ? null : 'NO_TEXT_LAYER',
      pageCount: pdf.numPages,
      pages,
      fullText,
      hasTextLayer,
      hasCoordinates: true,
      warnings,
      source: 'pdf',
    };
  } finally {
    await pdf.destroy();
  }
}
