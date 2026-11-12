import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/Alert'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getApiErrorKey } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { adminApi, type AdminUser } from '../api'
import { useAdminMutation } from '../use-admin-mutation'
import { ReasonField } from './ReasonField'

type AccountStatusDialogProps = {
  // The account to activate or deactivate; null closes the dialog.
  user: AdminUser | null
  onClose: () => void
  onDone: (user: AdminUser) => void
}

// Deactivating asks for a reason, which is emailed to the user.
export function AccountStatusDialog({ user, onClose, onDone }: AccountStatusDialogProps) {
  const { t } = useTranslation('admin')
  const errorText = useErrorText()
  const [reason, setReason] = useState('')
  const [attempted, setAttempted] = useState(false)
  const deactivating = user?.isActive ?? false

  const change = useAdminMutation(
    (target: AdminUser) =>
      adminApi.setUserStatus(target.id, !target.isActive, reason.trim() || null),
    (updated) => {
      close()
      onDone(updated)
    },
  )

  function close() {
    setReason('')
    setAttempted(false)
    change.reset()
    onClose()
  }

  function confirm() {
    if (!user) return
    if (deactivating && !reason.trim()) {
      setAttempted(true)
      return
    }
    change.mutate(user)
  }

  const name = user?.name ?? ''
  return (
    <ConfirmDialog
      open={user !== null}
      onOpenChange={(open) => !open && close()}
      title={deactivating ? t('users.deactivateTitle', { name }) : t('users.activateTitle', { name })}
      description={deactivating ? t('users.deactivateText') : t('users.activateText')}
      confirmLabel={deactivating ? t('users.deactivate') : t('users.activate')}
      cancelLabel={t('cancel')}
      confirming={change.isPending}
      onConfirm={confirm}
      error={change.isError && <Alert>{errorText(getApiErrorKey(change.error))}</Alert>}
    >
      {deactivating && (
        <ReasonField
          label={t('users.reason')}
          hint={t('users.reasonHint')}
          value={reason}
          onChange={setReason}
          missing={attempted && !reason.trim()}
        />
      )}
    </ConfirmDialog>
  )
}
