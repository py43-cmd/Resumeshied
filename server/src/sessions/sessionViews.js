/** Views deliberately omit token, directory and stored file names. */

export function remainingSeconds(session) {
  return Math.max(0, Math.ceil((session.expiresAtMs - Date.now()) / 1000));
}

export function toPublicFile(file) {
  return {
    documentId: file.documentId,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    mimeType: file.mimeType,
    extension: file.extension,
    extractionStatus: file.extractionStatus,
    uploadedAt: file.uploadedAt,
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
