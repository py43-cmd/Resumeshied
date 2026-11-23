import { apiRequest } from './api.js';

export async function getDocument(sessionId, documentId) {
  const response = await apiRequest({
    method: 'get',
    url: `/sessions/${sessionId}/documents/${documentId}`,
  });
  return response.data;
}

export async function runDetection(sessionId, documentId) {
  const response = await apiRequest({
    method: 'post',
    url: `/sessions/${sessionId}/documents/${documentId}/detect`,
  });
  return response.data;
}

export async function getDetections(sessionId, documentId) {
  const response = await apiRequest({
    method: 'get',
    url: `/sessions/${sessionId}/documents/${documentId}/detections`,
  });
  return response.data;
}

export async function runOcr(sessionId, documentId) {
  const response = await apiRequest({
    method: 'post',
    url: `/sessions/${sessionId}/documents/${documentId}/ocr`,
  });
  return response.data;
}
