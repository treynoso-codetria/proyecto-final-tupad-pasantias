import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '../auth-context'
import { getApiErrorKey } from '../errors'
import { loginSchema } from '../schemas'
import { useErrorText } from '../use-error-text'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const errorText = useErrorText()
  const { login } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      // On success GuestOnly redirects to the home of the user's role.
      await login(values)
    } catch (error) {
      setError('root', { message: getApiErrorKey(error) })
    }
  })

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {t('login.title')}
      </h1>
      <p className="mt-2 text-muted">{t('login.subtitle')}</p>

      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
        {errors.root && <Alert>{errorText(errors.root.message)}</Alert>}

        <TextField
          label={t('fields.email')}
          type="email"
          autoComplete="email"
          placeholder={t('fields.emailPlaceholder')}
          error={errorText(errors.email?.message)}
          {...register('email')}
        />
        <PasswordField
          label={t('fields.password')}
          autoComplete="current-password"
          error={errorText(errors.password?.message)}
          {...register('password')}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          {t('login.submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm">
        {t('login.noAccount')}{' '}
        <Link
          to="/register"
          className="font-bold underline decoration-2 underline-offset-4 hover:bg-accent"
        >
          {t('login.registerLink')}
        </Link>
      </p>
    </Card>
  )
}
