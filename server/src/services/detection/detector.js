import { randomUUID } from 'node:crypto';

import { maskValue } from './masking.js';
import { RULES, SECTION_HEADERS } from './rules.js';

function round(value) {
  return Math.round(value * 100) / 100;
}

/** Rebuild page text while remembering which character range came from which bbox. */
function buildPageTextWithMap(textItems = []) {
  let text = '';
  const spans = [];

  for (const item of textItems) {
    const value = typeof item.text === 'string' ? item.text : '';
    if (!value.trim()) continue;

    if (text.length > 0) text += ' ';
    const start = text.length;
    text += value;
    spans.push({ start, end: text.length, text: value, bbox: item.bbox ?? null });
  }

  return { text, spans };
}

function unionBBoxes(boxes) {
  if (boxes.length === 0) return null;

  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: round(x),
    y: round(y),
    width: round(right - x),
    height: round(bottom - y),
  };
}

function bboxesForRange(spans, start, end) {
  const boxes = spans
    .filter((span) => span.start < end && span.end > start)
    .map((span) => span.bbox)
    .filter(Boolean);

  const union = unionBBoxes(boxes);
  return union ? [union] : [];
}

function createDetection({
  type,
  method,
  confidence,
  pageNumber,
  bboxes,
  value,
  reason,
}) {
  const score = round(confidence);

  return {
    detectionId: randomUUID(),
    type,
    method,
    confidence: score,
    pageNumber,
    bboxes,
    maskedValue: maskValue(value, type),
    needsReview: score < 0.85 || method === 'heuristic' || bboxes.length === 0,
    ...(reason ? { reason } : {}),
  };
}

function applyRules(text, spans, pageNumber) {
  const detections = [];
  const claimedRanges = [];

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let match = rule.pattern.exec(text);

    while (match !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (rule.isValid && !rule.isValid(match)) {
        match = rule.pattern.exec(text);
        continue;
      }

      const overlapsClaimed = claimedRanges.some(
        (range) => start < range.end && end > range.start,
      );

      if (!overlapsClaimed) {
        const confidence =
          typeof rule.confidence === 'function' ? rule.confidence(match) : rule.confidence;
        const reason =
          typeof rule.reason === 'function' ? rule.reason(match) : rule.reason;

        if (Number.isFinite(confidence) && confidence > 0) {
          detections.push(
            createDetection({
              type: rule.type,
              method: rule.method,
              confidence,
              pageNumber,
              bboxes: bboxesForRange(spans, start, end),
              value: match[0],
              reason,
            }),
          );
          claimedRanges.push({ start, end });
        }
      }

      match = rule.pattern.exec(text);
    }
  }

  return { detections, claimedRanges };
}

function looksLikeName(value) {
  const candidate = String(value ?? '').trim();
  if (!candidate || candidate.length > 60) return false;
  if (/[0-9@/\\]/.test(candidate)) return false;
  if (/https?:\/\//i.test(candidate)) return false;

  const normalized = candidate
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (SECTION_HEADERS.has(normalized)) return false;

  const tokens = candidate.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 4) return false;

  return tokens.every((token) => /^[A-Z][A-Za-z'’-]*$/.test(token));
}

function detectNamesFromItems(textItems, spans, claimedRanges, pageNumber) {
  const detections = [];

  for (const item of (textItems ?? []).slice(0, 5)) {
    const value = item.text?.trim();
    if (!looksLikeName(value)) continue;

    const span = spans.find((entry) => entry.text === item.text);
    if (span && claimedRanges.some((range) => span.start < range.end && span.end > range.start)) {
      continue;
    }

    detections.push(
      createDetection({
        type: 'NAME',
        method: 'heuristic',
        confidence: 0.55,
        pageNumber,
        bboxes: item.bbox ? [item.bbox] : [],
        value,
        reason: 'Heuristic first-line name; confirm manually',
      }),
    );
  }

  return detections;
}

function detectTextOnly(fullText) {
  const { detections } = applyRules(String(fullText ?? ''), [], null);
  const lines = String(fullText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  for (const line of lines) {
    if (!looksLikeName(line)) continue;
    detections.push(
      createDetection({
        type: 'NAME',
        method: 'heuristic',
        confidence: 0.55,
        pageNumber: null,
        bboxes: [],
        value: line,
        reason: 'Heuristic first-line name; confirm manually',
      }),
    );
  }

  return detections;
}

export function runDetection(extraction) {
  const generatedAt = new Date().toISOString();

  if (!extraction || extraction.status !== 'ready') {
    const needsOcr = extraction?.status === 'needs_ocr';
    return {
      status: needsOcr ? 'needs_ocr' : 'unavailable',
      reasonCode: extraction?.reasonCode ?? 'NO_EXTRACTION',
      detections: [],
      warnings: needsOcr ? ['OCR_REQUIRED'] : [],
      generatedAt,
    };
  }

  const warnings = new Set(extraction.warnings ?? []);
  const pages = extraction.pages ?? [];

  if (!extraction.hasCoordinates || pages.length === 0) {
    warnings.add('DETECTIONS_WITHOUT_COORDINATES');
    return {
      status: 'ready',
      reasonCode: null,
      detections: detectTextOnly(extraction.fullText),
      warnings: [...warnings],
      generatedAt,
    };
  }

  const detections = [];

  for (const page of pages) {
    const { text, spans } = buildPageTextWithMap(page.textItems);
    if (!text) continue;

    const { detections: ruleDetections, claimedRanges } = applyRules(
      text,
      spans,
      page.pageNumber,
    );
    detections.push(...ruleDetections);
    detections.push(
      ...detectNamesFromItems(page.textItems, spans, claimedRanges, page.pageNumber),
    );
  }

  return {
    status: 'ready',
    reasonCode: null,
    detections,
    warnings: [...warnings],
    generatedAt,
  };
}
