import multer from 'multer';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Memory storage lets us inspect magic bytes before writing anything to disk.
 * The 10 MB limit is enforced by Multer while the stream arrives.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadBytes,
    files: 1,
    fields: 0,
  },
});

export function uploadSingleFile(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(
        ApiError.payloadTooLarge(
          'FILE_TOO_LARGE',
          `The file exceeds the ${Math.round(config.maxUploadBytes / (1024 * 1024))} MB upload limit.`,
        ),
      );
    }

    return next(
      ApiError.badRequest('UPLOAD_FAILED', 'The file could not be uploaded. Try again.'),
    );
  });
}
