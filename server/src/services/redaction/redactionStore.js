import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { ApiError } from '../../utils/ApiError.js';

function redactionsFor(session) {
  if (!session.redactions) session.redactions = new Map();
  return session.redactions;
}

/** Store a redacted PDF inside the short-lived session directory. */
export async function storeRedaction(session, bytes, metadata) {
  const redactionId = randomUUID();
  const storedName = `${redactionId}.pdf`;
  const absolutePath = path.join(session.directory, storedName);

  await fs.writeFile(absolutePath, bytes, { mode: 0o600 });

  const record = {
    redactionId,
    documentId: metadata.documentId,
    storedName,
    absolutePath,
    pageCount: metadata.pageCount,
    redactedBoxCount: metadata.redactedBoxCount,
    removedAnnotationCount: metadata.removedAnnotationCount,
    removedEmbeddedFileCount: metadata.removedEmbeddedFileCount ?? 0,
    warnings: metadata.warnings ?? [],
    verification: metadata.verification ?? null,
    createdAt: new Date().toISOString(),
  };

  redactionsFor(session).set(redactionId, record);
  return record;
}

export function findRedaction(session, redactionId) {
  const record = redactionsFor(session).get(redactionId);
  if (!record) {
    throw ApiError.notFound('REDACTION_NOT_FOUND', 'This redacted file does not exist in the session.');
  }
  return record;
}
