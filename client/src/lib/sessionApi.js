import { apiRequest } from './api.js';

export async function createSession() {
  return (await apiRequest({ method: 'post', url: '/sessions' })).data;
}

export async function getSession(sessionId) {
  return (await apiRequest({ method: 'get', url: `/sessions/${sessionId}` })).data;
}

export async function uploadResume(sessionId, file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiRequest({
    method: 'post',
    url: `/sessions/${sessionId}/files`,
    data: formData,
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress?.(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  return response.data;
}

export async function extractDocument(sessionId, documentId) {
  const response = await apiRequest({
    method: 'post',
    url: `/sessions/${sessionId}/documents/${documentId}/extract`,
  });
  return response.data;
}

export async function destroySession(sessionId) {
  return (await apiRequest({ method: 'delete', url: `/sessions/${sessionId}` })).data;
}
