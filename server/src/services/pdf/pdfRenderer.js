// Must come before pdfjs import: it installs the Node canvas globals.
import { NodeCanvasFactory, createRenderingCanvas } from './nodeCanvasSetup.js';

import fs from 'node:fs/promises';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import { ApiError } from '../../utils/ApiError.js';

export const OCR_RENDER_SCALE = 2;
export const PREVIEW_SCALE = 1.5;

async function openPdf(absolutePath) {
  const bytes = await fs.readFile(absolutePath);

  try {
    return await pdfjsLib.getDocument({
      data: new Uint8Array(bytes),
      CanvasFactory: NodeCanvasFactory,
      verbosityLevel: 0,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
  } catch {
    throw ApiError.unprocessable(
      'PDF_RENDER_FAILED',
      'We could not render this PDF for local processing.',
    );
  }
}

async function rasterizePage(page, pageNumber, scale) {
  const viewport = page.getViewport({ scale });
  const rasterWidth = Math.max(1, Math.floor(viewport.width));
  const rasterHeight = Math.max(1, Math.floor(viewport.height));
  const { canvas, context } = createRenderingCanvas(rasterWidth, rasterHeight);

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, rasterWidth, rasterHeight);

  await page.render({ canvasContext: context, viewport }).promise;

  const result = {
    pageNumber,
    scale,
    width: viewport.width / scale,
    height: viewport.height / scale,
    rasterWidth,
    rasterHeight,
    pngBuffer: canvas.toBuffer('image/png'),
  };

  page.cleanup();
  return result;
}

/** Rasterize every page locally for OCR. Geometry is returned in PDF points. */
export async function renderPdfPages(absolutePath, { scale = OCR_RENDER_SCALE } = {}) {
  const pdf = await openPdf(absolutePath);

  try {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      pages.push(await rasterizePage(page, pageNumber, scale));
    }
    return pages;
  } catch {
    throw ApiError.unprocessable(
      'PDF_RENDER_FAILED',
      'We could not render this PDF for local processing.',
    );
  } finally {
    await pdf.destroy();
  }
}

/** Rasterize one original page for the editor preview. */
export async function renderPdfPage(absolutePath, pageNumber, { scale = PREVIEW_SCALE } = {}) {
  const pdf = await openPdf(absolutePath);

  try {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdf.numPages) {
      throw ApiError.badRequest('INVALID_PAGE_NUMBER', 'That page does not exist in this PDF.');
    }

    const page = await pdf.getPage(pageNumber);
    return await rasterizePage(page, pageNumber, scale);
  } catch (error) {
    if (error?.isOperational) throw error;
    throw ApiError.unprocessable(
      'PDF_RENDER_FAILED',
      'We could not render this PDF page for local processing.',
    );
  } finally {
    await pdf.destroy();
  }
}
