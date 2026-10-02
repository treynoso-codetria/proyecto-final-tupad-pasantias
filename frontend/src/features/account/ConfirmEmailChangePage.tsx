import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { getToken } from '@/api/token'
import { Alert } from '@/components/ui/Alert'
import { buttonStyles } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { useAuth } from '@/features/auth/auth-context'
import { useTokenAction } from '@/features/auth/components/use-token-action'
import { useErrorText } from '@/features/auth/use-error-text'
import { accountApi } from './api'

// Target of the link sent to the new address when an email change is
// requested. It works with or without an open session: the link may be opened
// on another device.
export function ConfirmEmailChangePage() {
  const { t } = useTranslation('auth')
  const errorText = useErrorText()
  const { status, refreshUser } = useAuth()
  const confirmation = useTokenAction(async (token) => {
    const { email } = await accountApi.confirmEmailChange(token)
    // If there is a session in this browser, reload its user so the new
    // email shows up at once. Best effort: the change is already done.
    if (getToken()) {
      await refreshUser().catch(() => undefined)
    }
    return email
  })

  if (confirmation.status === 'working') {
    return (
      <FullPageLoader
        fullPage={false}
        label={t('confirmEmailChange.confirming')}
      />
    )
  }

  const done = confirmation.status === 'done'
  const signedIn = status === 'authenticated'

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {done
          ? t('confirmEmailChange.doneTitle')
          : t('confirmEmailChange.failedTitle')}
      </h1>
      <div className="mt-4">
        {done ? (
          <Alert variant="success">
            <Trans
              t={t}
              i18nKey="confirmEmailChange.doneText"
              values={{ email: confirmation.result }}
              components={{ strong: <strong className="break-all" /> }}
            />
          </Alert>
        ) : (
          <Alert>
            {confirmation.code === 'EMAIL_TAKEN'
              ? errorText('api.EMAIL_TAKEN')
              : t('confirmEmailChange.invalidText')}
          </Alert>
        )}
      </div>
      <Link
        to={signedIn ? '/' : '/login'}
        className={buttonStyles('primary', 'md', 'mt-6 w-full')}
      >
        {signedIn
          ? t('confirmEmailChange.continue')
          : t('confirmEmailChange.goToLogin')}
      </Link>
    </Card>
  )
}
