import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Pencil, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { getApiErrorKey } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { cn } from '@/lib/cn'
import { formatDay, formatTimeAgo } from '@/lib/format'
import {
  OFFER_STATUSES,
  offerKeys,
  offersApi,
  type MyOffer,
  type OfferStatus,
} from '../api'
import { OfferBadges } from '../components/OfferBadges'
import type { OfferLinkState } from '../link-state'

const STATUS_TONE = {
  OPEN: 'success',
  CLOSED: 'muted',
  REMOVED: 'danger',
} as const

export function MyOffersPage() {
  const { t } = useTranslation('offers')
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status = OFFER_STATUSES.find((item) => item === statusParam)
  const [toClose, setToClose] = useState<MyOffer | null>(null)

  const offers = useQuery({
    queryKey: offerKeys.mine(status),
    queryFn: () => offersApi.mine(status),
  })

  const close = useMutation({
    mutationFn: (offer: MyOffer) => offersApi.close(offer.id),
    onSuccess: async (closed) => {
      setToClose(null)
      // The detail is replaced with the API's answer, so opening it right
      // away does not show the cached open version; the lists are reloaded.
      queryClient.setQueryData(offerKeys.detail(closed.id), closed)
      await queryClient.invalidateQueries({ queryKey: offerKeys.all })
    },
  })

  const backTo = `/employer/offers${status ? `?status=${status}` : ''}`

  return (
    <>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight sm:text-5xl">
            {t('mine.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">{t('mine.description')}</p>
        </div>
        <Link to="/employer/offers/new" className={buttonStyles()}>
          <Plus className="size-5" aria-hidden="true" />
          {t('mine.publish')}
        </Link>
      </div>

      <nav aria-label={t('mine.filterLabel')} className="mb-6 flex flex-wrap gap-2">
        {([undefined, ...OFFER_STATUSES] as (OfferStatus | undefined)[]).map((item) => (
          <button
            key={item ?? 'all'}
            type="button"
            aria-pressed={item === status}
            onClick={() => setSearchParams(item ? { status: item } : {})}
            className={cn(
              'cursor-pointer rounded-xl border-2 px-3 py-1.5 font-display text-sm font-bold',
              'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
              item === status
                ? 'border-ink bg-accent shadow-hard-sm'
                : 'border-ink/30 bg-surface hover:border-ink hover:bg-accent-soft',
            )}
          >
            {item ? t(`mine.tabs.${item}`) : t('mine.tabs.all')}
          </button>
        ))}
      </nav>

      {close.isSuccess && (
        <div className="mb-6">
          <Alert variant="success">{t('mine.closedNotice')}</Alert>
        </div>
      )}

      {offers.isPending && <FullPageLoader fullPage={false} />}
      {offers.isError && <LoadError onRetry={() => void offers.refetch()} />}
      {offers.data?.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title={status ? t('mine.emptyStatus') : t('mine.emptyTitle')}
          description={status ? undefined : t('mine.emptyDescription')}
          action={
            !status && (
              <Link to="/employer/offers/new" className={buttonStyles()}>
                {t('mine.publish')}
              </Link>
            )
          }
        />
      )}
      {offers.data && offers.data.length > 0 && (
        <ul className="space-y-5">
          {offers.data.map((offer) => (
            <li
              key={offer.id}
              className="rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONE[offer.status]}>
                      {t(`status.${offer.status}`)}
                    </Badge>
                    <OfferBadges offer={offer} />
                  </div>
                  <h2 className="font-display text-xl leading-tight font-extrabold">
                    <Link
                      to={`/offers/${offer.id}`}
                      state={{ backTo } satisfies OfferLinkState}
                      className="underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      {offer.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted">
                    {t('published', { when: formatTimeAgo(offer.publishedAt) })}
                    {offer.deadline && ` · ${t('closes', { date: formatDay(offer.deadline) })}`}
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <Users className="size-4" aria-hidden="true" />
                    {t('mine.applicants', { count: offer.applicationsCount })}
                    {offer.pendingApplicationsCount > 0 && (
                      <Badge tone="accent">
                        {t('mine.pending', { count: offer.pendingApplicationsCount })}
                      </Badge>
                    )}
                  </p>
                </div>
                {offer.status === 'OPEN' && (
                  <div className="flex shrink-0 gap-2">
                    <Link
                      to={`/employer/offers/${offer.id}/edit`}
                      className={buttonStyles('secondary', 'sm')}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      {t('mine.edit')}
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        close.reset()
                        setToClose(offer)
                      }}
                    >
                      {t('mine.close')}
                    </Button>
                  </div>
                )}
              </div>
              {offer.status === 'REMOVED' && (
                <div className="mt-4">
                  <Alert>
                    {t('mine.removedReason', { reason: offer.removalReason ?? '—' })}
                  </Alert>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toClose !== null}
        onOpenChange={(open) => !open && setToClose(null)}
        title={t('mine.closeTitle')}
        description={t('mine.closeText', { title: toClose?.title ?? '' })}
        confirmLabel={t('mine.closeConfirm')}
        cancelLabel={t('mine.cancel')}
        confirming={close.isPending}
        onConfirm={() => toClose && close.mutate(toClose)}
        error={close.isError && <Alert>{errorText(getApiErrorKey(close.error))}</Alert>}
      />
    </>
  )
}
