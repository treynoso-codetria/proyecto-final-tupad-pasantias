import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation.js';
import { FILE_STORAGE, type FileStorage } from './file-storage.js';
import { LocalFilesController } from './local-files.controller.js';
import { LocalStorage } from './local-storage.js';
import { S3Storage } from './s3-storage.js';
import { publicApiUrl, StorageService } from './storage.service.js';

// Object storage (Backblaze B2) when S3_BUCKET is configured, which is
// mandatory in production; the local disk otherwise.
@Global()
@Module({
  controllers: [LocalFilesController],
  providers: [
    {
      provide: FILE_STORAGE,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
      ): FileStorage => {
        const bucket = config.get('S3_BUCKET', { infer: true });
        if (bucket) {
          return new S3Storage({
            bucket,
            endpoint: config.get('S3_ENDPOINT', { infer: true })!,
            region: config.get('S3_REGION', { infer: true })!,
            accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true })!,
            secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', {
              infer: true,
            })!,
          });
        }
        const directory = config.get('LOCAL_STORAGE_DIR', { infer: true });
        new Logger('StorageModule').warn(
          `S3_BUCKET is not set: files are stored on the local disk (${directory}).`,
        );
        return new LocalStorage(
          directory,
          publicApiUrl(config),
          `${config.get('JWT_SECRET', { infer: true })}:local-files`,
        );
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
