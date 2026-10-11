import * as AlertDialog from '@radix-ui/react-alert-dialog'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { buttonStyles } from './button-styles'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  confirming?: boolean
  // Shown inside the dialog, e.g. when the confirmed action failed.
  error?: ReactNode
}

// Asks before an action that cannot be undone. Radix handles focus trapping,
// Escape and the ARIA roles; this only styles it.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirming = false,
  error,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-1/2 rounded-2xl border-2 border-ink bg-surface p-6 shadow-hard-lg focus:outline-none sm:p-8">
          <AlertDialog.Title className="font-display text-2xl font-extrabold tracking-tight">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-muted">
            {description}
          </AlertDialog.Description>
          {error && <div className="mt-4">{error}</div>}
          <div className="mt-7 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel className={buttonStyles('secondary')}>
              {cancelLabel}
            </AlertDialog.Cancel>
            {/* Not AlertDialog.Action: that closes the dialog at once, and it
                has to stay open while the action runs or if it fails. */}
            <Button loading={confirming} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
