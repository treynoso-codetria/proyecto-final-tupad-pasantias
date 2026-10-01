import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '../auth-context'
import { RegisterFormShell } from '../components/RegisterFormShell'
import { getApiErrorKey, getConflictField } from '../errors'
import { registerStudentSchema } from '../schemas'
import { useErrorText } from '../use-error-text'

export function RegisterStudentPage() {
  const { t } = useTranslation('auth')
  const errorText = useErrorText()
  const { registerStudent } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerStudentSchema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerStudent(values)
    } catch (error) {
      // A taken email is shown on its field; anything else, above the form.
      const field = getConflictField(error) === 'email' ? 'email' : 'root'
      setError(
        field,
        { message: getApiErrorKey(error) },
        { shouldFocus: true },
      )
    }
  })

  return (
    <RegisterFormShell
      title={t('register.student.title')}
      subtitle={t('register.student.subtitle')}
      onSubmit={onSubmit}
      submitting={isSubmitting}
      formError={errorText(errors.root?.message)}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('fields.firstName')}
          autoComplete="given-name"
          error={errorText(errors.firstName?.message)}
          {...register('firstName')}
        />
        <TextField
          label={t('fields.lastName')}
          autoComplete="family-name"
          error={errorText(errors.lastName?.message)}
          {...register('lastName')}
        />
      </div>
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
        autoComplete="new-password"
        hint={t('fields.passwordHint')}
        error={errorText(errors.password?.message)}
        {...register('password')}
      />
      <TextField
        label={t('fields.career')}
        placeholder={t('fields.careerPlaceholder')}
        error={errorText(errors.career?.message)}
        {...register('career')}
      />
      <TextField
        label={t('fields.institution')}
        placeholder={t('fields.institutionPlaceholder')}
        autoComplete="organization"
        error={errorText(errors.institution?.message)}
        {...register('institution')}
      />
    </RegisterFormShell>
  )
}
