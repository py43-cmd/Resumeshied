import { findDocument } from '../sessions/documentLookup.js';
import { remainingSeconds, toPublicFile } from '../sessions/sessionViews.js';
import { extractDocument } from '../services/extraction/index.js';
import { sendSuccess } from '../utils/response.js';

export function getDocumentHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);
  return sendSuccess(res, toPublicFile(document), {
    meta: { sessionExpiresInSeconds: remainingSeconds(req.session) },
  });
}

export async function extractDocumentHandler(req, res) {
  const document = findDocument(req.session, req.params.documentId);

  document.extraction = await extractDocument(document);

  return sendSuccess(res, toPublicFile(document), {
    meta: { sessionExpiresInSeconds: remainingSeconds(req.session) },
  });
}
