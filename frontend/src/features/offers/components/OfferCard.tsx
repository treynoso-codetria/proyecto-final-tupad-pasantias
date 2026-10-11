import { Building2, CalendarClock, MapPin, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatDay, formatTimeAgo } from '@/lib/format'
import type { OfferSummary } from '../api'
import type { OfferLinkState } from '../link-state'
import { formatLocation, formatSalary } from '../format'
import { OfferBadges } from './OfferBadges'
import { TagList } from './TagList'

type OfferCardProps = {
  offer: OfferSummary
  // Where the detail page's back link leads, e.g. the same search.
  backTo?: string
}

export function OfferCard({ offer, backTo }: OfferCardProps) {
  const { t } = useTranslation('offers')
  const salary = formatSalary(t, offer)

  return (
    // The title link is stretched over the whole card (after:inset-0), so the
    // card is clickable while there is still a single, named link.
    <article className="relative rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard transition-[translate,box-shadow] duration-100 focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-ink hover:-translate-0.5 hover:shadow-[6px_6px_0_0_var(--color-ink)] motion-reduce:transition-none sm:p-6">
      <OfferBadges offer={offer} />
      <h3 className="mt-3 font-display text-xl leading-tight font-extrabold tracking-tight">
        <Link
          to={`/offers/${offer.id}`}
          state={{ backTo } satisfies OfferLinkState}
          className="after:absolute after:inset-0 focus-visible:outline-none"
        >
          {offer.title}
        </Link>
      </h3>
      <ul className="mt-3 space-y-1.5 text-sm">
        <li className="flex items-center gap-2 font-semibold">
          <Building2 className="size-4 shrink-0" aria-hidden="true" />
          {offer.company.name}
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {formatLocation(t, offer)}
        </li>
        {salary && (
          <li className="flex items-center gap-2">
            <Wallet className="size-4 shrink-0" aria-hidden="true" />
            {salary}
          </li>
        )}
        {offer.deadline && (
          <li className="flex items-center gap-2">
            <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
            {t('closes', { date: formatDay(offer.deadline) })}
          </li>
        )}
      </ul>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <TagList tags={offer.tags} />
        <p className="ml-auto text-xs text-muted">
          {t('published', { when: formatTimeAgo(offer.publishedAt) })}
        </p>
      </div>
    </article>
  )
}
