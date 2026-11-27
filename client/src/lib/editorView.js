/** Pure editor helpers. Coordinates are PDF points, top-left origin. No document text. */

export const PRIVACY_BLOCKER_MESSAGES = {
  REVIEW_INCOMPLETE: 'Some detections still need a Hide or Keep decision.',
  ACCEPTED_WITHOUT_COORDINATES:
    'A selected match has no page position and cannot be redacted reliably.',
  ENCRYPTED_PDF: 'Encrypted PDFs cannot be processed securely.',
  NO_TEXT_LAYER: 'No text layer was found. Run local OCR or mark areas manually.',
  OCR_NO_TEXT: 'Local OCR did not find enough readable text to redact safely.',
  NO_REDACTIONS_REQUESTED: 'No areas are marked to hide. Hide at least one match or add a manual area.',
};

export function bboxToPercent(bbox, pageWidth, pageHeight) {
  if (!bbox || !pageWidth || !pageHeight) return null;

  return {
    left: `${(Math.max(0, bbox.x) / pageWidth) * 100}%`,
    top: `${(Math.max(0, bbox.y) / pageHeight) * 100}%`,
    width: `${(Math.min(pageWidth, bbox.width) / pageWidth) * 100}%`,
    height: `${(Math.min(pageHeight, bbox.height) / pageHeight) * 100}%`,
  };
}

export function relativePoint(event, element, pageWidth, pageHeight) {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 0, y: 0 };

  return {
    x: Math.max(0, Math.min(pageWidth, ((event.clientX - rect.left) / rect.width) * pageWidth)),
    y: Math.max(0, Math.min(pageHeight, ((event.clientY - rect.top) / rect.height) * pageHeight)),
  };
}

/** Build a canonical top-left bbox from two pointer positions in PDF points. */
export function pointerToBbox(start, end, pageWidth, pageHeight) {
  if (!start || !end || !pageWidth || !pageHeight) return null;

  const width = Math.min(Math.abs(end.x - start.x), pageWidth);
  const height = Math.min(Math.abs(end.y - start.y), pageHeight);
  if (width < 2 || height < 2) return null;

  const rawX = Math.min(start.x, end.x);
  const rawY = Math.min(start.y, end.y);
  const x = Math.max(0, Math.min(pageWidth - width, rawX));
  const y = Math.max(0, Math.min(pageHeight - height, rawY));

  const round = (value) => Math.round(value * 100) / 100;
  return { x: round(x), y: round(y), width: round(width), height: round(height) };
}

export function groupByType(detections = []) {
  const groups = new Map();

  for (const detection of Array.isArray(detections) ? detections : []) {
    if (!groups.has(detection.type)) groups.set(detection.type, []);
    groups.get(detection.type).push(detection);
  }

  return [...groups.entries()]
    .sort(([typeA], [typeB]) => String(typeA).localeCompare(String(typeB)))
    .map(([type, items]) => ({ type, items }));
}

export function privacyBlockerMessages(codes = []) {
  const seen = new Set();

  return (Array.isArray(codes) ? codes : [])
    .filter((code) => typeof code === 'string' && code.trim() && !seen.has(code) && seen.add(code))
    .map((code) => ({
      code,
      message: PRIVACY_BLOCKER_MESSAGES[code] ?? `Privacy check failed: ${code}`,
    }));
}

export function planLabel(status) {
  if (status === 'ready') return 'Ready to export';
  if (status === 'blocked') return 'Blocked — action required';
  return 'Not saved yet';
}

/**
 * The UI keeps a per-detection decision including the natural 'undecided'
 * state. The plan API only accepts explicit accept/reject values, so drop
 * undecided (and any unexpected value) rather than sending an invalid payload.
 * Omitted detections are treated by the server as "no decision", which produces
 * an honest REVIEW_INCOMPLETE blocker instead of a 400.
 */
export function toPlanDecisions(reviewState = {}, detections = null) {
  const decisions = {};
  const state = reviewState && typeof reviewState === 'object' ? reviewState : {};
  const allowedIds = Array.isArray(detections)
    ? new Set(detections.map((item) => item?.detectionId).filter(Boolean))
    : null;

  for (const [detectionId, decision] of Object.entries(state)) {
    if (decision !== 'accepted' && decision !== 'rejected') continue;
    // Detection runs mint fresh IDs. React StrictMode (dev) can run the load
    // effect twice, leaving stale IDs merged into the review state. Never send
    // a decision for an ID that is not in the current detection result.
    if (allowedIds && !allowedIds.has(detectionId)) continue;
    decisions[detectionId] = decision;
  }

  return decisions;
}
