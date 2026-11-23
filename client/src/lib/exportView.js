/** Pure status helpers for the export verification UI. No document data. */

export const EXPORT_CHECKS = [
  { key: 'text', label: 'Selected content permanently removed from the PDF' },
  { key: 'geometry', label: 'Text layer verified against the original page geometry' },
  { key: 'cleanup', label: 'Existing annotations, embedded files and standard metadata cleared' },
  { key: 'rewrite', label: 'File rewritten without incremental history' },
  { key: 'visual', label: 'Untouched page areas render identically to the original' },
];

const GEOMETRY_WARNINGS = new Set(['PAGE_COUNT_CHANGED', 'PAGE_DIMENSIONS_CHANGED']);

/** Privacy checks block export; fidelity checks only annotate the result. */
export function checkStatus(check, result, warningCodes = []) {
  const verification = result?.verification ?? {};
  const codes = Array.isArray(warningCodes) ? warningCodes : [];

  if (check.key === 'visual') {
    if (codes.includes('VISUAL_DIFF_OUTSIDE_BOXES')) return 'warning';
    if (verification.fidelity?.status === 'unverifiable') return 'warning';
    return 'pass';
  }

  if (check.key === 'geometry' && codes.some((code) => GEOMETRY_WARNINGS.has(code))) {
    return 'warning';
  }

  if (verification.privacy?.status === 'passed') return 'pass';
  if (verification.privacy?.status === 'failed') return 'fail';
  return 'warning';
}
