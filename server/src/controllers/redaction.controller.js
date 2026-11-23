import fs from 'node:fs/promises';

import { findDocument } from '../sessions/documentLookup.js';
import { toPublicRedaction } from '../sessions/redactionViews.js';
import { remainingSeconds } from '../sessions/sessionViews.js';
import {
  findRedaction,
  storeRedaction,
} from '../services/redaction/redactionStore.js';
import { redactPdf } from '../services/redaction/pdfRedactor.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';

function assertReadyPlan(document) {
  if ((document.redactionPlan?.privacyBlockers ?? []).length > 0) {
    throw ApiError.unprocessable(
      'PRIVACY_BLOCKERS',
      'Privacy checks are still blocking this document. Review the plan before exporting.',
    );
  }
  if (!document.redactionPlan || document.redactionPlan.status !== 'ready') {
    throw ApiError.unprocessable(
      'PLAN_NOT_READY',
      'Save a complete redaction plan before creating the sanitized file.',
    );
  }
}

export async function createRedactionHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);

  if (document.extension !== '.pdf') {
    throw ApiError.unprocessable(
      'PDF_REQUIRED',
      'Native coordinate redaction requires a PDF. Convert this document first.',
    );
  }
  if (document.extraction?.status !== 'ready') {
    throw ApiError.conflict('EXTRACTION_REQUIRED', 'Extract this document before redacting it.');
  }
  assertReadyPlan(document);

  const originalBytes = await fs.readFile(document.absolutePath);
  const result = redactPdf(
    originalBytes,
    document.redactionPlan,
    document.extraction.pageGeometry,
  );

  const record = await storeRedaction(req.session, result.bytes, {
    documentId: document.documentId,
    pageCount: result.pageCount,
    redactedBoxCount: result.redactedBoxCount,
    removedAnnotationCount: result.removedAnnotationCount,
    removedEmbeddedFileCount: result.removedEmbeddedFileCount,
    warnings: result.warnings,
  });

  return sendSuccess(res, toPublicRedaction(record), {
    status: 201,
    meta: { sessionExpiresInSeconds: remainingSeconds(req.session) },
  });
}

export async function downloadRedactionHandler(req, res) {
  const record = findRedaction(req.session, req.params.redactionId);
  const document = findDocument(req.session, record.documentId);
  assertReadyPlan(document);

  const bytes = await fs.readFile(record.absolutePath);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="sanitized-resume.pdf"',
    'Content-Length': bytes.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  return res.status(200).send(bytes);
}
