import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { PageHeading } from '@/components/ui/PageHeading'
import { Pagination } from '@/components/ui/Pagination'
import { getCurrentLanguage } from '@/i18n'
import { cn } from '@/lib/cn'
import { formatTimeAgo } from '@/lib/format'
import { notificationKeys, notificationsApi, type Notification } from './api'

export function NotificationsPage() {
  const { t } = useTranslation('notifications')
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const unreadOnly = searchParams.get('show') === 'unread'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const notifications = useQuery({
    queryKey: notificationKeys.list(page, unreadOnly, getCurrentLanguage()),
    queryFn: () => notificationsApi.list(page, unreadOnly),
    placeholderData: keepPreviousData,
  })

  // Reading changes the lists and the counter in the navigation bar.
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: refresh,
  })
  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: refresh,
  })

  const setView = (changes: { unread?: boolean; page?: number }) => {
    const unread = changes.unread ?? unreadOnly
    const params: Record<string, string> = {}
    if (unread) params.show = 'unread'
    if (changes.page && changes.page > 1) params.page = String(changes.page)
    setSearchParams(params)
  }

  const data = notifications.data
  return (
    <>
      <PageHeading
        title={t('title')}
        description={t('description')}
        action={
          <Button
            variant="secondary"
            disabled={!data || data.unreadCount === 0}
            loading={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {t('markAll')}
          </Button>
        }
      />

      <div className="mb-6">
        <FilterTabs
          label={t('filterLabel')}
          value={unreadOnly ? 'unread' : undefined}
          onChange={(value) => setView({ unread: value === 'unread', page: 1 })}
          options={[
            { value: undefined, label: t('all') },
            {
              value: 'unread',
              label: data?.unreadCount
                ? `${t('unread')} (${data.unreadCount})`
                : t('unread'),
            },
          ]}
        />
      </div>

      {notifications.isPending && <FullPageLoader fullPage={false} />}
      {notifications.isError && (
        <LoadError onRetry={() => void notifications.refetch()} />
      )}
      {data?.items.length === 0 && (
        <EmptyState
          icon={BellOff}
          title={unreadOnly ? t('emptyUnread') : t('emptyTitle')}
          description={unreadOnly ? undefined : t('emptyDescription')}
        />
      )}
      {data && data.items.length > 0 && (
        <div className="space-y-6">
          <ul className="overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-hard">
            {data.items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() =>
                  !notification.readAt && markRead.mutate(notification.id)
                }
              />
            ))}
          </ul>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(next) => setView({ page: next })}
          />
        </div>
      )}
    </>
  )
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: () => void
}) {
  const { t } = useTranslation('notifications')
  const unread = notification.readAt === null

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-ink',
          unread ? 'bg-accent' : 'border-transparent',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className={cn('block', unread ? 'font-extrabold' : 'font-semibold')}>
          {notification.title}
          {unread && <span className="sr-only"> ({t('unreadMark')})</span>}
        </span>
        {notification.body && (
          <span className="mt-0.5 block text-sm text-muted">{notification.body}</span>
        )}
        <span className="mt-1 block text-xs text-muted">
          {formatTimeAgo(notification.createdAt)}
        </span>
      </span>
    </>
  )

  const classes = cn(
    'flex w-full gap-3 px-5 py-4 text-left',
    'focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ink',
    unread ? 'bg-accent-soft hover:bg-accent' : 'hover:bg-paper',
  )

  return (
    <li className="border-b-2 border-ink/10 last:border-b-0">
      {/* Opening a notification marks it as read. */}
      {notification.link ? (
        <Link to={notification.link} onClick={onRead} className={classes}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onRead} className={cn(classes, 'cursor-pointer')}>
          {content}
        </button>
      )}
    </li>
  )
}
