/** Views deliberately omit token, directory, stored file names and extracted text. */

export function remainingSeconds(session) {
  return Math.max(0, Math.ceil((session.expiresAtMs - Date.now()) / 1000));
}

function toPublicOcr(ocr) {
  return {
    engine: ocr.engine,
    language: ocr.language,
    averageConfidence: ocr.averageConfidence,
    lineCount: ocr.lineCount,
    renderScale: ocr.renderScale,
    performedAt: ocr.performedAt,
  };
}

function toPublicExtraction(extraction) {
  return {
    status: extraction.status,
    reasonCode: extraction.reasonCode,
    pageCount: extraction.pageCount,
    hasTextLayer: extraction.hasTextLayer,
    hasCoordinates: extraction.hasCoordinates,
    warnings: extraction.warnings,
    source: extraction.source,
    ...(extraction.ocr ? { ocr: toPublicOcr(extraction.ocr) } : {}),
    pageGeometry: (extraction.pages ?? []).map((page) => ({
      pageNumber: page.pageNumber,
      width: page.width,
      height: page.height,
      rotation: page.rotation,
      textItemCount: page.textItems.length,
      imageDrawCount: page.imageDrawCount,
      annotationCount: page.annotationCount,
    })),
  };
}

export function toPublicFile(file) {
  return {
    documentId: file.documentId,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    mimeType: file.mimeType,
    extension: file.extension,
    extractionStatus: file.extraction?.status ?? 'pending',
    redactionPlanStatus: file.redactionPlan?.status ?? 'pending',
    uploadedAt: file.uploadedAt,
    ...(file.extraction ? { extraction: toPublicExtraction(file.extraction) } : {}),
  };
}

export function toPublicSession(session) {
  return {
    sessionId: session.id,
    token: session.token,
    createdAt: session.createdAt,
    expiresAt: new Date(session.expiresAtMs).toISOString(),
    files: [...session.files.values()].map(toPublicFile),
  };
}
