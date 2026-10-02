import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { getApiErrorKey, getErrorField } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { accountApi } from './api'
import { changeEmailSchema } from './schemas'

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const { t } = useTranslation('account')
  const errorText = useErrorText()
  // Address the confirmation link was sent to, once the request succeeded.
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(changeEmailSchema) })

  const onSubmit = handleSubmit(async (values) => {
    setSentTo(null)
    try {
      await accountApi.requestEmailChange(values)
      setSentTo(values.newEmail.toLowerCase())
      reset()
    } catch (error) {
      setError(
        getErrorField(error, {
          EMAIL_TAKEN: 'newEmail',
          EMAIL_UNCHANGED: 'newEmail',
          INVALID_CURRENT_PASSWORD: 'currentPassword',
        }) ?? 'root',
        { message: getApiErrorKey(error) },
        { shouldFocus: true },
      )
    }
  })

  return (
    <Card className="p-6 sm:p-8">
      <h2
        id="change-email-title"
        className="font-display text-2xl font-extrabold tracking-tight"
      >
        {t('email.title')}
      </h2>
      <p className="mt-2 break-words text-muted">
        <Trans
          t={t}
          i18nKey="email.current"
          values={{ email: currentEmail }}
          components={{ strong: <strong className="text-ink" /> }}
        />
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        aria-labelledby="change-email-title"
        className="mt-6 space-y-5"
      >
        {errors.root && <Alert>{errorText(errors.root.message)}</Alert>}
        {sentTo && (
          <Alert variant="success">
            <Trans
              t={t}
              i18nKey="email.success"
              values={{ email: sentTo }}
              components={{ strong: <strong className="break-all" /> }}
            />
          </Alert>
        )}

        <TextField
          label={t('email.newEmail')}
          type="email"
          autoComplete="email"
          error={errorText(errors.newEmail?.message)}
          {...register('newEmail')}
        />
        <PasswordField
          label={t('email.currentPassword')}
          autoComplete="current-password"
          hint={t('email.passwordHint')}
          error={errorText(errors.currentPassword?.message)}
          {...register('currentPassword')}
        />
        <Button type="submit" loading={isSubmitting}>
          {t('email.submit')}
        </Button>
      </form>
    </Card>
  )
}
