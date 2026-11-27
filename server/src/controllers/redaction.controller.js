import fs from 'node:fs/promises';

import { findDocument } from '../sessions/documentLookup.js';
import { toPublicRedaction } from '../sessions/redactionViews.js';
import { remainingSeconds } from '../sessions/sessionViews.js';
import {
  findRedaction,
  storeRedaction,
} from '../services/redaction/redactionStore.js';
import { redactPdf } from '../services/redaction/pdfRedactor.js';
import {
  compareVisualFidelity,
  verifyTextRemoval,
} from '../services/verification/verificationService.js';
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

  // Privacy verification is a hard gate: the file is never stored if any
  // approved box still contains extractable text.
  const privacy = await verifyTextRemoval(result.bytes, document.redactionPlan);
  if (privacy.status !== 'passed') {
    throw ApiError.unprocessable(
      privacy.blockers[0] ?? 'VERIFICATION_FAILED',
      'A final privacy check found text inside an approved redaction area. The file was not saved.',
      {
        checkedBoxCount: privacy.checkedBoxCount,
        failedBoxCount: privacy.failedBoxCount,
      },
    );
  }

  // Fidelity verification is advisory: warnings travel with the file but do
  // not prevent a user from downloading a redacted copy.
  const fidelity = compareVisualFidelity(originalBytes, result.bytes, document.redactionPlan);
  const warnings = [...new Set([...result.warnings, ...fidelity.warnings])];

  const record = await storeRedaction(req.session, result.bytes, {
    documentId: document.documentId,
    planId: document.redactionPlan?.planId ?? null,
    pageCount: result.pageCount,
    redactedBoxCount: result.redactedBoxCount,
    removedAnnotationCount: result.removedAnnotationCount,
    removedEmbeddedFileCount: result.removedEmbeddedFileCount,
    warnings,
    verification: {
      privacy: {
        status: privacy.status,
        blockers: privacy.blockers,
        checkedBoxCount: privacy.checkedBoxCount,
        failedBoxCount: privacy.failedBoxCount,
      },
      fidelity: {
        status: fidelity.status,
        warnings: fidelity.warnings,
        differingPixels: fidelity.differingPixels,
        comparedPixels: fidelity.comparedPixels,
      },
    },
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

  if (record.planId && record.planId !== document.redactionPlan?.planId) {
    throw ApiError.conflict(
      'REDACTION_STALE',
      'The redaction plan changed after this file was created. Regenerate the PDF.',
    );
  }

  // Defense in depth: even a stored file is never served unless the recorded
  // privacy verdict passed at creation time.
  if (record.verification?.privacy?.status !== 'passed') {
    throw ApiError.unprocessable(
      'PRIVACY_VERIFICATION_FAILED',
      'This file did not pass the final privacy check and cannot be downloaded.',
    );
  }

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
