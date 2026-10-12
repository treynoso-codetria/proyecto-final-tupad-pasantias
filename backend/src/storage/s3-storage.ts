import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  FileStorage,
  inlineDisposition,
  SIGNED_URL_TTL_SECONDS,
  signingWindow,
} from './file-storage.js';

export interface S3StorageOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

// Any S3-compatible object storage. In production: a private Backblaze B2
// bucket (https://www.backblaze.com/cloud-storage).
export class S3Storage implements FileStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      // "<endpoint>/<bucket>/<key>" links: every S3-compatible service
      // supports them, not all support "<bucket>.<endpoint>".
      forcePathStyle: true,
      // Recent SDK versions add CRC32 checksum headers that some
      // S3-compatible services, B2 among them, reject; only send them when
      // an operation requires one.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  // Signed locally, no request to the service.
  signedUrl(key: string, downloadName?: string): Promise<string> {
    const { start } = signingWindow();
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: inlineDisposition(downloadName),
      }),
      { signingDate: start, expiresIn: 2 * SIGNED_URL_TTL_SECONDS },
    );
  }
}
