import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { createSession, destroySessionById } from '../sessions/sessionStore.js';
import {
  remainingSeconds,
  toPublicFile,
  toPublicSession,
} from '../sessions/sessionViews.js';
import { validateUploadedFile } from '../middleware/validateUpload.js';
import { sendSuccess } from '../utils/response.js';

export async function createSessionHandler(_req, res) {
  const session = await createSession();

  return sendSuccess(res, toPublicSession(session), {
    status: 201,
    meta: { sessionExpiresInSeconds: remainingSeconds(session) },
  });
}

export function getSessionHandler(req, res) {
  return sendSuccess(res, toPublicSession(req.session), {
    meta: { sessionExpiresInSeconds: remainingSeconds(req.session) },
  });
}

export async function uploadFileHandler(req, res) {
  const { extension, displayName } = validateUploadedFile(req.file);

  const documentId = randomUUID();
  const storedName = `${documentId}${extension}`;
  const absolutePath = path.join(req.session.directory, storedName);

  await fs.writeFile(absolutePath, req.file.buffer, { mode: 0o600 });

  const file = {
    documentId,
    storedName,
    absolutePath,
    originalName: displayName,
    sizeBytes: req.file.size,
    mimeType: req.file.mimetype,
    extension,
    extractionStatus: 'pending',
    uploadedAt: new Date().toISOString(),
  };

  req.session.files.set(documentId, file);

  return sendSuccess(res, toPublicFile(file), {
    status: 201,
    meta: { sessionExpiresInSeconds: remainingSeconds(req.session) },
  });
}

export async function destroySessionHandler(req, res) {
  await destroySessionById(req.session.id);
  return sendSuccess(res, { destroyed: true });
}
