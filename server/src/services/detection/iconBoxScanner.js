import * as mupdf from 'mupdf';

const MIN_SIZE = 6;
const MAX_SIZE = 48;

function round(value) {
  return Math.round(value * 100) / 100;
}

/** CTM maps a local unit square onto the page; return a top-left PDF bbox. */
function bboxFromCtm(ctm) {
  if (!Array.isArray(ctm) || ctm.length !== 6) return null;
  const [a, b, c, d, e, f] = ctm.map(Number);
  if (![a, b, c, d, e, f].every(Number.isFinite)) return null;

  const x1 = a + c + e;
  const y1 = b + d + f;
  return {
    x: round(Math.min(e, x1)),
    y: round(Math.min(f, y1)),
    width: round(Math.abs(x1 - e)),
    height: round(Math.abs(y1 - f)),
  };
}

function bboxFromPath(path, ctm) {
  try {
    const local = path.getBounds(null, mupdf.Matrix.identity);
    const [x0, y0, x1, y1] = mupdf.Rect.transform(local, ctm);
    return {
      x: round(Math.min(x0, x1)),
      y: round(Math.min(y0, y1)),
      width: round(Math.abs(x1 - x0)),
      height: round(Math.abs(y1 - y0)),
    };
  } catch {
    return bboxFromCtm(ctm);
  }
}

function isIconSized(box) {
  if (!box) return false;
  const { width, height } = box;
  if (width < MIN_SIZE || height < MIN_SIZE || width > MAX_SIZE || height > MAX_SIZE) {
    return false;
  }
  const ratio = width / height;
  return ratio >= 0.35 && ratio <= 2.8;
}

/**
 * Locate raster images and small vector drawings in page content. Only their
 * positions are returned — no image bytes, colours or path data are kept.
 */
export function scanPdfGraphics(bytes) {
  const images = [];
  const icons = [];

  let doc;
  try {
    doc = mupdf.Document.openDocument(new Uint8Array(bytes), 'application/pdf').asPDF();
  } catch {
    return { images, icons };
  }

  try {
    for (let index = 0; index < doc.countPages(); index += 1) {
      const pageImages = [];
      const pageIcons = [];
      const page = doc.loadPage(index);
      let device;

      try {
        device = new mupdf.Device({
          fillImage(_image, ctm) {
            const box = bboxFromCtm(ctm);
            if (box && box.width >= 8 && box.height >= 8) pageImages.push(box);
          },
          fillPath(path, _evenOdd, ctm) {
            const box = bboxFromPath(path, ctm);
            if (isIconSized(box)) pageIcons.push(box);
          },
          strokePath(path, _stroke, ctm) {
            const box = bboxFromPath(path, ctm);
            if (isIconSized(box)) pageIcons.push(box);
          },
        });
        page.runPageContents(device, mupdf.Matrix.identity);
      } catch {
        // Best-effort: unusual graphics must never break text extraction.
      } finally {
        try {
          device?.close();
        } catch {
          // Disposal is best-effort.
        }
        page.destroy();
      }

      if (pageImages.length) images.push({ pageNumber: index + 1, boxes: pageImages });
      if (pageIcons.length) icons.push({ pageNumber: index + 1, boxes: pageIcons });
    }
  } finally {
    doc.destroy();
  }

  return { images, icons };
}
