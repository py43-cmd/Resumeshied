/** Allowlist for detection results. Raw matched values never reach this layer. */

function toPublicDetection(detection) {
  return {
    detectionId: detection.detectionId,
    type: detection.type,
    method: detection.method,
    confidence: detection.confidence,
    pageNumber: detection.pageNumber,
    bboxes: detection.bboxes,
    maskedValue: detection.maskedValue,
    needsReview: detection.needsReview,
    ...(detection.reason ? { reason: detection.reason } : {}),
    ...(detection.iconContext
      ? {
          iconContext: detection.iconContext,
          ...(detection.iconHints ? { iconHints: detection.iconHints } : {}),
          ...(detection.iconContextSources
            ? { iconContextSources: detection.iconContextSources }
            : {}),
          ...(Number.isFinite(detection.iconDistancePoints)
            ? { iconDistancePoints: detection.iconDistancePoints }
            : {}),
        }
      : {}),
  };
}

export function toPublicDetections(result) {
  if (!result) {
    return {
      detectionStatus: 'pending',
      reasonCode: null,
      detectionCount: 0,
      needsReviewCount: 0,
      warnings: [],
      generatedAt: null,
      detections: [],
    };
  }

  return {
    detectionStatus: result.status,
    reasonCode: result.reasonCode ?? null,
    detectionCount: result.detections.length,
    needsReviewCount: result.detections.filter((detection) => detection.needsReview).length,
    warnings: result.warnings,
    generatedAt: result.generatedAt,
    detections: result.detections.map(toPublicDetection),
  };
}
