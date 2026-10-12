// The type of an uploaded file is decided by its first bytes, not by the
// name or the Content-Type the client sends, which anyone can fake.

export type FileKind = 'pdf' | 'png' | 'jpg' | 'webp';

export const CONTENT_TYPES: Record<FileKind, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => buffer[offset + index] === byte);

export function detectFileKind(buffer: Buffer): FileKind | null {
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return 'pdf'; // %PDF-
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return 'jpg';
  }
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && // RIFF
    startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8) // WEBP
  ) {
    return 'webp';
  }
  return null;
}

// What an uploaded file looks like once received (multer, in memory).
export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  size: number;
}
