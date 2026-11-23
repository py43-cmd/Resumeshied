// Must come before pdfjs import: it installs the Node canvas globals.
import { NodeCanvasFactory, createRenderingCanvas } from './nodeCanvasSetup.js';

import fs from 'node:fs/promises';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import { ApiError } from '../../utils/ApiError.js';

export const OCR_RENDER_SCALE = 2;

/**
 * Rasterize every PDF page locally. Returns PNG buffers plus geometry in PDF
 * points so OCR boxes can be converted back into our canonical coordinate space.
 */
export async function renderPdfPages(absolutePath, { scale = OCR_RENDER_SCALE } = {}) {
  const bytes = await fs.readFile(absolutePath);

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(bytes),
      CanvasFactory: NodeCanvasFactory,
      verbosityLevel: 0,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
  } catch {
    throw ApiError.unprocessable(
      'PDF_RENDER_FAILED',
      'We could not render this PDF for local OCR.',
    );
  }

  try {
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const rasterWidth = Math.max(1, Math.floor(viewport.width));
      const rasterHeight = Math.max(1, Math.floor(viewport.height));
      const { canvas, context } = createRenderingCanvas(rasterWidth, rasterHeight);

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, rasterWidth, rasterHeight);

      await page.render({ canvasContext: context, viewport }).promise;

      pages.push({
        pageNumber,
        scale,
        width: viewport.width / scale,
        height: viewport.height / scale,
        rasterWidth,
        rasterHeight,
        pngBuffer: canvas.toBuffer('image/png'),
      });

      page.cleanup();
    }

    return pages;
  } catch {
    throw ApiError.unprocessable(
      'PDF_RENDER_FAILED',
      'We could not render this PDF for local OCR.',
    );
  } finally {
    await pdf.destroy();
  }
}
