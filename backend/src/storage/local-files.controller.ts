import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import { extname } from 'node:path';
import { Public } from '../common/decorators/public.decorator.js';
import { CONTENT_TYPES, type FileKind } from './file-types.js';
import {
  FILE_STORAGE,
  type FileStorage,
  inlineDisposition,
} from './file-storage.js';
import { LocalStorage } from './local-storage.js';

// Serves the signed links of LocalStorage (development and tests). With
// object storage (production) the links point to the storage service itself
// and this route answers 404.
@ApiExcludeController()
@Public()
@Controller('files')
export class LocalFilesController {
  constructor(@Inject(FILE_STORAGE) private readonly storage: FileStorage) {}

  @Get()
  serve(
    @Query('key') key: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Query('name') name: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): StreamableFile {
    if (!(this.storage instanceof LocalStorage) || !key || !signature) {
      throw new NotFoundException();
    }
    let path: string | null;
    try {
      path = this.storage.verify(
        { key, expires: Number(expires), name },
        signature,
      );
    } catch {
      path = null;
    }
    if (!path || !existsSync(path)) {
      throw new NotFoundException();
    }

    const kind = extname(path).slice(1) as FileKind;
    response.set({
      'Content-Type': CONTENT_TYPES[kind],
      'Content-Disposition': inlineDisposition(name),
      'Cache-Control': 'private, max-age=3600',
    });
    return new StreamableFile(createReadStream(path));
  }
}
