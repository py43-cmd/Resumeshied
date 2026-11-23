import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_UPLOAD_BYTES,
  validateFile,
} from '../src/lib/fileValidation.js';

const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function fakeFile(name, type, content) {
  const bytes = Buffer.from(content);
  return {
    name,
    type,
    size: bytes.length,
    slice: (start, end) => new Blob([bytes.subarray(start, end)]),
  };
}

function fakeLargeFile() {
  return {
    name: 'huge.pdf',
    type: PDF_MIME,
    size: MAX_UPLOAD_BYTES + 1,
    slice: () => new Blob([Buffer.from('%PDF-1.4')]),
  };
}

test('accepts a real PDF signature', async () => {
  const result = await validateFile(
    fakeFile('resume.pdf', PDF_MIME, '%PDF-1.4\n1 0 obj\n%%EOF'),
  );
  assert.equal(result.ok, true);
  assert.equal(result.extension, '.pdf');
});

test('accepts a real DOCX zip signature', async () => {
  const result = await validateFile(
    fakeFile('resume.docx', DOCX_MIME, 'PK\x03\x04rest-of-zip'),
  );
  assert.equal(result.ok, true);
  assert.equal(result.extension, '.docx');
});

test('rejects unsupported extensions', async () => {
  const result = await validateFile(
    fakeFile('resume.exe', PDF_MIME, '%PDF-1.4'),
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, 'FILE_TYPE_NOT_ALLOWED');
});

test('rejects MIME mismatches', async () => {
  const result = await validateFile(
    fakeFile('resume.pdf', 'text/plain', '%PDF-1.4'),
  );
  assert.equal(result.code, 'MIME_MISMATCH');
});

test('rejects files above the size limit', async () => {
  const result = await validateFile(fakeLargeFile());
  assert.equal(result.code, 'FILE_TOO_LARGE');
});

test('rejects a renamed text file with a PDF signature check', async () => {
  const result = await validateFile(
    fakeFile('fake.pdf', PDF_MIME, 'this is not a pdf'),
  );
  assert.equal(result.code, 'INVALID_FILE_SIGNATURE');
});
