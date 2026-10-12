import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { fieldControlStyles } from '@/components/ui/field'
import { LoadError } from '@/components/ui/LoadError'
import { NotFoundNotice } from '@/components/ui/NotFoundNotice'
import { ApplicationStatusBadge } from '@/features/applications/components/ApplicationStatusBadge'
import { getApiErrorKey } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { CompanyLogo } from '@/features/companies/CompanyLogo'
import { notificationKeys } from '@/features/notifications/api'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import {
  MESSAGE_MAX,
  THREAD_POLL_INTERVAL,
  messageKeys,
  messagesApi,
  type Conversation,
} from './api'

export function ConversationPage() {
  const { t } = useTranslation('messages')
  const { applicationId = '' } = useParams()
  const conversation = useQuery({
    queryKey: messageKeys.conversation(applicationId),
    queryFn: () => messagesApi.get(applicationId),
    refetchInterval: THREAD_POLL_INTERVAL,
  })

  if (conversation.isPending) {
    return <FullPageLoader fullPage={false} />
  }
  if (conversation.isError) {
    const { error } = conversation
    // Someone else's conversation is reported as missing too.
    if (error instanceof ApiError && [400, 403, 404].includes(error.status)) {
      return (
        <NotFoundNotice
          message={t('notFound')}
          backTo="/messages"
          backLabel={t('back')}
        />
      )
    }
    return <LoadError onRetry={() => void conversation.refetch()} />
  }
  return <Thread conversation={conversation.data} />
}

function Thread({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation('messages')
  const queryClient = useQueryClient()
  const { applicationId, counterpart, offer, unreadCount } = conversation

  // Opening the conversation (or receiving a message while it is open)
  // marks the received messages as read.
  const markRead = useMutation({
    mutationFn: () => messagesApi.markRead(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.all })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
  const { mutate: markAsRead, isPending: marking } = markRead
  useEffect(() => {
    if (unreadCount > 0 && !marking) {
      markAsRead()
    }
  }, [unreadCount, marking, markAsRead])

  // Follows the newest message, like any chat.
  const bottom = useRef<HTMLDivElement>(null)
  const count = conversation.messages.length
  useLayoutEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [count])

  const profileLink = counterpart.companyId
    ? `/companies/${counterpart.companyId}`
    : `/employer/students/${counterpart.studentId}`

  return (
    <>
      <BackLink to="/messages" label={t('back')} />
      <Card className="flex items-center gap-4 p-5 sm:p-6">
        <CompanyLogo company={counterpart} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl leading-tight font-extrabold tracking-tight">
            <Link
              to={profileLink}
              className="underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {counterpart.name}
            </Link>
          </h1>
          <p className="truncate text-sm text-muted">
            {t('about')}{' '}
            <Link
              to={`/offers/${offer.id}`}
              className="font-semibold text-ink underline decoration-2 underline-offset-4 hover:bg-accent"
            >
              {offer.title}
            </Link>
          </p>
          <div className="mt-2">
            <ApplicationStatusBadge status={conversation.applicationStatus} />
          </div>
        </div>
      </Card>

      <section aria-label={t('threadLabel')} className="mt-6 space-y-3">
        <ol className="space-y-3">
          <li>
            <Bubble
              mine={counterpart.companyId !== null}
              label={t('coverLetter')}
              body={conversation.coverLetter ?? t('noCoverLetter')}
              muted={conversation.coverLetter === null}
              time={conversation.appliedAt}
            />
          </li>
          {conversation.messages.map((message, index) => {
            const lastMine =
              message.mine &&
              !conversation.messages.slice(index + 1).some((next) => next.mine)
            return (
              <li key={message.id}>
                <Bubble
                  mine={message.mine}
                  body={message.body}
                  time={message.createdAt}
                  seen={lastMine && message.readAt !== null}
                />
              </li>
            )
          })}
        </ol>
        <div ref={bottom} />
      </section>

      <div className="mt-6">
        {conversation.canSend ? (
          <Composer applicationId={applicationId} />
        ) : (
          <Alert variant="info">{t('closed')}</Alert>
        )}
      </div>
    </>
  )
}

function Bubble({
  mine,
  body,
  time,
  label,
  muted = false,
  seen = false,
}: {
  mine: boolean
  body: string
  time: string
  // Small title above the text (the cover letter).
  label?: string
  muted?: boolean
  seen?: boolean
}) {
  const { t } = useTranslation('messages')

  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl border-2 border-ink px-4 py-3 shadow-hard-sm sm:max-w-[70%]',
          mine ? 'rounded-br-md bg-accent' : 'rounded-bl-md bg-surface',
        )}
      >
        <p className="sr-only">{mine ? t('you') : t('them')}:</p>
        {label && (
          <p className="text-xs font-bold tracking-wide uppercase opacity-70">
            {label}
          </p>
        )}
        <p
          className={cn(
            'break-words whitespace-pre-line',
            muted && 'text-muted italic',
          )}
        >
          {body}
        </p>
        <p className="mt-1 text-right text-xs opacity-70">
          <time dateTime={time}>{formatDateTime(time)}</time>
          {seen && ` · ${t('seen')}`}
        </p>
      </div>
    </div>
  )
}

function Composer({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation('messages')
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const body = text.trim()

  const send = useMutation({
    mutationFn: () => messagesApi.send(applicationId, body),
    onSuccess: async () => {
      setText('')
      await queryClient.invalidateQueries({ queryKey: messageKeys.all })
    },
  })
  const submit = () => {
    if (body && body.length <= MESSAGE_MAX && !send.isPending) {
      send.mutate()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="space-y-3"
    >
      {send.isError && <Alert>{errorText(getApiErrorKey(send.error))}</Alert>}
      <label htmlFor="message" className="sr-only">
        {t('write')}
      </label>
      <div className="flex items-end gap-3">
        <textarea
          id="message"
          rows={2}
          value={text}
          maxLength={MESSAGE_MAX}
          placeholder={t('placeholder')}
          onChange={(event) => setText(event.target.value)}
          // Enter sends; Shift+Enter starts a new line.
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              submit()
            }
          }}
          className={fieldControlStyles(false, 'min-h-12 flex-1 resize-y')}
        />
        <Button type="submit" loading={send.isPending} disabled={!body}>
          {!send.isPending && <Send className="size-5" aria-hidden="true" />}
          <span className="sr-only sm:not-sr-only">{t('send')}</span>
        </Button>
      </div>
      <p className="text-xs text-muted">{t('hint')}</p>
    </form>
  )
}
