import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router'
import { buttonStyles } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { authApi } from '../api'
import { useAuth } from '../auth-context'
import { useTokenAction } from '../components/use-token-action'
import { ROLE_HOME_PATH } from '../roles'

// Target of the link in the verification email: confirms the email and, as
// the API answers with a session, takes the user straight to their home.
export function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const auth = useAuth()
  const { loginWithToken } = auth
  const verification = useTokenAction(async (token) => {
    const { accessToken } = await authApi.verifyEmail(token)
    await loginWithToken(accessToken)
  })

  if (verification.status === 'working') {
    return <FullPageLoader fullPage={false} label={t('verifyEmail.verifying')} />
  }
  if (verification.status === 'done' && auth.status === 'authenticated') {
    return <Navigate to={ROLE_HOME_PATH[auth.user.role]} replace />
  }

  const alreadyVerified =
    verification.status === 'failed' &&
    verification.code === 'EMAIL_ALREADY_VERIFIED'

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {alreadyVerified
          ? t('verifyEmail.alreadyTitle')
          : t('verifyEmail.failedTitle')}
      </h1>
      <p className="mt-3">
        {alreadyVerified
          ? t('verifyEmail.alreadyText')
          : t('verifyEmail.invalidText')}
      </p>
      <Link to="/login" className={buttonStyles('primary', 'md', 'mt-6 w-full')}>
        {t('verifyEmail.goToLogin')}
      </Link>
    </Card>
  )
}
