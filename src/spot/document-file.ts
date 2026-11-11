/** A kind of proof document residents may upload */
export interface DocumentType {
  extension: string;
  mimetype: string;
}

const PDF: DocumentType = { extension: 'pdf', mimetype: 'application/pdf' };
const JPEG: DocumentType = { extension: 'jpg', mimetype: 'image/jpeg' };
const PNG: DocumentType = { extension: 'png', mimetype: 'image/png' };
const WEBP: DocumentType = { extension: 'webp', mimetype: 'image/webp' };

const startsWith = (buffer: Buffer, bytes: number[] | string, offset = 0) => {
  const expected =
    typeof bytes === 'string' ? Buffer.from(bytes) : Buffer.from(bytes);
  return buffer.subarray(offset, offset + expected.length).equals(expected);
};

export const DOCUMENT_TYPE_ERROR =
  'The document must be a PDF or a photo (JPEG, PNG or WebP)';

/**
 * What the uploaded bytes are, from their signature; null for anything we don't accept.
 * The client-sent content type and file name aren't trusted.
 */
export function detectDocumentType(
  buffer: Buffer | undefined,
): DocumentType | null {
  if (!buffer) return null;
  if (startsWith(buffer, '%PDF-')) return PDF;
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return JPEG;
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return PNG;
  }
  if (startsWith(buffer, 'RIFF') && startsWith(buffer, 'WEBP', 8)) return WEBP;
  return null;
}
