import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { BackLink } from '@/components/ui/BackLink'
import { buttonStyles } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { NotFoundNotice } from '@/components/ui/NotFoundNotice'
import { CompanyLogo } from '@/features/companies/CompanyLogo'
import { ApplyPanel } from '@/features/applications/components/ApplyPanel'
import { useAuth } from '@/features/auth/auth-context'
import { formatDay, formatTimeAgo } from '@/lib/format'
import { offerKeys, offersApi, type OfferDetail } from '../api'
import { OfferBadges } from '../components/OfferBadges'
import { TagList } from '../components/TagList'
import { formatLocation, formatSalary } from '../format'
import type { OfferLinkState } from '../link-state'

export function OfferDetailPage() {
  const { t } = useTranslation('offers')
  const { id = '' } = useParams()
  const state = useLocation().state as OfferLinkState | null
  const backTo = state?.backTo ?? '/offers'
  const offer = useQuery({
    queryKey: offerKeys.detail(id),
    queryFn: () => offersApi.get(id),
  })

  if (offer.isPending) {
    return <FullPageLoader fullPage={false} />
  }
  if (offer.isError) {
    const notFound =
      offer.error instanceof ApiError &&
      (offer.error.status === 404 || offer.error.status === 400)
    return notFound ? (
      <NotFoundNotice
        message={t('detail.notFound')}
        backTo="/offers"
        backLabel={t('detail.back')}
      />
    ) : (
      <LoadError onRetry={() => void offer.refetch()} />
    )
  }

  return (
    <>
      <BackLink to={backTo} label={t('detail.back')} />
      <OfferDetailView offer={offer.data} />
    </>
  )
}

function OfferDetailView({ offer }: { offer: OfferDetail }) {
  const { t } = useTranslation('offers')
  const { user } = useAuth()
  const isOwner = user?.company?.id === offer.company.id
  const salary = formatSalary(t, offer)

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <article className="min-w-0 space-y-8">
        <header>
          <OfferBadges offer={offer} />
          <h1 className="mt-4 font-display text-4xl leading-none font-extrabold tracking-tight text-balance sm:text-5xl">
            {offer.title}
          </h1>
          <p className="mt-3 text-lg">
            <Link
              to={`/companies/${offer.company.id}`}
              className="font-bold underline decoration-2 underline-offset-4 hover:bg-accent"
            >
              {offer.company.name}
            </Link>
            <span className="text-muted"> · {formatLocation(t, offer)}</span>
          </p>
          {isOwner && offer.status === 'OPEN' && (
            <Link
              to={`/employer/offers/${offer.id}/edit`}
              className={buttonStyles('secondary', 'sm', 'mt-5')}
            >
              <Pencil className="size-4" aria-hidden="true" />
              {t('detail.edit')}
            </Link>
          )}
        </header>

        <StatusNotice offer={offer} />

        <Section title={t('detail.description')}>
          <p className="whitespace-pre-line">{offer.description}</p>
        </Section>
        {offer.requirements && (
          <Section title={t('detail.requirements')}>
            <p className="whitespace-pre-line">{offer.requirements}</p>
          </Section>
        )}
        {offer.tags.length > 0 && (
          <Section title={t('detail.tags')}>
            <TagList tags={offer.tags} />
          </Section>
        )}
      </article>

      <aside className="space-y-6">
        <ApplyPanel offer={offer} />
        <Card className="p-6">
          <h2 className="font-display text-xl font-extrabold">{t('detail.facts')}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Fact label={t('detail.category')}>{offer.category.name}</Fact>
            <Fact label={t('detail.location')}>{formatLocation(t, offer)}</Fact>
            <Fact label={t('detail.salary')}>{salary ?? t('salary.notSpecified')}</Fact>
            <Fact label={t('detail.vacancies')}>{offer.vacancies}</Fact>
            <Fact label={t('detail.deadline')}>
              {offer.deadline ? formatDay(offer.deadline) : t('detail.noDeadline')}
            </Fact>
            <Fact label={t('detail.published')}>{formatTimeAgo(offer.publishedAt)}</Fact>
          </dl>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-xl font-extrabold">{t('detail.company')}</h2>
          <div className="mt-3 flex items-center gap-3">
            <CompanyLogo company={offer.company} />
            <div className="min-w-0">
              <p className="font-bold">{offer.company.name}</p>
              {offer.company.industry && (
                <p className="text-sm text-muted">{offer.company.industry}</p>
              )}
            </div>
          </div>
          {offer.company.description && (
            <p className="mt-3 line-clamp-4 text-sm">{offer.company.description}</p>
          )}
          <Link
            to={`/companies/${offer.company.id}`}
            className={buttonStyles('secondary', 'sm', 'mt-5')}
          >
            {t('detail.viewCompany')}
          </Link>
        </Card>
      </aside>
    </div>
  )
}

// Why the offer cannot be applied to, when that is the case.
function StatusNotice({ offer }: { offer: OfferDetail }) {
  const { t } = useTranslation('offers')

  if (offer.status === 'REMOVED') {
    return (
      <Alert>{t('detail.removed', { reason: offer.removalReason ?? '—' })}</Alert>
    )
  }
  if (offer.status === 'CLOSED') {
    return <Alert variant="info">{t('detail.closed')}</Alert>
  }
  if (!offer.isAcceptingApplications) {
    return <Alert variant="info">{t('detail.expired')}</Alert>
  }
  return null
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-2xl font-extrabold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-bold">{label}</dt>
      <dd className="text-muted">{children}</dd>
    </div>
  )
}
