import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import type { OfferSummary } from '../api'

export function OfferBadges({
  offer,
}: {
  offer: Pick<OfferSummary, 'type' | 'modality' | 'workload'>
}) {
  const { t } = useTranslation('offers')

  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone="accent">{t(`type.${offer.type}`)}</Badge>
      <Badge>{t(`modality.${offer.modality}`)}</Badge>
      <Badge>{t(`workload.${offer.workload}`)}</Badge>
    </div>
  )
}
