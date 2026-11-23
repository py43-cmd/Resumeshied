import { findDocument } from '../sessions/documentLookup.js';
import { toPublicDetections } from '../sessions/detectionViews.js';
import { toPublicRedactionPlan } from '../sessions/redactionViews.js';
import { remainingSeconds, toPublicFile } from '../sessions/sessionViews.js';
import { runDetection } from '../services/detection/index.js';
import { extractDocument } from '../services/extraction/index.js';
import { ocrPdfDocument } from '../services/ocr/ocrService.js';
import { renderPdfPage } from '../services/pdf/pdfRenderer.js';
import {
  getRedactionPlan,
  saveRedactionPlan,
} from '../services/redaction/redactionPlanService.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';

function runDetectionForDocument(document) {
  const result = runDetection(document.extraction);

  // OCR can misread characters, so no OCR-derived match is authoritative.
  if (document.extraction?.source === 'ocr') {
    return {
      ...result,
      detections: result.detections.map((detection) => ({
        ...detection,
        needsReview: true,
      })),
    };
  }

  return result;
}

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

function sendPlanResult(req, res, document) {
  return sendSuccess(
    res,
    {
      documentId: document.documentId,
      ...toPublicRedactionPlan(document.redactionPlan),
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
  document.redactionPlan = null;

  return sendSuccess(res, toPublicFile(document), {
    meta: { sessionExpiresInSeconds: remainingSeconds(req.session) },
  });
}

export async function ocrDocumentHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);

  if (!document.extraction) {
    throw ApiError.conflict(
      'EXTRACTION_REQUIRED',
      'Extract this document before running local OCR.',
    );
  }

  document.extraction = await ocrPdfDocument(document);
  document.detections = null;
  document.redactionPlan = null;

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

  document.detections = runDetectionForDocument(document);
  document.redactionPlan = null;
  return sendDetectionResult(req, res, document);
}

export async function getPagePreviewHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);

  if (document.extension !== '.pdf' || !document.extraction?.pageCount) {
    throw ApiError.conflict(
      'PREVIEW_UNAVAILABLE',
      'A page preview is only available for extracted PDF documents.',
    );
  }

  const pageNumber = Number(req.params.pageNumber);
  if (!Number.isInteger(pageNumber)) {
    throw ApiError.badRequest('INVALID_PAGE_NUMBER', 'That page number is not valid.');
  }

  const requestedScale = Number(req.query.scale ?? 1.5);
  const scale = Number.isFinite(requestedScale)
    ? Math.min(3, Math.max(0.5, requestedScale))
    : 1.5;

  const page = await renderPdfPage(document.absolutePath, pageNumber, { scale });

  res.set({
    'Content-Type': 'image/png',
    'Content-Length': page.pngBuffer.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  return res.status(200).send(page.pngBuffer);
}

export function getRedactionPlanHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);
  return sendPlanResult(req, res, document);
}

export function saveRedactionPlanHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);
  saveRedactionPlan(document, req.body ?? {});
  return sendPlanResult(req, res, document);
}
