import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '../auth-context'
import { RegisterFormShell } from '../components/RegisterFormShell'
import { getApiErrorKey, getConflictField } from '../errors'
import { formatCuit, registerEmployerSchema } from '../schemas'
import { useErrorText } from '../use-error-text'

export function RegisterEmployerPage() {
  const { t } = useTranslation('auth')
  const errorText = useErrorText()
  const { registerEmployer } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerEmployerSchema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerEmployer(values)
    } catch (error) {
      // A taken email or CUIT is shown on its field; anything else, above
      // the form.
      setError(
        getConflictField(error) ?? 'root',
        { message: getApiErrorKey(error) },
        { shouldFocus: true },
      )
    }
  })

  return (
    <RegisterFormShell
      title={t('register.employer.title')}
      subtitle={t('register.employer.subtitle')}
      onSubmit={onSubmit}
      submitting={isSubmitting}
      formError={errorText(errors.root?.message)}
    >
      <TextField
        label={t('fields.companyName')}
        autoComplete="organization"
        error={errorText(errors.companyName?.message)}
        {...register('companyName')}
      />
      <TextField
        label={t('fields.cuit')}
        inputMode="numeric"
        placeholder="30-12345678-9"
        hint={t('fields.cuitHint')}
        error={errorText(errors.cuit?.message)}
        {...register('cuit', {
          onChange: (event: { target: { value: string } }) =>
            setValue('cuit', formatCuit(event.target.value)),
        })}
      />
      <TextField
        label={t('fields.email')}
        type="email"
        autoComplete="email"
        placeholder={t('fields.companyEmailPlaceholder')}
        error={errorText(errors.email?.message)}
        {...register('email')}
      />
      <PasswordField
        label={t('fields.password')}
        autoComplete="new-password"
        hint={t('fields.passwordHint')}
        error={errorText(errors.password?.message)}
        {...register('password')}
      />
    </RegisterFormShell>
  )
}
