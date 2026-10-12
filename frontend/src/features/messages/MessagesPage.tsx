import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { MessagesSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { PageHeading } from '@/components/ui/PageHeading'
import { Pagination } from '@/components/ui/Pagination'
import { buttonStyles } from '@/components/ui/button-styles'
import { useAuth } from '@/features/auth/auth-context'
import { CompanyLogo } from '@/features/companies/CompanyLogo'
import { cn } from '@/lib/cn'
import { formatTimeAgo } from '@/lib/format'
import { messageKeys, messagesApi, type ConversationSummary } from './api'

const POLL_INTERVAL = 30_000

// Conversations of the user, the most recently active first.
export function MessagesPage() {
  const { t } = useTranslation('messages')
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const isStudent = user?.role === 'STUDENT'

  const conversations = useQuery({
    queryKey: messageKeys.list(page),
    queryFn: () => messagesApi.list(page),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_INTERVAL,
  })
  const data = conversations.data

  return (
    <>
      <PageHeading title={t('title')} description={t('description')} />

      {conversations.isPending && <FullPageLoader fullPage={false} />}
      {conversations.isError && (
        <LoadError onRetry={() => void conversations.refetch()} />
      )}
      {data?.items.length === 0 && (
        <EmptyState
          icon={MessagesSquare}
          title={t('emptyTitle')}
          description={isStudent ? t('emptyStudent') : t('emptyEmployer')}
          action={
            <Link
              to={isStudent ? '/student/applications' : '/employer/offers'}
              className={buttonStyles()}
            >
              {isStudent ? t('goToApplications') : t('goToOffers')}
            </Link>
          }
        />
      )}
      {data && data.items.length > 0 && (
        <div className="space-y-6">
          <ul className="overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-hard">
            {data.items.map((conversation) => (
              <ConversationItem
                key={conversation.applicationId}
                conversation={conversation}
              />
            ))}
          </ul>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(next) =>
              setSearchParams(next > 1 ? { page: String(next) } : {})
            }
          />
        </div>
      )}
    </>
  )
}

function ConversationItem({
  conversation,
}: {
  conversation: ConversationSummary
}) {
  const { t } = useTranslation('messages')
  const { counterpart, lastMessage, unreadCount } = conversation
  const unread = unreadCount > 0

  return (
    <li className="border-b-2 border-ink/10 last:border-b-0">
      <Link
        to={`/messages/${conversation.applicationId}`}
        className={cn(
          'flex items-center gap-4 px-5 py-4',
          'focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ink',
          unread ? 'bg-accent-soft hover:bg-accent' : 'hover:bg-paper',
        )}
      >
        <CompanyLogo company={counterpart} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span
              className={cn(
                'truncate',
                unread ? 'font-extrabold' : 'font-semibold',
              )}
            >
              {counterpart.name}
            </span>
            <span className="shrink-0 text-xs text-muted">
              {formatTimeAgo(lastMessage.createdAt)}
            </span>
          </span>
          <span className="block truncate text-sm text-muted">
            {conversation.offer.title}
          </span>
          <span className="mt-1 flex items-center gap-3">
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm',
                unread && 'font-semibold',
              )}
            >
              {lastMessage.mine && `${t('you')}: `}
              {lastMessage.body}
            </span>
            {unread && (
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full border-2 border-ink bg-danger px-1 text-[0.7rem] leading-none font-extrabold">
                {unreadCount}
                <span className="sr-only">
                  {' '}
                  {t('unreadCount', { count: unreadCount })}
                </span>
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}
