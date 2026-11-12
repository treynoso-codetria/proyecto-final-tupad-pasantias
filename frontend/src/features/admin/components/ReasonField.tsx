import { useTranslation } from 'react-i18next'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { REASON_MAX } from '../api'

type ReasonFieldProps = {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  // Shown after a submit attempt with an empty reason.
  missing: boolean
}

export function ReasonField({ label, hint, value, onChange, missing }: ReasonFieldProps) {
  const { t } = useTranslation('errors')

  return (
    <TextAreaField
      label={label}
      hint={hint}
      rows={3}
      maxLength={REASON_MAX}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={missing ? t('validation.required') : undefined}
      autoFocus
    />
  )
}
