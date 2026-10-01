import { useTranslation } from 'react-i18next'
import type { ErrorKey } from './errors'

// Returns a function that turns an error key stored in a form (see errors.ts)
// into text in the current language.
export function useErrorText() {
  const { t } = useTranslation('errors')
  return (key: string | undefined): string | undefined =>
    key ? t(key as ErrorKey) : undefined
}
