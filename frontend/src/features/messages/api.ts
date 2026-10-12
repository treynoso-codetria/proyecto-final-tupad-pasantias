import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import type { ApplicationStatus } from '@/features/applications/api'

export type Message = {
  id: string
  body: string
  // Sent by the signed-in user.
  mine: boolean
  // When the recipient read it.
  readAt: string | null
  createdAt: string
}

// The other participant: the company for a student, the student for a company.
export type Counterpart = {
  name: string
  companyId: string | null
  logoUrl: string | null
  studentId: string | null
}

type ConversationBase = {
  // A conversation is identified by its application.
  applicationId: string
  applicationStatus: ApplicationStatus
  offer: { id: string; title: string }
  counterpart: Counterpart
  // False once the application was withdrawn or the offer removed.
  canSend: boolean
  unreadCount: number
}

export type ConversationSummary = ConversationBase & {
  lastMessage: { body: string; mine: boolean; createdAt: string }
}

export type Conversation = ConversationBase & {
  coverLetter: string | null
  appliedAt: string
  // Oldest first.
  messages: Message[]
}

export type ConversationPage = {
  items: ConversationSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Same limit as the API.
export const MESSAGE_MAX = 2000
export const PAGE_SIZE = 20
// There is no push: open screens ask for news every so often.
export const THREAD_POLL_INTERVAL = 10_000
const POLL_INTERVAL = 30_000

export const messageKeys = {
  all: ['messages'] as const,
  unreadCount: ['messages', 'unread-count'] as const,
  list: (page: number) => ['messages', 'list', page] as const,
  conversation: (id: string) => ['messages', 'conversation', id] as const,
}

export const messagesApi = {
  list: (page: number) =>
    apiFetch<ConversationPage>(
      `/conversations?page=${page}&limit=${PAGE_SIZE}`,
    ),

  unreadCount: () => apiFetch<{ count: number }>('/conversations/unread-count'),

  get: (applicationId: string) =>
    apiFetch<Conversation>(`/conversations/${applicationId}`),

  send: (applicationId: string, body: string) =>
    apiFetch<Message>(`/conversations/${applicationId}/messages`, {
      method: 'POST',
      body: { body },
    }),

  markRead: (applicationId: string) =>
    apiFetch<void>(`/conversations/${applicationId}/read`, { method: 'POST' }),
}

// Unread messages, for the navigation bar.
export function useUnreadMessages() {
  return useQuery({
    queryKey: messageKeys.unreadCount,
    queryFn: messagesApi.unreadCount,
    refetchInterval: POLL_INTERVAL,
    select: (data) => data.count,
  })
}
