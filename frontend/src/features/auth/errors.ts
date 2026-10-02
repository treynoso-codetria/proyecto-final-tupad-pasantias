import type { ParseKeys } from 'i18next'
import { ApiError } from '@/api/client'
import i18n from '@/i18n'

// Forms keep their errors as translation keys of the `errors` namespace
// instead of translated text, so a visible error follows a language change.
// They are turned into text at render time by useErrorText().
export type ErrorKey = ParseKeys<'errors'>

// Key for a failed API call. The API identifies each error with a stable
// `code`; the ones the UI has its own wording for are under `api.<CODE>`.
export function getApiErrorKey(error: unknown): ErrorKey {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'api.network'
    }
    const key = `api.${error.code}`
    if (i18n.exists(key, { ns: 'errors' })) {
      return key as ErrorKey
    }
  }
  return 'api.unexpected'
}

// Form field to mark for an API error: `fields` maps error codes to the
// field each one is about. Returns undefined for errors that belong above
// the form.
export function getErrorField<Field extends string>(
  error: unknown,
  fields: Partial<Record<string, Field>>,
): Field | undefined {
  return error instanceof ApiError && error.code
    ? fields[error.code]
    : undefined
}
