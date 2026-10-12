import { useQuery } from '@tanstack/react-query'
import { Briefcase, ExternalLink, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { NotFoundNotice } from '@/components/ui/NotFoundNotice'
import { OfferBadges } from '@/features/offers/components/OfferBadges'
import { formatLocation } from '@/features/offers/format'
import { formatDay } from '@/lib/format'
import { companiesApi, companyKeys, type PublicCompany } from './api'
import { cn } from '@/lib/cn'
import { CompanyLogo } from './CompanyLogo'

// Public page of a company with its open offers. Anyone can see it.
export function PublicCompanyPage() {
  const { t } = useTranslation('offers')
  const { id = '' } = useParams()
  const company = useQuery({
    queryKey: companyKeys.public(id),
    queryFn: () => companiesApi.getPublic(id),
  })

  if (company.isPending) {
    return <FullPageLoader fullPage={false} />
  }
  if (company.isError) {
    const notFound =
      company.error instanceof ApiError &&
      (company.error.status === 404 || company.error.status === 400)
    return notFound ? (
      <NotFoundNotice
        message={t('company.notFound')}
        backTo="/offers"
        backLabel={t('detail.back')}
      />
    ) : (
      <LoadError onRetry={() => void company.refetch()} />
    )
  }

  return <CompanyView company={company.data} />
}

function CompanyView({ company }: { company: PublicCompany }) {
  const { t } = useTranslation('offers')
  const location = [company.city, company.province].filter(Boolean).join(', ')

  return (
    <div className="space-y-10">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <CompanyLogo company={company} size="lg" />
          <div className="min-w-0">
            {company.industry && <Badge tone="accent">{company.industry}</Badge>}
            <h1
              className={cn(
                'font-display text-4xl leading-none font-extrabold tracking-tight break-words sm:text-5xl',
                company.industry && 'mt-3',
              )}
            >
              {company.name}
            </h1>
          </div>
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {location && (
            <li className="flex items-center gap-2">
              <MapPin className="size-4" aria-hidden="true" />
              {location}
            </li>
          )}
          {company.website && (
            <li>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold underline decoration-2 underline-offset-4 hover:bg-accent"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                {t('company.website')}
              </a>
            </li>
          )}
        </ul>
        {company.description && (
          <p className="mt-5 max-w-3xl whitespace-pre-line">{company.description}</p>
        )}
      </Card>

      <section>
        <h2 className="mb-5 font-display text-2xl font-extrabold tracking-tight">
          {t('company.openOffers')}
        </h2>
        {company.openOffers.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={t('company.openOffers')}
            description={t('company.noOffers')}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2">
            {company.openOffers.map((offer) => (
              <li
                key={offer.id}
                className="relative rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-ink"
              >
                <OfferBadges offer={offer} />
                <h3 className="mt-3 font-display text-lg leading-tight font-extrabold">
                  <Link
                    to={`/offers/${offer.id}`}
                    state={{ backTo: `/companies/${company.id}` }}
                    className="after:absolute after:inset-0 focus-visible:outline-none"
                  >
                    {offer.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {formatLocation(t, offer)}
                  {offer.deadline &&
                    ` · ${t('closes', { date: formatDay(offer.deadline) })}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
