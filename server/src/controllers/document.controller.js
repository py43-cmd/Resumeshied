import { findDocument } from '../sessions/documentLookup.js';
import { toPublicDetections } from '../sessions/detectionViews.js';
import { remainingSeconds, toPublicFile } from '../sessions/sessionViews.js';
import { runDetection } from '../services/detection/index.js';
import { extractDocument } from '../services/extraction/index.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';

function sendDetectionResult(req, res, document) {
  return sendSuccess(
    res,
    {
      documentId: document.documentId,
      ...toPublicDetections(document.detections),
    },
    {
      meta: { sessionExpiresInSeconds: remainingSeconds(req.session) },
    },
  );
}

export function getDocumentHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);
  return sendSuccess(res, toPublicFile(document), {
    meta: { sessionExpiresInSeconds: remainingSeconds(req.session) },
  });
}

export async function extractDocumentHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);

  document.extraction = await extractDocument(document);
  document.detections = null;

  return sendSuccess(res, toPublicFile(document), {
    meta: { sessionExpiresInSeconds: remainingSeconds(req.session) },
  });
}

export function getDetectionsHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);
  return sendDetectionResult(req, res, document);
}

export function detectDocumentHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);

  if (!document.extraction) {
    throw ApiError.conflict(
      'EXTRACTION_REQUIRED',
      'Extract this document before running detection.',
    );
  }

  document.detections = runDetection(document.extraction);
  return sendDetectionResult(req, res, document);
}
