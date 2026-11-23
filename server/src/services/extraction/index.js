import { extractPdf } from './pdfExtractor.js';
import { extractDocx } from './docxExtractor.js';
import { ApiError } from '../../utils/ApiError.js';

export async function extractDocument(file) {
  if (file.extension === '.pdf') return extractPdf(file.absolutePath);
  if (file.extension === '.docx') return extractDocx(file.absolutePath);

  throw ApiError.unprocessable('UNSUPPORTED_DOCUMENT', 'This document type is not supported.');
}
