// Stable, language-independent identifiers returned in every error response
// (`code`). Clients branch on these; the human-readable `message` is looked up
// under the same key in src/i18n/<lang>/errors.json.
//
// Usage in services: `throw new ConflictException(ErrorCode.EMAIL_TAKEN)`.
export const ErrorCode = {
  // Domain errors
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  CUIT_TAKEN: 'CUIT_TAKEN',
  EMAIL_OR_CUIT_TAKEN: 'EMAIL_OR_CUIT_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',

  // Generic errors, used when an exception carries no domain code
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  HTTP_ERROR: 'HTTP_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.hasOwn(ErrorCode, value);
}
