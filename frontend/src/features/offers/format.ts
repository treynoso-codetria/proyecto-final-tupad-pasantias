import type { TFunction } from 'i18next'
import { formatMoney } from '@/lib/format'
import type { OfferSummary } from './api'

// "From $ 900.000 a month", or null when the offer publishes no salary.
export function formatSalary(
  t: TFunction<'offers'>,
  { salaryMin, salaryMax }: Pick<OfferSummary, 'salaryMin' | 'salaryMax'>,
): string | null {
  if (salaryMin !== null && salaryMax !== null) {
    return salaryMin === salaryMax
      ? formatMoney(salaryMin)
      : t('salary.range', {
          min: formatMoney(salaryMin),
          max: formatMoney(salaryMax),
        })
  }
  if (salaryMin !== null) {
    return t('salary.from', { min: formatMoney(salaryMin) })
  }
  if (salaryMax !== null) {
    return t('salary.upTo', { max: formatMoney(salaryMax) })
  }
  return null
}

// "Godoy Cruz, Mendoza"; a remote offer without a place is just "Remote".
export function formatLocation(
  t: TFunction<'offers'>,
  offer: Pick<OfferSummary, 'city' | 'province' | 'modality'>,
): string {
  const place = [offer.city, offer.province].filter(Boolean).join(', ')
  return place || t(`modality.${offer.modality}`)
}
