import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/auth-context'
import { ChangeEmailForm } from './ChangeEmailForm'
import { ChangePasswordForm } from './ChangePasswordForm'

// Account settings, common to the three roles.
export function AccountPage() {
  const { t } = useTranslation('account')
  const { user } = useAuth()
  if (!user) {
    return null
  }

  return (
    <>
      <div className="mb-10">
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{t('description')}</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <ChangeEmailForm currentEmail={user.email} />
        <ChangePasswordForm />
      </div>
    </>
  )
}
