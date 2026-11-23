import canvasModule from 'canvas';
import JSZip from 'jszip';

const { createCanvas } = canvasModule;

function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildPdf(stream) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

/** A small, structurally valid single-page PDF with a real text layer. */
export function createMinimalPdf(text = 'Hello World', { includeText = true } = {}) {
  const stream = includeText
    ? `BT /F1 12 Tf 72 720 Td (${escapePdfText(text)}) Tj ET\n`
    : '';
  return buildPdf(stream);
}

/** A PDF where each line is its own text item, so bbox mapping can be tested. */
export function createPdfFromLines(lines) {
  const stream = lines
    .map((line, index) => {
      const y = 720 - index * 18;
      return `BT /F1 12 Tf 72 ${y} Td (${escapePdfText(line)}) Tj ET\n`;
    })
    .join('');
  return buildPdf(stream);
}

/** A multi-page PDF where each page has its own lines at known positions. */
export function createMultiPagePdf(linesByPage) {
  const pageCount = linesByPage.length;
  if (pageCount === 0) throw new Error('At least one page is required');
  // Objects: 1 = catalog, 2 = pages tree, then 2 per page, then the font.
  const fontRef = 2 + pageCount * 2 + 1;
  const pageRefs = [];
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', null];

  linesByPage.forEach((lines) => {
    const stream = lines
      .map((line, index) => {
        const y = 720 - index * 18;
        return `BT /F1 12 Tf 72 ${y} Td (${escapePdfText(line)}) Tj ET\n`;
      })
      .join('');

    const pageRef = objects.length + 1;
    pageRefs.push(pageRef);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
        `/Contents ${pageRef + 1} 0 R /Resources << /Font << /F1 ${fontRef} 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`);
  });

  objects[1] =
    `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] ` +
    `/Count ${pageRefs.length} >>`;
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

/** A PDF with no text operators - the "scanned" path in our extractor. */
export function createTextlessPdf() {
  return createMinimalPdf('', { includeText: false });
}

function buildImagePdf(jpeg, imageWidth, imageHeight) {
  const pageWidth = 612;
  const pageHeight = 792;
  const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>`,
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream`,
    `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n${jpeg.toString('latin1')}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

/**
 * A real image-only page: text is rasterized into a JPEG embedded as the page's
 * only XObject, so there is no extractable text layer for Phase 5A to use.
 */
export function createScannedPdf(lines) {
  const imageWidth = 1224;
  const imageHeight = 1584;
  const image = createCanvas(imageWidth, imageHeight);
  const context = image.getContext('2d');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, imageWidth, imageHeight);
  context.fillStyle = '#000000';
  context.font = '48px sans-serif';

  lines.forEach((line, index) => {
    context.fillText(line, 80, 150 + index * 110);
  });

  return buildImagePdf(image.toBuffer('image/jpeg', 95), imageWidth, imageHeight);
}

/** A minimal DOCX with paragraphs and no images. */
export async function createMinimalDocx(text = 'Hello World') {
  const paragraphs = String(text)
    .split('\n')
    .map((line) => `<w:p><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`)
    .join('');

  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
  );
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:body>${paragraphs}</w:body></w:document>`,
  );

  return zip.generateAsync({ type: 'nodebuffer' });
}
