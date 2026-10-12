import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { cn } from '@/lib/cn'
import { useUnreadCount } from './api'

// Link to the inbox with the number of unread notifications.
export function NotificationBell() {
  const { t } = useTranslation('notifications')
  const { data: unread = 0 } = useUnreadCount(true)
  const label = unread > 0 ? t('bellUnread', { count: unread }) : t('bell')

  return (
    <NavLink
      to="/notifications"
      aria-label={label}
      title={label}
      className={({ isActive }) =>
        cn(
          'relative grid size-9 shrink-0 place-items-center rounded-xl border-2',
          'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
          isActive
            ? 'border-ink bg-accent'
            : 'border-transparent hover:border-ink hover:bg-accent-soft',
        )
      }
    >
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-ink bg-danger px-1 text-[0.7rem] leading-none font-extrabold"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </NavLink>
  )
}
