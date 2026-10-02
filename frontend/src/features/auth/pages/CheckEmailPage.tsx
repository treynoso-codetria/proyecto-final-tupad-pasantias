import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { authApi } from '../api'
import { getApiErrorKey, type ErrorKey } from '../errors'
import { useErrorText } from '../use-error-text'

// Passed through the router by the screen that sends the user here.
type CheckEmailState = {
  email: string
  // False when the account was created but the email could not be sent.
  emailSent?: boolean
  // 'login': the user tried to log in with an unverified account.
  reason?: 'login'
}

type ResendState =
  | { status: 'idle' | 'sending' | 'sent' }
  | { status: 'failed'; error: ErrorKey }

// Shown after registering, and when logging in with an unverified account:
// the account exists but cannot be used until the emailed link is opened.
export function CheckEmailPage() {
  const { t } = useTranslation('auth')
  const errorText = useErrorText()
  const state = useLocation().state as CheckEmailState | null
  const [resend, setResend] = useState<ResendState>({ status: 'idle' })

  // Opened directly (no registration or login just before): nothing to show.
  if (!state?.email) {
    return <Navigate to="/login" replace />
  }
  const { email, emailSent = true, reason } = state

  const handleResend = async () => {
    setResend({ status: 'sending' })
    try {
      await authApi.resendVerification(email)
      setResend({ status: 'sent' })
    } catch (error) {
      setResend({ status: 'failed', error: getApiErrorKey(error) })
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <span className="grid size-14 -rotate-3 place-items-center rounded-xl border-2 border-ink bg-accent shadow-hard-sm">
        <MailCheck className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight">
        {t('checkEmail.title')}
      </h1>
      <p className="mt-3 break-words">
        <Trans
          t={t}
          i18nKey={
            reason === 'login' ? 'checkEmail.notVerified' : 'checkEmail.sent'
          }
          values={{ email }}
          components={{ strong: <strong /> }}
        />
      </p>
      <p className="mt-2 text-sm text-muted">{t('checkEmail.hint')}</p>

      <div className="mt-6 space-y-4">
        {!emailSent && resend.status === 'idle' && (
          <Alert>{t('checkEmail.notSent')}</Alert>
        )}
        {resend.status === 'sent' && (
          <Alert variant="success">{t('checkEmail.resent')}</Alert>
        )}
        {resend.status === 'failed' && <Alert>{errorText(resend.error)}</Alert>}

        <Button
          variant="secondary"
          loading={resend.status === 'sending'}
          onClick={handleResend}
          className="w-full"
        >
          {t('checkEmail.resend')}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link
          to="/login"
          className="font-bold underline decoration-2 underline-offset-4 hover:bg-accent"
        >
          {t('checkEmail.backToLogin')}
        </Link>
      </p>
    </Card>
  )
}
