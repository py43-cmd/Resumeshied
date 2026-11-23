import { Router } from 'express';

import {
  detectDocumentHandler,
  extractDocumentHandler,
  getDetectionsHandler,
  getDocumentHandler,
  getPagePreviewHandler,
  getRedactionPlanHandler,
  ocrDocumentHandler,
  saveRedactionPlanHandler,
} from '../controllers/document.controller.js';
import { requireSession } from '../middleware/sessionAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.get('/:documentId/detections', requireSession, getDetectionsHandler);
router.post('/:documentId/detect', requireSession, asyncHandler(detectDocumentHandler));
router.post('/:documentId/extract', requireSession, asyncHandler(extractDocumentHandler));
router.post('/:documentId/ocr', requireSession, asyncHandler(ocrDocumentHandler));
router.get('/:documentId/pages/:pageNumber/preview', requireSession, asyncHandler(getPagePreviewHandler));
router.get('/:documentId/redaction-plan', requireSession, getRedactionPlanHandler);
router.put('/:documentId/redaction-plan', requireSession, saveRedactionPlanHandler);
router.get('/:documentId', requireSession, getDocumentHandler);

export default router;
