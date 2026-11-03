import { FileValidator } from '@nestjs/common';

/** Every PDF starts with these bytes; the client-sent content type isn't trusted */
const PDF_SIGNATURE = Buffer.from('%PDF-');

/** Checks the uploaded bytes really are a PDF */
export class PdfFileValidator extends FileValidator {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File) {
    return (
      !!file?.buffer &&
      file.buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)
    );
  }

  buildErrorMessage() {
    return 'The document must be a PDF';
  }
}
