import api, { apiRequest } from './api.js';

/** Create the permanently rewritten PDF from the saved plan. */
export async function createRedaction(sessionId, documentId) {
  const response = await apiRequest({
    method: 'post',
    url: `/sessions/${sessionId}/documents/${documentId}/redact`,
  });
  return response.data;
}

/** Fetch the redacted PDF as a private blob (the token travels in the header). */
export async function downloadRedaction(sessionId, redactionId) {
  const response = await api.get(
    `/sessions/${sessionId}/redactions/${redactionId}/download`,
    { responseType: 'blob' },
  );
  return response.data;
}
