import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { OfferModerationDialog, type ModeratedOffer } from './OfferModerationDialog'

// Shown to administrators on an offer's page: remove it or restore it there.
export function OfferModerationCard({ offer }: { offer: ModeratedOffer }) {
  const { t } = useTranslation('admin')
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const removed = offer.status === 'REMOVED'

  return (
    <Card className="space-y-4 p-6">
      <div>
        <h2 className="font-display text-xl font-extrabold">{t('offers.moderation')}</h2>
        <p className="mt-2 text-sm text-muted">{t('offers.moderationHint')}</p>
      </div>
      {notice && <Alert variant="success">{notice}</Alert>}
      <Button
        variant={removed ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => {
          setNotice(null)
          setOpen(true)
        }}
      >
        {removed ? t('offers.restore') : t('offers.remove')}
      </Button>
      <OfferModerationDialog
        offer={open ? offer : null}
        onClose={() => setOpen(false)}
        onDone={(updated, wasRemoved) =>
          setNotice(
            wasRemoved
              ? t('offers.removed', { title: updated.title })
              : t('offers.restored', { title: updated.title }),
          )
        }
      />
    </Card>
  )
}
