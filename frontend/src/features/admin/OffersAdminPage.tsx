import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { SearchX } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { PageHeading } from '@/components/ui/PageHeading'
import { Pagination } from '@/components/ui/Pagination'
import { OFFER_STATUSES, type OfferStatus } from '@/features/offers/api'
import type { OfferLinkState } from '@/features/offers/link-state'
import { formatTimeAgo } from '@/lib/format'
import { adminApi, adminKeys, type AdminOffer, type OfferFilters } from './api'
import { OfferModerationDialog } from './components/OfferModerationDialog'
import { SearchForm } from './components/SearchForm'

const OFFER_STATUS_TONE = {
  OPEN: 'success',
  CLOSED: 'muted',
  REMOVED: 'danger',
} as const

function parseFilters(params: URLSearchParams): OfferFilters {
  const status = params.get('status')
  return {
    q: params.get('q') || undefined,
    status: OFFER_STATUSES.includes(status as OfferStatus) ? (status as OfferStatus) : undefined,
    page: Math.max(1, Number(params.get('page')) || 1),
  }
}

function toParams({ q, status, page }: OfferFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (q) params.q = q
  if (status) params.status = status
  if (page > 1) params.page = String(page)
  return params
}

export function OffersAdminPage() {
  const { t } = useTranslation('admin')
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFilters(searchParams)
  const [target, setTarget] = useState<AdminOffer | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const offers = useQuery({
    queryKey: adminKeys.offers(filters),
    queryFn: () => adminApi.offers(filters),
    placeholderData: keepPreviousData,
  })

  const update = (changes: Partial<OfferFilters>) => {
    setNotice(null)
    setSearchParams(toParams({ ...filters, page: 1, ...changes }))
  }

  return (
    <>
      <PageHeading title={t('offers.title')} description={t('offers.description')} />

      <div className="mb-8 space-y-4">
        <SearchForm
          value={filters.q}
          placeholder={t('offers.searchPlaceholder')}
          onSearch={(q) => update({ q })}
        />
        <FilterTabs
          label={t('offers.statusLabel')}
          value={filters.status}
          onChange={(status) => update({ status })}
          options={[
            { value: undefined, label: t('offers.all') },
            ...OFFER_STATUSES.map((status) => ({
              value: status,
              label: t(`offers.status.${status}`),
            })),
          ]}
        />
      </div>

      {notice && (
        <div className="mb-6">
          <Alert variant="success">{notice}</Alert>
        </div>
      )}

      {offers.isPending && <FullPageLoader fullPage={false} />}
      {offers.isError && <LoadError onRetry={() => void offers.refetch()} />}
      {offers.data?.items.length === 0 && <EmptyState icon={SearchX} title={t('offers.empty')} />}
      {offers.data && offers.data.items.length > 0 && (
        <>
          <p className="mb-4 text-sm font-semibold text-muted">
            {t('offers.total', { count: offers.data.total })}
          </p>
          <ul className="mb-8 space-y-4">
            {offers.data.items.map((offer) => (
              <li key={offer.id}>
                <OfferRow offer={offer} onModerate={() => setTarget(offer)} />
              </li>
            ))}
          </ul>
          <Pagination
            page={offers.data.page}
            totalPages={offers.data.totalPages}
            onPageChange={(page) => {
              setSearchParams(toParams({ ...filters, page }))
              window.scrollTo({ top: 0 })
            }}
          />
        </>
      )}

      <OfferModerationDialog
        offer={target}
        onClose={() => setTarget(null)}
        onDone={(updated, removed) =>
          setNotice(
            removed
              ? t('offers.removed', { title: updated.title })
              : t('offers.restored', { title: updated.title }),
          )
        }
      />
    </>
  )
}

function OfferRow({ offer, onModerate }: { offer: AdminOffer; onModerate: () => void }) {
  const { t } = useTranslation('admin')
  const backTo = `/admin/offers${window.location.search}`

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard-sm sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={OFFER_STATUS_TONE[offer.status]}>{t(`offers.status.${offer.status}`)}</Badge>
          <Badge>{offer.category.name}</Badge>
          {!offer.company.isActive && <Badge tone="danger">{t('offers.companyInactive')}</Badge>}
        </div>
        <p className="font-display text-lg leading-tight font-extrabold break-words">
          <Link
            to={`/offers/${offer.id}`}
            state={{ backTo } satisfies OfferLinkState}
            className="underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {offer.title}
          </Link>
        </p>
        <p className="text-sm">
          <span className="font-semibold">{offer.company.name}</span>
          <span className="text-muted">
            {' · '}
            {t('offers.published', { when: formatTimeAgo(offer.publishedAt) })}
            {' · '}
            {t('offers.applications', { count: offer.applicationsCount })}
          </span>
        </p>
        {offer.status === 'REMOVED' && offer.removedAt && (
          <p className="text-sm text-muted">
            {t('offers.removedReason', {
              when: formatTimeAgo(offer.removedAt),
              reason: offer.removalReason ?? '—',
            })}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={offer.status === 'REMOVED' ? 'primary' : 'secondary'}
          size="sm"
          onClick={onModerate}
        >
          {offer.status === 'REMOVED' ? t('offers.restore') : t('offers.remove')}
        </Button>
      </div>
    </div>
  )
}
