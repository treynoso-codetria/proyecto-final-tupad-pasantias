import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { z } from 'zod'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { useAuth } from '@/features/auth/auth-context'
import { getApiErrorKey } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { offerKeys, type OfferDetail } from '@/features/offers/api'
import { optionalText } from '@/lib/form-schemas'
import { toNullableText } from '@/lib/form-values'
import { formatTimeAgo } from '@/lib/format'
import { applicationKeys, applicationsApi, COVER_LETTER_MAX } from '../api'
import { ApplicationStatusBadge } from './ApplicationStatusBadge'

const applySchema = z.object({ coverLetter: optionalText(COVER_LETTER_MAX) })

// Shown next to an offer: lets a student apply, shows the status of their
// application, and invites visitors to log in. Companies and administrators
// get nothing here.
export function ApplyPanel({ offer }: { offer: OfferDetail }) {
  const { status, user } = useAuth()
  const { t } = useTranslation('applications')
  const location = useLocation()
  const application = offer.myApplication
  const active = application && application.status !== 'WITHDRAWN'

  if (status === 'anonymous') {
    if (!offer.isAcceptingApplications) {
      return null
    }
    return (
      <Card className="p-6">
        <h2 className="font-display text-xl font-extrabold">{t('apply.guestTitle')}</h2>
        <p className="mt-2 text-sm text-muted">{t('apply.guestText')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/login"
            // After logging in, the user comes back to this offer.
            state={{ from: location.pathname }}
            className={buttonStyles('primary', 'sm')}
          >
            {t('apply.login')}
          </Link>
          <Link to="/register/student" className={buttonStyles('secondary', 'sm')}>
            {t('apply.register')}
          </Link>
        </div>
      </Card>
    )
  }

  if (user?.role !== 'STUDENT') {
    return null
  }

  if (active) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold">{t('mine.title')}</h2>
          <ApplicationStatusBadge status={application.status} />
        </div>
        <p className="mt-3 text-sm">
          {t('apply.applied', { when: formatTimeAgo(application.appliedAt) })}
        </p>
        <Link
          to="/student/applications"
          className={buttonStyles('secondary', 'sm', 'mt-5')}
        >
          {t('apply.seeMine')}
        </Link>
      </Card>
    )
  }

  if (!offer.isAcceptingApplications) {
    return null
  }
  return <ApplyForm offer={offer} withdrawnBefore={Boolean(application)} />
}

function ApplyForm({
  offer,
  withdrawnBefore,
}: {
  offer: OfferDetail
  withdrawnBefore: boolean
}) {
  const { t } = useTranslation('applications')
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(applySchema),
    defaultValues: { coverLetter: '' },
  })

  const apply = useMutation({
    mutationFn: (coverLetter: string) =>
      applicationsApi.apply(offer.id, toNullableText(coverLetter)),
    onSuccess: async () => {
      // The offer now carries the application; "My applications" changed.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: offerKeys.detail(offer.id) }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
      ])
    },
  })

  return (
    <Card className="p-6">
      <h2 className="font-display text-xl font-extrabold">{t('apply.title')}</h2>
      <p className="mt-2 text-sm text-muted">
        {withdrawnBefore ? t('apply.again') : t('apply.text')}
      </p>
      {!open ? (
        <Button className="mt-5 w-full" onClick={() => setOpen(true)}>
          {t('apply.start')}
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit(({ coverLetter }) => apply.mutate(coverLetter))}
          noValidate
          className="mt-5 space-y-4"
        >
          <TextAreaField
            label={t('apply.coverLetter')}
            hint={t('apply.coverLetterHint')}
            rows={6}
            maxLength={COVER_LETTER_MAX}
            autoFocus
            error={errorText(errors.coverLetter?.message)}
            {...register('coverLetter')}
          />
          <p className="text-sm text-muted">
            <Trans
              t={t}
              i18nKey="apply.profileHint"
              components={{
                profileLink: (
                  <Link
                    to="/student/profile"
                    className="font-bold text-ink underline decoration-2 underline-offset-4 hover:bg-accent"
                  />
                ),
              }}
            />
          </p>
          {apply.isError && <Alert>{errorText(getApiErrorKey(apply.error))}</Alert>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={apply.isPending}>
              {t('apply.submit')}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('apply.cancel')}
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
