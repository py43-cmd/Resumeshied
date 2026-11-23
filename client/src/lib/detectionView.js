/** Pure presentation helpers. No detection value is ever reconstructed here. */

export const DETECTION_TYPE_LABELS = {
  NAME: 'Name',
  EMAIL: 'Email address',
  PHONE: 'Phone number',
  IMAGE: 'Image / logo',
  LINKEDIN: 'LinkedIn profile',
  GITHUB: 'GitHub profile',
  DOB: 'Date of birth',
  URL: 'Website / URL',
};

export const WARNING_MESSAGES = {
  OCR_REQUIRED: 'This document had no text layer. Local OCR is required before detection.',
  OCR_APPLIED: 'Local OCR was applied to a scanned page.',
  OCR_REVIEW_REQUIRED: 'OCR can misread text. Confirm every OCR-derived match before continuing.',
  OCR_NO_COORDINATES: 'OCR could not provide reliable positions for every match.',
  OCR_NO_TEXT: 'Local OCR did not find enough readable text to continue safely.',
  DETECTIONS_WITHOUT_COORDINATES:
    'Some matches have no page coordinates. Exact redaction placement cannot be guaranteed.',
  DOCX_NO_COORDINATES:
    'DOCX text has no page coordinates yet. A PDF conversion step will be required before export.',
  XFA_FORM_SUSPECTED: 'This PDF may contain form data that is not visible on the page.',
  DIGITAL_SIGNATURE_SUSPECTED: 'This PDF appears to contain a digital signature.',
  NO_TEXT_LAYER: 'No embedded text layer was found in this PDF.',
  ENCRYPTED_PDF: 'Encrypted PDFs cannot be processed.',
  PAGE_COUNT_CHANGED: 'The redacted PDF has a different page count than the original.',
  PAGE_DIMENSIONS_CHANGED: 'Some page dimensions changed during redaction. Review the result.',
  PDF_REQUIRED: 'Native redaction requires a PDF document.',
  VISUAL_DIFF_OUTSIDE_BOXES:
    'Something outside the approved redaction areas changed visually. Review the downloaded file.',
  VISUAL_CHECK_UNAVAILABLE:
    'Visual comparison could not be completed for this PDF. Formatting cannot be guaranteed.',
  TEXT_REMAINS_IN_BOX:
    'Text remained inside an approved redaction area. The file was not saved.',
  VERIFICATION_FAILED:
    'The final verification could not be completed. The file was not saved.',
};

export function typeLabel(type) {
  if (DETECTION_TYPE_LABELS[type]) return DETECTION_TYPE_LABELS[type];
  return String(type ?? 'Unknown')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function methodLabel(method) {
  if (method === 'regex') return 'Pattern match';
  if (method === 'heuristic') return 'Heuristic';
  if (method === 'image') return 'Image position';
  return String(method ?? 'Unknown');
}

export function confidencePercent(confidence) {
  if (confidence === null || confidence === undefined || confidence === '') return '—';

  const value = Number(confidence);
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}

export function warningMessages(warnings = []) {
  const seen = new Set();

  return (Array.isArray(warnings) ? warnings : [])
    .filter((code) => typeof code === 'string' && code.trim() && !seen.has(code) && seen.add(code))
    .map((code) => ({
      code,
      message: WARNING_MESSAGES[code] ?? `Additional check required: ${code}`,
    }));
}

export function groupDetectionsByPage(detections = []) {
  const groups = new Map();

  for (const detection of Array.isArray(detections) ? detections : []) {
    const pageNumber = Number.isInteger(detection.pageNumber) ? detection.pageNumber : null;
    if (!groups.has(pageNumber)) groups.set(pageNumber, []);
    groups.get(pageNumber).push(detection);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    })
    .map(([pageNumber, items]) => ({ pageNumber, detections: items }));
}

export function initialReviewState(detections = []) {
  return Object.fromEntries(
    (Array.isArray(detections) ? detections : []).map((detection) => [
      detection.detectionId,
      detection.needsReview ? 'undecided' : 'accepted',
    ]),
  );
}

export function reviewSummary(detections = [], reviewState = {}) {
  let accepted = 0;
  let rejected = 0;
  let undecided = 0;

  for (const detection of Array.isArray(detections) ? detections : []) {
    const decision =
      reviewState?.[detection.detectionId] ??
      (detection.needsReview ? 'undecided' : 'accepted');

    if (decision === 'accepted') accepted += 1;
    else if (decision === 'rejected') rejected += 1;
    else undecided += 1;
  }

  return {
    total: detections.length,
    accepted,
    rejected,
    undecided,
    ready: undecided === 0,
  };
}

export function decisionVariant(detection, decision) {
  if (decision === 'rejected') return 'muted';
  if (decision === 'accepted') return detection.needsReview ? 'warning' : 'success';
  return detection.needsReview ? 'warning' : 'outline';
}
