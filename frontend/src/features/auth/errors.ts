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

// Form field to mark when registration fails because a value is taken.
export function getConflictField(error: unknown): 'email' | 'cuit' | null {
  if (!(error instanceof ApiError)) {
    return null
  }
  if (error.code === 'EMAIL_TAKEN') {
    return 'email'
  }
  if (error.code === 'CUIT_TAKEN') {
    return 'cuit'
  }
  return null
}
