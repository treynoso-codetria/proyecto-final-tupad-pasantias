// Where uploaded files (CVs, logos) live. Files are private: they are read
// through signed links that expire, created by the API for users allowed to
// see them.
export interface FileStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  // `downloadName`: file name the browser uses when saving it.
  signedUrl(key: string, downloadName?: string): Promise<string>;
}

// A signed link works for at least an hour. Links are signed per time window
// (they expire at the end of the next window), so the same file gets the same
// link for a while and the browser can cache it instead of downloading it on
// every page.
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function signingWindow(now = Date.now()): {
  start: Date;
  expires: number;
} {
  const startSeconds =
    Math.floor(now / 1000 / SIGNED_URL_TTL_SECONDS) * SIGNED_URL_TTL_SECONDS;
  return {
    start: new Date(startSeconds * 1000),
    expires: startSeconds + 2 * SIGNED_URL_TTL_SECONDS,
  };
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');

// Content-Disposition that shows the file in the browser (a PDF opens in a
// tab) and names it if saved; non-ASCII names use RFC 5987 encoding.
export function inlineDisposition(downloadName?: string): string {
  if (!downloadName) {
    return 'inline';
  }
  const ascii = downloadName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`;
}
