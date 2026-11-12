import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/Alert'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getApiErrorKey } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import type { OfferStatus } from '@/features/offers/api'
import { adminApi, type AdminOffer } from '../api'
import { useAdminMutation } from '../use-admin-mutation'
import { ReasonField } from './ReasonField'

export type ModeratedOffer = { id: string; title: string; status: OfferStatus }

type OfferModerationDialogProps = {
  // A removed offer is restored; any other is removed. null closes it.
  offer: ModeratedOffer | null
  onClose: () => void
  onDone?: (offer: AdminOffer, removed: boolean) => void
}

// Removing asks for a reason, which the company sees.
export function OfferModerationDialog({ offer, onClose, onDone }: OfferModerationDialogProps) {
  const { t } = useTranslation('admin')
  const errorText = useErrorText()
  const [reason, setReason] = useState('')
  const [attempted, setAttempted] = useState(false)
  const removing = offer?.status !== 'REMOVED'

  const moderate = useAdminMutation(
    (target: ModeratedOffer) =>
      target.status === 'REMOVED'
        ? adminApi.restoreOffer(target.id)
        : adminApi.removeOffer(target.id, reason.trim()),
    (updated) => {
      close()
      onDone?.(updated, updated.status === 'REMOVED')
    },
  )

  function close() {
    setReason('')
    setAttempted(false)
    moderate.reset()
    onClose()
  }

  function confirm() {
    if (!offer) return
    if (removing && !reason.trim()) {
      setAttempted(true)
      return
    }
    moderate.mutate(offer)
  }

  const title = offer?.title ?? ''
  return (
    <ConfirmDialog
      open={offer !== null}
      onOpenChange={(open) => !open && close()}
      title={removing ? t('offers.removeTitle', { title }) : t('offers.restoreTitle', { title })}
      description={removing ? t('offers.removeText') : t('offers.restoreText')}
      confirmLabel={removing ? t('offers.remove') : t('offers.restore')}
      cancelLabel={t('cancel')}
      confirming={moderate.isPending}
      onConfirm={confirm}
      error={moderate.isError && <Alert>{errorText(getApiErrorKey(moderate.error))}</Alert>}
    >
      {removing && (
        <ReasonField
          label={t('offers.reason')}
          hint={t('offers.reasonHint')}
          value={reason}
          onChange={setReason}
          missing={attempted && !reason.trim()}
        />
      )}
    </ConfirmDialog>
  )
}
