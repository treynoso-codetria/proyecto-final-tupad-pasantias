import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ErrorCode } from '../common/errors/error-code.js';
import { EnvironmentVariables } from '../config/env.validation.js';
import { FILE_STORAGE, type FileStorage } from './file-storage.js';
import { CONTENT_TYPES, type FileKind } from './file-types.js';

export type StorageFolder = 'cvs' | 'logos';

// What the rest of the API uses. The database keeps storage keys, not links
// (student_profiles.cv_url, applications.cv_url, companies.logo_url); this
// service turns them into links when a response is built.
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly publicApiUrl: string;

  constructor(
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.publicApiUrl = publicApiUrl(config);
  }

  // Stores a file under a new key, "<folder>/<ownerId>/<uuid>.<kind>": a new
  // file never replaces an old one in place, so a link to the old one never
  // starts showing different content.
  async store(
    folder: StorageFolder,
    ownerId: string,
    body: Buffer,
    kind: FileKind,
  ): Promise<string> {
    const key = `${folder}/${ownerId}/${randomUUID()}.${kind}`;
    try {
      await this.storage.put(key, body, CONTENT_TYPES[kind]);
    } catch (error) {
      this.logger.error(`Could not store ${key}`, error);
      throw new ServiceUnavailableException(ErrorCode.STORAGE_UNAVAILABLE);
    }
    return key;
  }

  // Deleting is cleanup: a failure is logged, never reported to the user
  // (the file is already unreferenced).
  async deleteQuietly(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(`Could not delete ${key}: ${String(error)}`);
    }
  }

  // A signed link to a private file (a CV), or null when there is none.
  async signedUrl(
    key: string | null,
    downloadName?: string,
  ): Promise<string | null> {
    return key ? this.storage.signedUrl(key, downloadName) : null;
  }

  // Logos are public: their link is a stable API route that redirects to a
  // signed link (see CompaniesController). `v` changes with every new logo,
  // so a browser that cached the old one asks again.
  logoUrl(companyId: string, key: string | null): string | null {
    if (!key) {
      return null;
    }
    const version = key.slice(key.lastIndexOf('/') + 1, key.lastIndexOf('.'));
    return `${this.publicApiUrl}/api/companies/${companyId}/logo?v=${version.slice(0, 8)}`;
  }
}

// Public URL of this API, without a trailing slash.
export function publicApiUrl(
  config: ConfigService<EnvironmentVariables, true>,
): string {
  const configured = config.get('PUBLIC_API_URL', { infer: true }) as
    string | undefined;
  return (
    configured ?? `http://localhost:${config.get('PORT', { infer: true })}`
  ).replace(/\/+$/, '');
}
