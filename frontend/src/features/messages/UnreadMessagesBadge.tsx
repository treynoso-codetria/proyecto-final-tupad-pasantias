import { useTranslation } from 'react-i18next'
import { useUnreadMessages } from './api'

// Number of unread messages, next to "Messages" in the navigation.
export function UnreadMessagesBadge() {
  const { t } = useTranslation('messages')
  const { data: unread = 0 } = useUnreadMessages()

  if (unread === 0) {
    return null
  }
  return (
    <>
      <span
        aria-hidden="true"
        className="ml-1.5 inline-grid h-5 min-w-5 place-items-center rounded-full border-2 border-ink bg-danger px-1 align-middle text-[0.7rem] leading-none font-extrabold"
      >
        {unread > 99 ? '99+' : unread}
      </span>
      <span className="sr-only"> ({t('unreadCount', { count: unread })})</span>
    </>
  )
}
