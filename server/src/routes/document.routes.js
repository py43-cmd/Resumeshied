import { Router } from 'express';

import {
  detectDocumentHandler,
  extractDocumentHandler,
  getDetectionsHandler,
  getDocumentHandler,
  ocrDocumentHandler,
} from '../controllers/document.controller.js';
import { requireSession } from '../middleware/sessionAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.get('/:documentId/detections', requireSession, getDetectionsHandler);
router.post('/:documentId/detect', requireSession, asyncHandler(detectDocumentHandler));
router.post('/:documentId/extract', requireSession, asyncHandler(extractDocumentHandler));
router.post('/:documentId/ocr', requireSession, asyncHandler(ocrDocumentHandler));
router.get('/:documentId', requireSession, getDocumentHandler);

export default router;
