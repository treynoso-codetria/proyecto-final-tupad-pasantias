import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { PageHeading } from '@/components/ui/PageHeading'
import { getApiErrorKey } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { offerKeys } from '@/features/offers/api'
import { OfferBadges } from '@/features/offers/components/OfferBadges'
import { formatLocation } from '@/features/offers/format'
import type { OfferLinkState } from '@/features/offers/link-state'
import { formatTimeAgo } from '@/lib/format'
import {
  APPLICATION_STATUSES,
  applicationKeys,
  applicationsApi,
  type MyApplication,
} from '../api'
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge'

export function MyApplicationsPage() {
  const { t } = useTranslation('applications')
  const { t: tOffers } = useTranslation('offers')
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status = APPLICATION_STATUSES.find((item) => item === statusParam)
  const [toWithdraw, setToWithdraw] = useState<MyApplication | null>(null)

  const applications = useQuery({
    queryKey: applicationKeys.mine(status),
    queryFn: () => applicationsApi.mine(status),
  })

  const withdraw = useMutation({
    mutationFn: (application: MyApplication) =>
      applicationsApi.withdraw(application.id),
    onSuccess: async (_withdrawn, application) => {
      setToWithdraw(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
        queryClient.invalidateQueries({
          queryKey: offerKeys.detail(application.offerId),
        }),
      ])
    },
  })

  const backTo = `/student/applications${status ? `?status=${status}` : ''}`

  return (
    <>
      <PageHeading title={t('mine.title')} description={t('mine.description')} />
      <div className="mb-6">
        <FilterTabs
          label={t('mine.filterLabel')}
          value={status}
          onChange={(item) => setSearchParams(item ? { status: item } : {})}
          options={[
            { value: undefined, label: t('mine.all') },
            ...APPLICATION_STATUSES.map((item) => ({
              value: item,
              label: t(`status.${item}`),
            })),
          ]}
        />
      </div>

      {withdraw.isSuccess && (
        <div className="mb-6">
          <Alert variant="success">{t('mine.withdrawn')}</Alert>
        </div>
      )}

      {applications.isPending && <FullPageLoader fullPage={false} />}
      {applications.isError && (
        <LoadError onRetry={() => void applications.refetch()} />
      )}
      {applications.data?.length === 0 && (
        <EmptyState
          icon={FileText}
          title={status ? t('mine.emptyStatus') : t('mine.emptyTitle')}
          description={status ? undefined : t('mine.emptyDescription')}
          action={
            !status && (
              <Link to="/offers" className={buttonStyles()}>
                {t('mine.browse')}
              </Link>
            )
          }
        />
      )}
      {applications.data && applications.data.length > 0 && (
        <ul className="space-y-5">
          {applications.data.map((application) => {
            const { offer } = application
            const removed = offer.status === 'REMOVED'
            return (
              <li
                key={application.id}
                className="rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <ApplicationStatusBadge status={application.status} />
                      <OfferBadges offer={offer} />
                    </div>
                    <h2 className="font-display text-xl leading-tight font-extrabold">
                      {removed ? (
                        offer.title
                      ) : (
                        <Link
                          to={`/offers/${offer.id}`}
                          state={{ backTo } satisfies OfferLinkState}
                          className="underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          {offer.title}
                        </Link>
                      )}
                    </h2>
                    <p className="text-sm">
                      <span className="font-semibold">{offer.company.name}</span>
                      <span className="text-muted"> · {formatLocation(tOffers, offer)}</span>
                    </p>
                    <p className="text-sm text-muted">
                      {t('mine.applied', { when: formatTimeAgo(application.appliedAt) })}
                      {application.reviewedAt &&
                        ` · ${t('mine.answered', {
                          when: formatTimeAgo(application.reviewedAt),
                        })}`}
                    </p>
                    {removed && <p className="text-sm font-semibold">{t('mine.unavailable')}</p>}
                    {offer.status === 'CLOSED' && (
                      <p className="text-sm font-semibold">{t('mine.offerClosed')}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/messages/${application.id}`}
                      className={buttonStyles('secondary', 'sm')}
                    >
                      <MessageSquare className="size-4" aria-hidden="true" />
                      {t('mine.messages')}
                    </Link>
                    {application.status === 'PENDING' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          withdraw.reset()
                          setToWithdraw(application)
                        }}
                      >
                        {t('mine.withdraw')}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={toWithdraw !== null}
        onOpenChange={(open) => !open && setToWithdraw(null)}
        title={t('mine.withdrawTitle')}
        description={t('mine.withdrawText', { title: toWithdraw?.offer.title ?? '' })}
        confirmLabel={t('mine.withdrawConfirm')}
        cancelLabel={t('mine.cancel')}
        confirming={withdraw.isPending}
        onConfirm={() => toWithdraw && withdraw.mutate(toWithdraw)}
        error={withdraw.isError && <Alert>{errorText(getApiErrorKey(withdraw.error))}</Alert>}
      />
    </>
  )
}
