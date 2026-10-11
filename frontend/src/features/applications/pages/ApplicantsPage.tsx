import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileDown, Mail, Phone, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { useAuth } from '@/features/auth/auth-context'
import { getApiErrorKey } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { offerKeys, offersApi } from '@/features/offers/api'
import { formatTimeAgo } from '@/lib/format'
import {
  APPLICANT_STATUSES,
  applicationKeys,
  applicationsApi,
  type Applicant,
  type Decision,
} from '../api'
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge'
import type { ApplicantLinkState } from './ApplicantProfilePage'

// The applicants of one of the employer's offers, to review and answer.
export function ApplicantsPage() {
  const { t } = useTranslation('applications')
  const { id: offerId = '' } = useParams()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status = APPLICANT_STATUSES.find((item) => item === statusParam)

  const offer = useQuery({
    queryKey: offerKeys.detail(offerId),
    queryFn: () => offersApi.get(offerId),
  })
  const isOwn = offer.data && offer.data.company.id === user?.company?.id
  const applicants = useQuery({
    queryKey: applicationKeys.applicants(offerId, status),
    queryFn: () => applicationsApi.applicants(offerId, status),
    enabled: Boolean(isOwn),
  })

  let content
  if (offer.isPending || (isOwn && applicants.isPending)) {
    content = <FullPageLoader fullPage={false} />
  } else if (offer.isError) {
    content = <LoadError onRetry={() => void offer.refetch()} />
  } else if (!isOwn) {
    content = <Alert>{t('applicants.notOwn')}</Alert>
  } else if (applicants.isError) {
    content = <LoadError onRetry={() => void applicants.refetch()} />
  } else if (applicants.data?.length === 0) {
    content = (
      <EmptyState
        icon={Users}
        title={status ? t('applicants.emptyStatus') : t('applicants.emptyTitle')}
        description={status ? undefined : t('applicants.emptyDescription')}
      />
    )
  } else {
    content = (
      <ul className="space-y-5">
        {applicants.data?.map((applicant) => (
          <ApplicantCard
            key={applicant.id}
            applicant={applicant}
            backTo={`/employer/offers/${offerId}/applications${status ? `?status=${status}` : ''}`}
          />
        ))}
      </ul>
    )
  }

  return (
    <>
      <BackLink to="/employer/offers" label={t('applicants.back')} />
      <div className="mb-8">
        <p className="font-display text-sm font-bold tracking-wide text-muted uppercase">
          {t('applicants.title')}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-none font-extrabold tracking-tight text-balance sm:text-5xl">
          {offer.data?.title ?? ''}
        </h1>
        {applicants.data && (
          <p className="mt-3 text-lg text-muted">
            {t('applicants.count', { count: applicants.data.length })}
          </p>
        )}
      </div>
      {isOwn && (
        <div className="mb-6">
          <FilterTabs
            label={t('applicants.filterLabel')}
            value={status}
            onChange={(item) => setSearchParams(item ? { status: item } : {})}
            options={[
              { value: undefined, label: t('applicants.all') },
              ...APPLICANT_STATUSES.map((item) => ({
                value: item,
                label: t(`status.${item}`),
              })),
            ]}
          />
        </div>
      )}
      {content}
    </>
  )
}

function ApplicantCard({
  applicant,
  backTo,
}: {
  applicant: Applicant
  backTo: string
}) {
  const { t } = useTranslation('applications')
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const { student } = applicant
  const place = [student.city, student.province].filter(Boolean).join(', ')

  const decide = useMutation({
    mutationFn: (decision: Decision) => applicationsApi.decide(applicant.id, decision),
    onSuccess: async () => {
      // Lists of every status, and the counts in "My offers".
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
        queryClient.invalidateQueries({ queryKey: offerKeys.all }),
      ])
    },
  })

  return (
    <li className="rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl leading-tight font-extrabold">
              {student.firstName} {student.lastName}
            </h2>
            <ApplicationStatusBadge status={applicant.status} />
          </div>
          <p className="text-sm">
            {student.career} · {student.institution}
            {student.studyYear !== null &&
              ` · ${t('applicants.year', { year: student.studyYear })}`}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <li>
              <a
                href={`mailto:${student.email}`}
                className="inline-flex items-center gap-1.5 font-semibold underline decoration-2 underline-offset-4 hover:bg-accent"
              >
                <Mail className="size-4" aria-hidden="true" />
                {student.email}
              </a>
            </li>
            {student.phone && (
              <li>
                <a
                  href={`tel:${student.phone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-1.5 font-semibold underline decoration-2 underline-offset-4 hover:bg-accent"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {student.phone}
                </a>
              </li>
            )}
            {place && <li className="text-muted">{place}</li>}
          </ul>
          <p className="text-sm text-muted">
            {t('applicants.applied', { when: formatTimeAgo(applicant.appliedAt) })}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {applicant.status !== 'ACCEPTED' && (
            <Button
              size="sm"
              loading={decide.isPending && decide.variables === 'ACCEPTED'}
              disabled={decide.isPending}
              onClick={() => decide.mutate('ACCEPTED')}
            >
              {t('applicants.accept')}
            </Button>
          )}
          {applicant.status !== 'REJECTED' && (
            <Button
              variant="secondary"
              size="sm"
              loading={decide.isPending && decide.variables === 'REJECTED'}
              disabled={decide.isPending}
              onClick={() => decide.mutate('REJECTED')}
            >
              {t('applicants.reject')}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border-2 border-ink/15 bg-paper p-4">
        <p className="text-xs font-bold tracking-wide text-muted uppercase">
          {t('applicants.coverLetter')}
        </p>
        <p className="mt-1 whitespace-pre-line">
          {applicant.coverLetter ?? (
            <span className="text-muted">{t('applicants.noCoverLetter')}</span>
          )}
        </p>
      </div>

      {decide.isError && (
        <div className="mt-4">
          <Alert>{errorText(getApiErrorKey(decide.error))}</Alert>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to={`/employer/students/${student.id}`}
          state={{ backTo } satisfies ApplicantLinkState}
          className={buttonStyles('secondary', 'sm')}
        >
          {t('applicants.profile')}
        </Link>
        {applicant.cvUrl && (
          <a
            href={applicant.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles('secondary', 'sm')}
          >
            <FileDown className="size-4" aria-hidden="true" />
            {t('applicants.cv')}
          </a>
        )}
      </div>
    </li>
  )
}
