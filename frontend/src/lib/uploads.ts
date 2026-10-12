import type { ErrorKey } from '@/features/auth/errors'

export type UploadRule = {
  // For the `accept` attribute of the file input.
  accept: string
  types: readonly string[]
  maxBytes: number
  // Shown when a file does not follow the rule.
  error: ErrorKey
}

const MB = 1024 * 1024

// Same limits as the API (backend/src/storage/uploads.ts). Checking them here
// only spares uploading a file the API would reject; the API decides the type
// by the content of the file.
export const UPLOAD_RULES = {
  cv: {
    accept: 'application/pdf,.pdf',
    types: ['application/pdf'],
    maxBytes: 5 * MB,
    error: 'validation.cvFile',
  },
  logo: {
    accept: 'image/png,image/jpeg,image/webp',
    types: ['image/png', 'image/jpeg', 'image/webp'],
    maxBytes: 2 * MB,
    error: 'validation.logoFile',
  },
} as const satisfies Record<string, UploadRule>

// The error to show for a file, or undefined when it can be uploaded.
export function checkFile(file: File, rule: UploadRule): ErrorKey | undefined {
  return rule.types.includes(file.type) && file.size <= rule.maxBytes
    ? undefined
    : rule.error
}

export function toFormData(file: File): FormData {
  const form = new FormData()
  form.append('file', file)
  return form
}
