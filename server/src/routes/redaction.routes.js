import { Router } from 'express';

import { downloadRedactionHandler } from '../controllers/redaction.controller.js';
import { requireSession } from '../middleware/sessionAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.get('/:redactionId/download', requireSession, asyncHandler(downloadRedactionHandler));

export default router;
