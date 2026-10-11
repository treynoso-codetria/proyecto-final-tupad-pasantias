import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { getApiErrorKey } from '@/features/auth/errors'
import { requiredText } from '@/features/auth/schemas'
import { useErrorText } from '@/features/auth/use-error-text'

type NameFormProps = {
  label: string
  submitLabel: string
  maxLength: number
  initialName?: string
  saving: boolean
  // Error of the last attempt, shown on the field.
  error: unknown
  onSubmit: (name: string) => void
  // Shown as a second button when given (e.g. to leave an inline rename).
  onCancel?: () => void
}

// One-field form used to add or rename a category or a tag.
export function NameForm({
  label,
  submitLabel,
  maxLength,
  initialName = '',
  saving,
  error,
  onSubmit,
  onCancel,
}: NameFormProps) {
  const { t } = useTranslation('catalog')
  const errorText = useErrorText()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(z.object({ name: requiredText(maxLength) })),
    defaultValues: { name: initialName },
  })

  // The API's answer (a taken name...) is shown on the field.
  useEffect(() => {
    if (error) {
      setError('name', { message: getApiErrorKey(error) }, { shouldFocus: true })
    }
  }, [error, setError])

  return (
    <form
      onSubmit={handleSubmit(({ name }) => onSubmit(name))}
      noValidate
      className="flex flex-wrap items-start gap-3"
    >
      <TextField
        label={label}
        maxLength={maxLength}
        className="min-w-48 flex-1"
        error={errorText(errors.name?.message)}
        // Inline renames open with the cursor in the field.
        autoFocus={Boolean(onCancel)}
        {...register('name')}
      />
      {/* Aligned with the input, below the label. */}
      <div className="flex gap-2 pt-7">
        <Button type="submit" size="sm" loading={saving}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
