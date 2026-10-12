import {
  applyDecorators,
  BadRequestException,
  UnsupportedMediaTypeException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiPayloadTooLargeResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { ErrorCode } from '../common/errors/error-code.js';
import {
  detectFileKind,
  type FileKind,
  type UploadedFile,
} from './file-types.js';

export interface UploadRule {
  kinds: readonly FileKind[];
  maxBytes: number;
}

const MB = 1024 * 1024;

// The frontend checks the same limits before uploading (lib/uploads.ts).
export const UPLOAD_RULES = {
  cv: { kinds: ['pdf'], maxBytes: 5 * MB },
  logo: { kinds: ['png', 'jpg', 'webp'], maxBytes: 2 * MB },
} as const satisfies Record<string, UploadRule>;

// A multipart/form-data endpoint with one file in the field "file", kept in
// memory. Multer rejects a larger file with 413 (FILE_TOO_LARGE) before it is
// read completely.
export function FileUpload(rule: UploadRule, description: string) {
  return applyDecorators(
    UseInterceptors(
      FileInterceptor('file', {
        limits: { fileSize: rule.maxBytes, files: 1, fields: 0 },
      }),
    ),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description,
      schema: {
        type: 'object',
        required: ['file'],
        properties: { file: { type: 'string', format: 'binary' } },
      },
    }),
    ApiPayloadTooLargeResponse({
      description: `File larger than ${rule.maxBytes / MB} MB`,
      type: ErrorResponseDto,
    }),
    ApiUnsupportedMediaTypeResponse({
      description: `Not a ${rule.kinds.join(' / ').toUpperCase()} file`,
      type: ErrorResponseDto,
    }),
  );
}

// The kind of an uploaded file, by its content; rejects missing files and
// kinds the rule does not allow.
export function checkUpload(
  file: UploadedFile | undefined,
  rule: UploadRule,
): FileKind {
  if (!file || file.size === 0) {
    throw new BadRequestException(ErrorCode.FILE_REQUIRED);
  }
  const kind = detectFileKind(file.buffer);
  if (!kind || !rule.kinds.includes(kind)) {
    throw new UnsupportedMediaTypeException(ErrorCode.FILE_TYPE_NOT_ALLOWED);
  }
  return kind;
}

// The original name of an upload, as a safe file name of at most 255
// characters. Multer reads it as latin1; browsers send UTF-8.
export function uploadedFileName(file: UploadedFile, fallback: string): string {
  const name = Buffer.from(file.originalname, 'latin1')
    .toString('utf8')
    .replace(/[\\/\p{Cc}]/gu, '_')
    .trim();
  return (name || fallback).slice(-255);
}
