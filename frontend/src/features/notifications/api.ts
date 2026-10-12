import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import type { Language } from '@/i18n'

export type NotificationType =
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_STATUS_CHANGED'
  | 'NEW_MESSAGE'
  | 'OFFER_REMOVED'
  | 'ACCOUNT_STATUS_CHANGED'

// title and body come translated from the API (Accept-Language).
export type Notification = {
  id: string
  type: NotificationType
  title: string
  body: string | null
  // Frontend path the notification leads to.
  link: string | null
  readAt: string | null
  createdAt: string
}

export type NotificationPage = {
  items: Notification[]
  total: number
  unreadCount: number
  page: number
  limit: number
  totalPages: number
}

export const PAGE_SIZE = 20
const POLL_INTERVAL = 30_000

export const notificationKeys = {
  all: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  // The language is part of the key: the API sends the texts translated.
  list: (page: number, unread: boolean, language: Language) =>
    ['notifications', 'list', { page, unread, language }] as const,
}

export const notificationsApi = {
  list: (page: number, unread: boolean) =>
    apiFetch<NotificationPage>(
      `/notifications?page=${page}&limit=${PAGE_SIZE}${unread ? '&unread=true' : ''}`,
    ),

  unreadCount: () =>
    apiFetch<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiFetch<void>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiFetch<void>('/notifications/read-all', { method: 'POST' }),
}

// Unread count for the navigation bar. Polled while the page is visible (no
// push notifications: they are out of scope).
export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    enabled,
    refetchInterval: POLL_INTERVAL,
    select: (data) => data.count,
  })
}
