import { ApiError } from '../utils/ApiError.js';

export function findDocument(session, documentId) {
  const file = session.files.get(documentId);
  if (!file) {
    throw ApiError.notFound('DOCUMENT_NOT_FOUND', 'This document does not exist in the session.');
  }
  return file;
}
