import { Ban, CircleCheck, RotateCcw, UserX, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatDateTime } from '@/lib/format'
import type { AdminAction, AdminActionType } from '../api'

const ICONS: Record<AdminActionType, LucideIcon> = {
  USER_ACTIVATED: CircleCheck,
  USER_DEACTIVATED: UserX,
  OFFER_REMOVED: Ban,
  OFFER_RESTORED: RotateCcw,
}

// Entries of the moderation log, used by the dashboard and the activity page.
export function ActionList({ actions }: { actions: AdminAction[] }) {
  return (
    <ul className="divide-y-2 divide-ink/10">
      {actions.map((action) => (
        <li key={action.id} className="py-4 first:pt-0 last:pb-0">
          <ActionItem action={action} />
        </li>
      ))}
    </ul>
  )
}

function ActionItem({ action }: { action: AdminAction }) {
  const { t } = useTranslation('admin')
  const Icon = ICONS[action.action]

  let target
  if (action.targetOffer) {
    target = (
      <Link
        to={`/offers/${action.targetOffer.id}`}
        className="font-semibold underline decoration-2 underline-offset-4 hover:bg-accent"
      >
        {action.targetOffer.title}
      </Link>
    )
  } else if (action.targetUser) {
    target = (
      <span className="font-semibold">
        {action.targetUser.name}{' '}
        <span className="font-normal break-all text-muted">({action.targetUser.email})</span>
      </span>
    )
  } else {
    target = <span className="text-muted">{t('activity.deleted')}</span>
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-accent-soft">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-1 text-sm">
        <p>
          <span className="font-display font-bold">{t(`activity.action.${action.action}`)}</span>
          {': '}
          {target}
        </p>
        {action.reason && (
          <p className="break-words">{t('activity.reason', { reason: action.reason })}</p>
        )}
        <p className="text-muted">
          {formatDateTime(action.createdAt)} · {t('activity.by', { email: action.admin.email })}
        </p>
      </div>
    </div>
  )
}
