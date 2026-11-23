/**
 * Unicode contact glyphs that some PDFs use instead of a drawn icon or a text
 * label. Shared by the icon-context scanner and the bbox mapper so a glyph can
 * never be included in the redaction box for the value beside it.
 */

const ICON_DEFINITIONS = [
  { kind: 'phone', pattern: /[\u260E\u2706\u237A]|\u{1F4DE}/u },
  { kind: 'email', pattern: /[\u2709\u2708]|\u{1F4E7}/u },
  { kind: 'location', pattern: /[\u{1F4CD}\u{1F4CC}]/u },
  { kind: 'website', pattern: /\u{1F310}/u },
  { kind: 'link', pattern: /\u{1F517}/u },
];

/** Approximate glyph width relative to one ordinary Latin character. */
export const ICON_WIDTH_UNITS = 1.7;

/** Return non-overlapping UTF-16 ranges for every contact glyph in a string. */
export function findUnicodeIconRanges(text) {
  const value = String(text ?? '');
  const ranges = [];

  for (const definition of ICON_DEFINITIONS) {
    const pattern = new RegExp(definition.pattern.source, 'gu');
    let match = pattern.exec(value);
    while (match !== null) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length,
        kind: definition.kind,
      });
      match = pattern.exec(value);
    }
  }

  ranges.sort((a, b) => a.start - b.start);

  // A glyph can belong to more than one definition (unlikely today); keep one.
  return ranges.filter((range, index) => index === 0 || range.start >= ranges[index - 1].end);
}

export function isUnicodeIconCharacter(character) {
  if (typeof character !== 'string' || character.length === 0) return false;
  return findUnicodeIconRanges(character).length > 0;
}

function unitsBetween(text, start, end) {
  let units = 0;
  let index = Math.max(0, start);
  const limit = Math.min(end, text.length);

  while (index < limit) {
    const codePoint = text.codePointAt(index);
    if (codePoint === undefined) break;
    const character = String.fromCodePoint(codePoint);
    units += isUnicodeIconCharacter(character) ? ICON_WIDTH_UNITS : 1;
    index += character.length;
  }

  return units;
}

/**
 * Approximate the sub-box of a character range inside one text item. Icon
 * glyphs are given extra width so the value beside one never inherits any of
 * the glyph's box. This is geometry metadata only — no text is returned.
 */
export function subBboxForRange(text, bbox, start, end) {
  if (!bbox || ![bbox.x, bbox.y, bbox.width, bbox.height].every(Number.isFinite)) return null;
  const total = unitsBetween(text, 0, text.length);
  if (total <= 0) return null;

  const before = unitsBetween(text, 0, start);
  const segment = unitsBetween(text, start, end);
  if (segment <= 0) return null;

  const round = (value) => Math.round(value * 100) / 100;
  return {
    x: round(bbox.x + (before / total) * bbox.width),
    y: round(bbox.y),
    width: round((segment / total) * bbox.width),
    height: round(bbox.height),
  };
}
