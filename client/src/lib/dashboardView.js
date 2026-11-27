/** Pure helpers for choosing the next resume action. No document data. */

export function resumeAction({
  isActive = false,
  documentId = null,
  redactionId = null,
  activeFile = null,
  reviewDocumentId = null,
} = {}) {
  if (!isActive || !documentId) {
    return { to: '/upload', label: 'Upload a resume', status: 'No active document' };
  }

  if (redactionId) {
    return {
      to: `/export/${documentId}`,
      label: 'Open download',
      status: 'Redaction ready',
    };
  }

  if (activeFile?.redactionPlanStatus === 'ready') {
    return {
      to: `/export/${documentId}`,
      label: 'Open export',
      status: 'Review saved',
    };
  }

  if (reviewDocumentId === documentId || activeFile?.redactionPlanStatus === 'blocked') {
    return {
      to: `/editor/${documentId}`,
      label: 'Resume redaction',
      status: 'Review needed',
    };
  }

  if (['ready', 'needs_ocr'].includes(activeFile?.extractionStatus)) {
    return {
      to: `/detect/${documentId}`,
      label: 'Continue detection',
      status: 'Ready to review',
    };
  }

  return {
    to: `/detect/${documentId}`,
    label: 'Continue',
    status: activeFile?.extractionStatus ?? 'Pending',
  };
}

export function sessionStatusLabel(isActive, extractionStatus) {
  if (!isActive) return 'No session';
  if (extractionStatus === 'needs_ocr') return 'OCR required';
  if (extractionStatus === 'unsupported' || extractionStatus === 'failed') return 'Needs attention';
  if (extractionStatus === 'ready') return 'Document ready';
  return 'Session active';
}
