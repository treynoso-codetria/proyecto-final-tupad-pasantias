import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PasswordField } from '@/components/ui/PasswordField'
import { getApiErrorKey, getErrorField } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { accountApi } from './api'
import { changePasswordSchema } from './schemas'

export function ChangePasswordForm() {
  const { t } = useTranslation('account')
  const { t: tAuth } = useTranslation('auth')
  const errorText = useErrorText()
  const [changed, setChanged] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(changePasswordSchema) })

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setChanged(false)
    try {
      await accountApi.changePassword({ currentPassword, newPassword })
      setChanged(true)
      reset()
    } catch (error) {
      setError(
        getErrorField(error, {
          INVALID_CURRENT_PASSWORD: 'currentPassword',
          NEW_PASSWORD_SAME_AS_CURRENT: 'newPassword',
        }) ?? 'root',
        { message: getApiErrorKey(error) },
        { shouldFocus: true },
      )
    }
  })

  return (
    <Card className="p-6 sm:p-8">
      <h2
        id="change-password-title"
        className="font-display text-2xl font-extrabold tracking-tight"
      >
        {t('password.title')}
      </h2>

      <form
        onSubmit={onSubmit}
        noValidate
        aria-labelledby="change-password-title"
        className="mt-6 space-y-5"
      >
        {errors.root && <Alert>{errorText(errors.root.message)}</Alert>}
        {changed && <Alert variant="success">{t('password.success')}</Alert>}

        <PasswordField
          label={t('password.currentPassword')}
          autoComplete="current-password"
          error={errorText(errors.currentPassword?.message)}
          {...register('currentPassword')}
        />
        <PasswordField
          label={t('password.newPassword')}
          autoComplete="new-password"
          hint={tAuth('fields.passwordHint')}
          error={errorText(errors.newPassword?.message)}
          {...register('newPassword')}
        />
        <PasswordField
          label={t('password.confirmPassword')}
          autoComplete="new-password"
          error={errorText(errors.confirmPassword?.message)}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={isSubmitting}>
          {t('password.submit')}
        </Button>
      </form>
    </Card>
  )
}
