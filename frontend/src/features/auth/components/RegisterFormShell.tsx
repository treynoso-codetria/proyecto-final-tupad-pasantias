import { ArrowLeft } from 'lucide-react'
import type { FormEventHandler, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

type RegisterFormShellProps = {
  title: string
  subtitle: string
  onSubmit: FormEventHandler<HTMLFormElement>
  submitting: boolean
  formError?: string
  children: ReactNode
}

// Frame shared by the student and employer registration forms.
export function RegisterFormShell({
  title,
  subtitle,
  onSubmit,
  submitting,
  formError,
  children,
}: RegisterFormShellProps) {
  const { t } = useTranslation('auth')

  return (
    <div>
      <Link
        to="/register"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4 hover:bg-accent"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('register.changeType')}
      </Link>

      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-muted">{subtitle}</p>

        <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
          {formError && <Alert>{formError}</Alert>}
          {children}
          <Button type="submit" loading={submitting} className="w-full">
            {t('register.submit')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          {t('register.haveAccount')}{' '}
          <Link
            to="/login"
            className="font-bold underline decoration-2 underline-offset-4 hover:bg-accent"
          >
            {t('register.loginLink')}
          </Link>
        </p>
      </Card>
    </div>
  )
}
