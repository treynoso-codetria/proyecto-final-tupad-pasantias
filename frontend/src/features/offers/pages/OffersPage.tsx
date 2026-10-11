import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { SearchX, SlidersHorizontal } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { PageHeading } from '@/components/ui/PageHeading'
import { Pagination } from '@/components/ui/Pagination'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { cn } from '@/lib/cn'
import { offerKeys, offersApi, OFFER_SORTS, type OfferFilters } from '../api'
import { OfferCard } from '../components/OfferCard'
import { OfferFiltersPanel } from '../components/OfferFiltersPanel'
import { hasActiveFilters, parseFilters, toSearchParams } from '../filters'

// Public search of the offers students can apply to. Visitors without an
// account can browse it too.
export function OffersPage() {
  const { t } = useTranslation('offers')
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFilters(searchParams)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersId = useId()

  const offers = useQuery({
    queryKey: offerKeys.list(filters),
    queryFn: () => offersApi.list(filters),
    // Keeps the current results on screen while the next ones load.
    placeholderData: keepPreviousData,
  })

  // Any change other than the page goes back to the first page.
  const update = (changes: Partial<OfferFilters>) => {
    const next = { ...filters, page: undefined, ...changes }
    setSearchParams(toSearchParams(next))
  }

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = new FormData(event.currentTarget).get('q')
    update({ q: typeof text === 'string' ? text.trim() || undefined : undefined })
  }

  const goToPage = (page: number) => {
    setSearchParams(toSearchParams({ ...filters, page }))
    window.scrollTo({ top: 0 })
  }

  const clearFilters = () => setSearchParams(toSearchParams({ sort: filters.sort }))

  return (
    <>
      <PageHeading title={t('search.title')} description={t('search.description')} />

      <form
        role="search"
        onSubmit={onSearch}
        className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <TextField
          // Remounted when the URL changes (e.g. back button), so the box
          // shows the text of the current search.
          key={filters.q ?? ''}
          name="q"
          type="search"
          label={t('search.label')}
          placeholder={t('search.placeholder')}
          defaultValue={filters.q ?? ''}
          className="flex-1"
        />
        <Button type="submit">{t('search.submit')}</Button>
      </form>

      <div className="grid items-start gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside>
          <Button
            variant="secondary"
            size="sm"
            className="w-full lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls={filtersId}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {filtersOpen ? t('search.hideFilters') : t('search.showFilters')}
          </Button>
          <Card
            id={filtersId}
            className={cn('mt-4 p-5 lg:mt-0 lg:block', !filtersOpen && 'hidden')}
          >
            <h2 className="mb-5 font-display text-xl font-extrabold">
              {t('search.filters')}
            </h2>
            <OfferFiltersPanel filters={filters} onChange={update} />
            {hasActiveFilters(filters) && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-6 w-full"
                onClick={clearFilters}
              >
                {t('search.clear')}
              </Button>
            )}
          </Card>
        </aside>

        <section aria-labelledby={`${filtersId}-results`} className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              id={`${filtersId}-results`}
              className="font-display text-2xl font-extrabold"
              aria-live="polite"
            >
              {offers.data ? t('search.results', { count: offers.data.total }) : ''}
            </h2>
            <SelectField
              label={t('search.sort')}
              value={filters.sort ?? 'newest'}
              onChange={(event) =>
                update({
                  sort:
                    event.target.value === 'newest'
                      ? undefined
                      : (event.target.value as OfferFilters['sort']),
                })
              }
              className="w-48"
            >
              {OFFER_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {sort === 'newest' ? t('search.sortNewest') : t('search.sortDeadline')}
                </option>
              ))}
            </SelectField>
          </div>

          {offers.isPending && <FullPageLoader fullPage={false} />}
          {offers.isError && <LoadError onRetry={() => void offers.refetch()} />}
          {offers.data?.items.length === 0 && (
            <EmptyState
              icon={SearchX}
              title={t('search.emptyTitle')}
              description={t('search.emptyDescription')}
              action={
                hasActiveFilters(filters) && (
                  <Button variant="secondary" onClick={clearFilters}>
                    {t('search.clear')}
                  </Button>
                )
              }
            />
          )}
          {offers.data && offers.data.items.length > 0 && (
            <div
              className={cn(
                'space-y-5 transition-opacity',
                offers.isPlaceholderData && 'opacity-60',
              )}
            >
              {offers.data.items.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  backTo={`/offers?${searchParams.toString()}`}
                />
              ))}
              <Pagination
                page={offers.data.page}
                totalPages={offers.data.totalPages}
                onPageChange={goToPage}
              />
            </div>
          )}
        </section>
      </div>
    </>
  )
}
