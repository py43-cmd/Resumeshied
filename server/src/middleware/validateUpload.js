import path from 'node:path';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED = {
  '.pdf': new Set(['application/pdf', 'application/x-pdf']),
  '.docx': new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
};

function hasValidSignature(buffer, extension) {
  if (extension === '.pdf') {
    return buffer.subarray(0, 1024).toString('latin1').includes('%PDF-');
  }

  // DOCX is a ZIP archive: PK\x03\x04, PK\x05\x06 or PK\x07\x08.
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    [0x03, 0x05, 0x07].includes(buffer[2]) &&
    [0x04, 0x06, 0x08].includes(buffer[3])
  );
}

function safeDisplayName(originalName) {
  return path.basename(String(originalName ?? 'upload')).slice(0, 255);
}

export function validateUploadedFile(file) {
  if (!file) {
    throw ApiError.badRequest('FILE_REQUIRED', 'Choose a PDF or DOCX file to upload.');
  }

  const extension = path.extname(file.originalname ?? '').toLowerCase();
  if (!ALLOWED[extension]) {
    throw ApiError.unsupportedMediaType(
      'FILE_TYPE_NOT_ALLOWED',
      'Only PDF and DOCX files are supported.',
    );
  }

  if (!ALLOWED[extension].has(file.mimetype)) {
    throw ApiError.unsupportedMediaType(
      'MIME_MISMATCH',
      'The declared file type does not match its extension.',
    );
  }

  if (file.size === 0 || !file.buffer || file.buffer.length === 0) {
    throw ApiError.unprocessable('EMPTY_FILE', 'The file is empty.');
  }

  if (file.size > config.maxUploadBytes) {
    throw ApiError.payloadTooLarge(
      'FILE_TOO_LARGE',
      `The file exceeds the ${Math.round(config.maxUploadBytes / (1024 * 1024))} MB upload limit.`,
    );
  }

  if (!hasValidSignature(file.buffer, extension)) {
    throw ApiError.unsupportedMediaType(
      'INVALID_FILE_SIGNATURE',
      'The file contents do not match a valid PDF or DOCX document.',
    );
  }

  return { extension, displayName: safeDisplayName(file.originalname) };
}
