import { Router } from 'express';

import {
  createSessionHandler,
  destroySessionHandler,
  getSessionHandler,
  uploadFileHandler,
} from '../controllers/session.controller.js';
import { requireSession } from '../middleware/sessionAuth.js';
import { uploadSingleFile } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/', asyncHandler(createSessionHandler));
router.get('/:sessionId', requireSession, getSessionHandler);
router.post(
  '/:sessionId/files',
  requireSession,
  uploadSingleFile,
  asyncHandler(uploadFileHandler),
);
router.delete('/:sessionId', requireSession, asyncHandler(destroySessionHandler));

export default router;
