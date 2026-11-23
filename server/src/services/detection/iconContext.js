import { findUnicodeIconRanges, subBboxForRange } from './unicodeIcons.js';

/**
 * Icon context is a hint only. Vector and raster icons can be *located* but
 * not reliably named, so the value's own regex remains authoritative. All
 * data here is geometry/type metadata — no pixels, colours or raw values.
 */

const MAX_HORIZONTAL_GAP = 36;
const MAX_VERTICAL_GAP = 6;
const MAX_VERTICAL_STACK_GAP = 14;

function round(value) {
  return Math.round(value * 100) / 100;
}

/** Find Unicode contact glyphs inside text items, with approximate glyph boxes. */
function unicodeIconCandidates(textItems = []) {
  const found = [];
  for (const item of textItems) {
    const text = typeof item?.text === 'string' ? item.text : '';
    if (!text) continue;
    for (const range of findUnicodeIconRanges(text)) {
      const bbox = subBboxForRange(text, item.bbox, range.start, range.end);
      if (bbox) found.push({ kind: range.kind, source: 'unicode', bbox });
    }
  }
  return found;
}

function horizontalGap(textBox, iconBox) {
  if (iconBox.x + iconBox.width <= textBox.x) {
    return textBox.x - (iconBox.x + iconBox.width);
  }
  if (textBox.x + textBox.width <= iconBox.x) {
    return iconBox.x - (textBox.x + textBox.width);
  }
  return 0; // overlapping: treat as adjacent
}

function verticalGap(textBox, iconBox) {
  if (iconBox.y + iconBox.height <= textBox.y) {
    return textBox.y - (iconBox.y + iconBox.height);
  }
  if (textBox.y + textBox.height <= iconBox.y) {
    return iconBox.y - (textBox.y + textBox.height);
  }
  return 0;
}

function centersAlign(textBox, iconBox) {
  const iconCenterY = iconBox.y + iconBox.height / 2;
  if (
    iconCenterY >= textBox.y - MAX_VERTICAL_GAP &&
    iconCenterY <= textBox.y + textBox.height + MAX_VERTICAL_GAP
  ) {
    return true;
  }
  return iconBox.y >= textBox.y - MAX_VERTICAL_GAP && iconBox.y <= textBox.y + textBox.height + MAX_VERTICAL_GAP;
}

function horizontalCentersAlign(textBox, iconBox) {
  const iconCenterX = iconBox.x + iconBox.width / 2;
  return iconCenterX >= textBox.x - 6 && iconCenterX <= textBox.x + textBox.width + 6;
}

/** Smallest applicable gap, or Infinity when the boxes are not adjacent. */
function adjacencyGap(textBox, iconBox) {
  if (horizontalGap(textBox, iconBox) <= MAX_HORIZONTAL_GAP && centersAlign(textBox, iconBox)) {
    return horizontalGap(textBox, iconBox);
  }
  if (
    verticalGap(textBox, iconBox) <= MAX_VERTICAL_STACK_GAP &&
    horizontalCentersAlign(textBox, iconBox)
  ) {
    return verticalGap(textBox, iconBox);
  }
  return Infinity;
}

/**
 * Attach `iconHints` to detections that sit next to an icon on the same page.
 * Works for horizontal and vertical contact rows and for two-column layouts,
 * because association is purely geometric.
 */
export function attachIconContext(detections = [], pages = []) {
  const byPage = new Map();
  for (const page of Array.isArray(pages) ? pages : []) {
    if (!Number.isInteger(page?.pageNumber)) continue;
    const candidates = [
      ...(page.iconBoxes ?? []).map((bbox) => ({ kind: 'unknown', source: 'vector', bbox })),
      // A full-page scanned image is not a contact icon; only small embedded
      // images are considered as positional hints.
      ...(page.imageBoxes ?? [])
        .filter((bbox) => bbox && bbox.width <= 64 && bbox.height <= 64)
        .map((bbox) => ({ kind: 'unknown', source: 'image', bbox })),
      ...unicodeIconCandidates(page.textItems ?? []),
    ];
    byPage.set(page.pageNumber, candidates);
  }

  for (const detection of Array.isArray(detections) ? detections : []) {
    // Image detections are the icons themselves in many layouts; giving them
    // "near icon" hints would only add noise to the review UI.
    if (detection.type === 'IMAGE') continue;

    const boxes = Array.isArray(detection.bboxes) ? detection.bboxes : [];
    const candidates = byPage.get(detection.pageNumber);
    if (!candidates || boxes.length === 0) continue;

    const hints = [];
    let closest = Infinity;
    for (const candidate of candidates) {
      if (!candidate.bbox) continue;
      const gap = Math.min(...boxes.map((box) => adjacencyGap(box, candidate.bbox)));
      if (!Number.isFinite(gap)) continue;
      closest = Math.min(closest, gap);
      if (!hints.some((hint) => hint.kind === candidate.kind && hint.source === candidate.source)) {
        hints.push({ kind: candidate.kind, source: candidate.source });
      }
    }

    if (hints.length > 0) {
      const named = hints.find((hint) => hint.kind !== 'unknown');
      detection.iconHints = hints;
      detection.iconContext = named ? named.kind : 'near-icon';
      detection.iconContextSources = [...new Set(hints.map((hint) => hint.source))].sort();
      detection.iconDistancePoints = round(closest);
    }
  }

  return detections;
}
