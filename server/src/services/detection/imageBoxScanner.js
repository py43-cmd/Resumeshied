import * as mupdf from 'mupdf';

const MIN_WIDTH = 8;
const MIN_HEIGHT = 8;

function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Turn the image CTM (which maps the unit square onto the page) into our
 * canonical top-left bbox in PDF points. MuPDF reports page coordinates with a
 * top-left origin, the same space used for text boxes and redaction boxes.
 */
function bboxFromCtm(ctm) {
  if (!Array.isArray(ctm) || ctm.length !== 6) return null;
  const [a, b, c, d, e, f] = ctm.map(Number);
  if (![a, b, c, d, e, f].every(Number.isFinite)) return null;

  const x1 = a + c + e;
  const y1 = b + d + f;
  const x = Math.min(e, x1);
  const y = Math.min(f, y1);
  const width = Math.abs(x1 - e);
  const height = Math.abs(y1 - f);

  return { x: round(x), y: round(y), width: round(width), height: round(height) };
}

/**
 * Locate every raster image drawn in the page content using a local MuPDF
 * device. No image pixels or bytes leave this process — only positions.
 */
export function scanPdfImageBoxes(bytes) {
  let doc;
  try {
    doc = mupdf.Document.openDocument(new Uint8Array(bytes), 'application/pdf').asPDF();
  } catch {
    // Image discovery is best-effort; text extraction must still succeed.
    return [];
  }

  const result = [];
  try {
    for (let index = 0; index < doc.countPages(); index += 1) {
      const boxes = [];
      const page = doc.loadPage(index);
      let device;

      try {
        device = new mupdf.Device({
          fillImage(_image, ctm) {
            const bbox = bboxFromCtm(ctm);
            if (!bbox || bbox.width < MIN_WIDTH || bbox.height < MIN_HEIGHT) return;
            boxes.push(bbox);
          },
        });
        page.runPageContents(device, mupdf.Matrix.identity);
      } catch {
        // A page with unusual graphics must not break the whole document.
      } finally {
        try {
          device?.close();
        } catch {
          // Best-effort disposal.
        }
        page.destroy();
      }

      if (boxes.length > 0) {
        result.push({ pageNumber: index + 1, boxes });
      }
    }
  } finally {
    doc.destroy();
  }

  return result;
}
