import api, { apiRequest } from './api.js';

/** Fetch an original PDF page as a private PNG blob (no-store on the server). */
export async function getPagePreview(sessionId, documentId, pageNumber) {
  const response = await api.get(
    `/sessions/${sessionId}/documents/${documentId}/pages/${pageNumber}/preview`,
    { responseType: 'blob' },
  );
  return response.data;
}

export async function getRedactionPlan(sessionId, documentId) {
  const response = await apiRequest({
    method: 'get',
    url: `/sessions/${sessionId}/documents/${documentId}/redaction-plan`,
  });
  return response.data;
}

export async function saveRedactionPlan(sessionId, documentId, payload) {
  const response = await apiRequest({
    method: 'put',
    url: `/sessions/${sessionId}/documents/${documentId}/redaction-plan`,
    data: payload,
  });
  return response.data;
}
