import fs from 'node:fs/promises';
import mammoth from 'mammoth';
import JSZip from 'jszip';

import { ApiError } from '../../utils/ApiError.js';

export async function extractDocx(absolutePath) {
  const buffer = await fs.readFile(absolutePath);

  let raw;
  try {
    raw = await mammoth.extractRawText({ buffer });
  } catch {
    throw ApiError.unprocessable(
      'DOCX_PARSE_FAILED',
      'We could not read this DOCX. It may be damaged or unsupported.',
    );
  }

  const fullText = raw.value.trim();
  if (!fullText) {
    return {
      status: 'failed',
      reasonCode: 'EMPTY_DOCUMENT',
      pageCount: null,
      pages: [],
      fullText: '',
      hasTextLayer: false,
      hasCoordinates: false,
      warnings: [],
      source: 'docx',
    };
  }

  let imageCount = 0;
  let pageCount = null;

  try {
    const zip = await JSZip.loadAsync(buffer);
    imageCount = Object.keys(zip.files).filter((name) =>
      name.startsWith('word/media/'),
    ).length;

    const appXml = zip.file('docProps/app.xml');
    if (appXml) {
      const xml = await appXml.async('string');
      const match = xml.match(/<Pages>(\d+)<\/Pages>/);
      if (match) pageCount = Number(match[1]);
    }
  } catch {
    // ZIP metadata is optional; extraction itself already succeeded.
  }

  const warnings = ['DOCX_NO_COORDINATES'];
  if (imageCount > 0) warnings.push('DOCX_IMAGES_PRESENT');

  return {
    status: 'ready',
    reasonCode: null,
    pageCount,
    pages: [],
    fullText,
    hasTextLayer: true,
    hasCoordinates: false,
    warnings,
    imageCount,
    source: 'docx',
  };
}
