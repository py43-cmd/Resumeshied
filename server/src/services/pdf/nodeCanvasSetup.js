// pdfjs-dist expects browser-like canvas globals in Node.js. They must be
// installed before pdfjs is imported, so this module is imported first.
import canvasModule from 'canvas';

const { createCanvas, DOMMatrix, Image, ImageData, loadImage } = canvasModule;

if (!globalThis.Image) globalThis.Image = Image;
if (!globalThis.ImageData) globalThis.ImageData = ImageData;
if (!globalThis.DOMMatrix) globalThis.DOMMatrix = DOMMatrix;
// Path2D is intentionally left for pdfjs to polyfill from @napi-rs/canvas;
// the canvas package does not export it, but its context accepts that object.

if (!globalThis.createImageBitmap) {
  globalThis.createImageBitmap = async (source) => {
    if (
      source instanceof Image ||
      (source && typeof source === 'object' && typeof source.getContext === 'function')
    ) {
      return source;
    }

    let buffer;
    if (Buffer.isBuffer(source)) {
      buffer = source;
    } else if (source instanceof Uint8Array) {
      buffer = Buffer.from(source);
    } else if (source && typeof source.arrayBuffer === 'function') {
      buffer = Buffer.from(await source.arrayBuffer());
    } else if (typeof source === 'string') {
      buffer = Buffer.from(source, 'latin1');
    } else {
      throw new TypeError('Unsupported image source for createImageBitmap');
    }

    return loadImage(buffer);
  };
}

export class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(Math.max(1, width), Math.max(1, height));
    return {
      canvas,
      context: canvas.getContext('2d', { willReadFrequently: true }),
    };
  }

  reset(entry, width, height) {
    if (!entry?.canvas) throw new Error('Canvas is not specified');
    entry.canvas.width = Math.max(1, width);
    entry.canvas.height = Math.max(1, height);
  }

  destroy(entry) {
    if (!entry?.canvas) return;
    entry.canvas.width = 0;
    entry.canvas.height = 0;
  }
}

export function createRenderingCanvas(width, height) {
  const canvas = createCanvas(Math.max(1, width), Math.max(1, height));
  return {
    canvas,
    context: canvas.getContext('2d', { willReadFrequently: true }),
  };
}
