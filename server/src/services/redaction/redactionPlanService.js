import { randomUUID } from 'node:crypto';

import { ApiError } from '../../utils/ApiError.js';

const MAX_MANUAL_REGIONS = 200;
const VALID_DECISIONS = new Set(['accepted', 'rejected']);
const PRIVACY_CODES = new Set(['ENCRYPTED_PDF', 'NO_TEXT_LAYER', 'OCR_NO_TEXT']);
const FIDELITY_CODES = new Set([
  'DOCX_NO_COORDINATES',
  'DETECTIONS_WITHOUT_COORDINATES',
  'OCR_APPLIED',
  'OCR_REVIEW_REQUIRED',
  'OCR_NO_COORDINATES',
  'XFA_FORM_SUSPECTED',
  'DIGITAL_SIGNATURE_SUSPECTED',
]);

function round(value) {
  return Math.round(value * 100) / 100;
}

function finite(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pageFor(extraction, pageNumber) {
  return (extraction.pages ?? []).find((page) => page.pageNumber === pageNumber) ?? null;
}

function validateBBox(value, page, label) {
  if (!value || typeof value !== 'object') {
    throw ApiError.badRequest('INVALID_BBOX', `${label} must include a bounding box.`);
  }

  const x = finite(value.x);
  const y = finite(value.y);
  const width = finite(value.width);
  const height = finite(value.height);

  if ([x, y, width, height].some((number) => number === null) || width <= 0 || height <= 0) {
    throw ApiError.badRequest('INVALID_BBOX', `${label} has invalid dimensions.`);
  }

  if (page) {
    const tolerance = 0.5;
    if (
      x < -tolerance ||
      y < -tolerance ||
      x + width > page.width + tolerance ||
      y + height > page.height + tolerance
    ) {
      throw ApiError.badRequest('INVALID_BBOX', `${label} is outside the page.`);
    }
  }

  return { x: round(x), y: round(y), width: round(width), height: round(height) };
}

function sanitizeDetectionBoxes(detection, extraction) {
  if (!Array.isArray(detection.bboxes)) return [];

  return detection.bboxes
    .map((bbox, index) => {
      try {
        return validateBBox(bbox, pageFor(extraction, detection.pageNumber), `Box ${index + 1}`);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Build a privacy-safe plan from server-owned detections plus client-supplied
 * decisions and manual boxes. No matched value or document text is accepted.
 */
export function buildRedactionPlan(document, payload = {}) {
  const extraction = document.extraction;
  const detections = document.detections;

  if (!extraction || extraction.status !== 'ready') {
    throw ApiError.conflict(
      'EXTRACTION_REQUIRED',
      'Extract this document before saving a redaction plan.',
    );
  }
  if (!detections || detections.status !== 'ready') {
    throw ApiError.conflict(
      'DETECTION_REQUIRED',
      'Run detection before saving a redaction plan.',
    );
  }

  const decisions =
    payload.decisions && typeof payload.decisions === 'object' && !Array.isArray(payload.decisions)
      ? payload.decisions
      : {};
  const rawRegions = payload.manualRegions ?? [];

  if (!Array.isArray(rawRegions)) {
    throw ApiError.badRequest('INVALID_MANUAL_REGION', 'Manual regions must be a list.');
  }
  if (rawRegions.length > MAX_MANUAL_REGIONS) {
    throw ApiError.badRequest(
      'TOO_MANY_MANUAL_REGIONS',
      `A plan may contain at most ${MAX_MANUAL_REGIONS} manual regions.`,
    );
  }

  const detectionById = new Map(detections.detections.map((item) => [item.detectionId, item]));

  // 'undecided' is a natural UI state, not a corrupt payload. Treating it as
  // "no decision" produces a blocked plan (with an honest blocker) instead of
  // failing validation before the user can see what needs review.
  const normalizedDecisions = {};
  for (const [detectionId, decision] of Object.entries(decisions)) {
    if (!detectionById.has(detectionId)) {
      throw ApiError.badRequest(
        'INVALID_REVIEW_DECISION',
        'A review decision does not match this detection result.',
      );
    }
    if (decision === 'undecided') continue;
    if (!VALID_DECISIONS.has(decision)) {
      throw ApiError.badRequest(
        'INVALID_REVIEW_DECISION',
        'A review decision does not match this detection result.',
      );
    }
    normalizedDecisions[detectionId] = decision;
  }

  const privacyBlockers = new Set();
  const incomplete = detections.detections.filter(
    (detection) =>
      detection.needsReview && !VALID_DECISIONS.has(normalizedDecisions[detection.detectionId]),
  );
  if (incomplete.length > 0) {
    privacyBlockers.add('REVIEW_INCOMPLETE');
  }

  const items = [];

  for (const detection of detections.detections) {
    const decision =
      normalizedDecisions[detection.detectionId] ?? (detection.needsReview ? 'rejected' : 'accepted');
    if (decision !== 'accepted') continue;

    const bboxes = sanitizeDetectionBoxes(detection, extraction);
    if (bboxes.length === 0) privacyBlockers.add('ACCEPTED_WITHOUT_COORDINATES');

    items.push({
      itemId: randomUUID(),
      source: 'detection',
      detectionId: detection.detectionId,
      type: detection.type,
      method: detection.method,
      pageNumber: detection.pageNumber,
      bboxes,
      needsReview: detection.needsReview,
    });
  }

  rawRegions.forEach((region, index) => {
    if (!region || typeof region !== 'object') {
      throw ApiError.badRequest('INVALID_MANUAL_REGION', 'Manual region is malformed.');
    }

    const pageNumber = finite(region.pageNumber);
    if (!Number.isInteger(pageNumber) || !pageFor(extraction, pageNumber)) {
      throw ApiError.badRequest('INVALID_PAGE_NUMBER', 'Manual region page is not in this document.');
    }

    const bbox = validateBBox(region.bbox, pageFor(extraction, pageNumber), `Manual region ${index + 1}`);
    items.push({
      itemId: randomUUID(),
      source: 'manual',
      type: 'MANUAL',
      method: 'manual',
      pageNumber,
      bboxes: [bbox],
      needsReview: false,
    });
  });

  const warnings = new Set([
    ...(extraction.warnings ?? []),
    ...(detections.warnings ?? []),
  ]);
  if (rawRegions.length > 0) warnings.add('MANUAL_REGIONS_ADDED');

  for (const code of PRIVACY_CODES) {
    if (warnings.has(code)) privacyBlockers.add(code);
  }
  const fidelityWarnings = [...warnings].filter((code) => FIDELITY_CODES.has(code));

  const now = new Date().toISOString();
  return {
    planId: randomUUID(),
    documentId: document.documentId,
    status: privacyBlockers.size === 0 ? 'ready' : 'blocked',
    items,
    privacyBlockers: [...privacyBlockers],
    fidelityWarnings,
    warnings: [...warnings],
    createdAt: document.redactionPlan?.createdAt ?? now,
    updatedAt: now,
  };
}

export function saveRedactionPlan(document, payload) {
  document.redactionPlan = buildRedactionPlan(document, payload);
  return document.redactionPlan;
}

export function getRedactionPlan(document) {
  return document.redactionPlan ?? null;
}
