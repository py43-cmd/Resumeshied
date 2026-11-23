export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = {
  '.pdf': new Set(['application/pdf', 'application/x-pdf']),
  '.docx': new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
};

function reject(code, message) {
  return { ok: false, code, message };
}

/**
 * Browser-side pre-validation for instant feedback.
 * The server repeats every check - this is only a convenience for the user.
 */
export async function validateFile(file) {
  if (!file) return reject('FILE_REQUIRED', 'Choose a PDF or DOCX file first.');

  const name = String(file.name ?? '');
  const dot = name.lastIndexOf('.');
  const extension = dot === -1 ? '' : name.slice(dot).toLowerCase();

  if (!ALLOWED_TYPES[extension]) {
    return reject('FILE_TYPE_NOT_ALLOWED', 'Only PDF and DOCX files are supported.');
  }

  if (!ALLOWED_TYPES[extension].has(file.type)) {
    return reject('MIME_MISMATCH', 'The file type does not match its extension.');
  }

  if (file.size === 0) return reject('EMPTY_FILE', 'The file is empty.');

  if (file.size > MAX_UPLOAD_BYTES) {
    return reject('FILE_TOO_LARGE', 'The file is larger than the 10 MB limit.');
  }

  let header;
  try {
    header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  } catch {
    return reject('FILE_UNREADABLE', 'We could not read this file. Try again.');
  }

  if (extension === '.pdf') {
    const text = String.fromCharCode(...header);
    if (!text.includes('%PDF-')) {
      return reject('INVALID_FILE_SIGNATURE', 'This file is not a real PDF document.');
    }
  } else if (
    header.length < 4 ||
    header[0] !== 0x50 ||
    header[1] !== 0x4b ||
    ![0x03, 0x05, 0x07].includes(header[2]) ||
    ![0x04, 0x06, 0x08].includes(header[3])
  ) {
    return reject('INVALID_FILE_SIGNATURE', 'This file is not a real DOCX document.');
  }

  return { ok: true, extension, displayName: name };
}
