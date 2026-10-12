import { detectFileKind } from './file-types.js';

describe('detectFileKind', () => {
  it('recognizes PDF, PNG, JPG and WebP by their first bytes', () => {
    expect(detectFileKind(Buffer.from('%PDF-1.4\n...'))).toBe('pdf');
    expect(
      detectFileKind(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      ),
    ).toBe('png');
    expect(detectFileKind(Buffer.from([0xff, 0xd8, 0xff, 0xdb]))).toBe('jpg');
    expect(
      detectFileKind(Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 ', 'latin1')),
    ).toBe('webp');
  });

  it('returns null for anything else, including truncated headers', () => {
    expect(detectFileKind(Buffer.from('<svg xmlns="..."/>'))).toBeNull();
    expect(detectFileKind(Buffer.from('%PD'))).toBeNull();
    expect(
      detectFileKind(Buffer.from('RIFF\x24\x00\x00\x00WAVE', 'latin1')),
    ).toBeNull();
    expect(detectFileKind(Buffer.alloc(0))).toBeNull();
  });
});
