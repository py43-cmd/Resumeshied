import { Router } from 'express';

import {
  extractDocumentHandler,
  getDocumentHandler,
} from '../controllers/document.controller.js';
import { requireSession } from '../middleware/sessionAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.get('/:documentId', requireSession, getDocumentHandler);
router.post('/:documentId/extract', requireSession, asyncHandler(extractDocumentHandler));

export default router;
