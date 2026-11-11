import { detectDocumentType } from './document-file.js';

describe('detectDocumentType', () => {
  it('recognises a PDF', () => {
    expect(detectDocumentType(Buffer.from('%PDF-1.7'))).toEqual({
      extension: 'pdf',
      mimetype: 'application/pdf',
    });
  });

  it('recognises a JPEG', () => {
    expect(
      detectDocumentType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])),
    ).toMatchObject({ extension: 'jpg', mimetype: 'image/jpeg' });
  });

  it('recognises a PNG', () => {
    expect(
      detectDocumentType(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]),
      ),
    ).toMatchObject({ extension: 'png', mimetype: 'image/png' });
  });

  it('recognises a WebP', () => {
    expect(
      detectDocumentType(
        Buffer.concat([
          Buffer.from('RIFF'),
          Buffer.from([0, 0, 0, 0]),
          Buffer.from('WEBPVP8 '),
        ]),
      ),
    ).toMatchObject({ extension: 'webp', mimetype: 'image/webp' });
  });

  it('rejects a RIFF file that is not a WebP', () => {
    expect(
      detectDocumentType(
        Buffer.concat([
          Buffer.from('RIFF'),
          Buffer.from([0, 0, 0, 0]),
          Buffer.from('WAVE'),
        ]),
      ),
    ).toBeNull();
  });

  it('rejects anything else', () => {
    expect(detectDocumentType(Buffer.from('hello'))).toBeNull();
    expect(detectDocumentType(Buffer.alloc(0))).toBeNull();
    expect(detectDocumentType(undefined)).toBeNull();
  });
});
