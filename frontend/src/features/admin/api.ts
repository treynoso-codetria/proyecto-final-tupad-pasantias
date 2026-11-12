import { apiFetch } from '@/api/client'
import type { CatalogItem } from '@/features/catalog/api'
import type { OfferStatus } from '@/features/offers/api'

// Mirrors the backend contracts of /api/admin (M11, see Swagger at /api/docs).

export const MANAGED_ROLES = ['STUDENT', 'EMPLOYER'] as const
export type ManagedRole = (typeof MANAGED_ROLES)[number]

export const ACCOUNT_STATUSES = ['active', 'inactive'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export type AdminActionType =
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'OFFER_REMOVED'
  | 'OFFER_RESTORED'

// Column limit of the reasons (admin_actions.reason is TEXT; the API caps it).
export const REASON_MAX = 1000

export type AdminStats = {
  students: { total: number; active: number }
  companies: { total: number; active: number }
  offers: { open: number; closed: number; removed: number }
  applications: {
    total: number
    pending: number
    accepted: number
    rejected: number
  }
}

export type AdminUser = {
  id: string
  email: string
  role: ManagedRole
  // Student's full name or company name.
  name: string
  studentId: string | null
  companyId: string | null
  isActive: boolean
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
}

export type AdminOffer = {
  id: string
  title: string
  status: OfferStatus
  company: { id: string; name: string; isActive: boolean }
  category: CatalogItem
  applicationsCount: number
  publishedAt: string
  closedAt: string | null
  removedAt: string | null
  removalReason: string | null
}

export type AdminAction = {
  id: string
  action: AdminActionType
  reason: string | null
  createdAt: string
  admin: { id: string; email: string }
  targetUser: { id: string; email: string; name: string } | null
  targetOffer: { id: string; title: string } | null
}

export type Page<Item> = {
  items: Item[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type UserFilters = {
  q?: string
  role?: ManagedRole
  status?: AccountStatus
  page: number
}

export type OfferFilters = {
  q?: string
  status?: OfferStatus
  page: number
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

// Every admin change invalidates ['admin'] (metrics, lists and log), and the
// offers' own keys, since moderation changes what the offer pages show.
export const adminKeys = {
  all: ['admin'] as const,
  stats: ['admin', 'stats'] as const,
  users: (filters: UserFilters) => ['admin', 'users', filters] as const,
  offers: (filters: OfferFilters) => ['admin', 'offers', filters] as const,
  actions: (page: number, limit: number) =>
    ['admin', 'actions', page, limit] as const,
}

export const adminApi = {
  stats: () => apiFetch<AdminStats>('/admin/stats'),

  users: ({ q, role, status, page }: UserFilters) =>
    apiFetch<Page<AdminUser>>(`/admin/users${query({ q, role, status, page })}`),

  setUserStatus: (id: string, isActive: boolean, reason: string | null) =>
    apiFetch<AdminUser>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: { isActive, reason },
    }),

  offers: ({ q, status, page }: OfferFilters) =>
    apiFetch<Page<AdminOffer>>(`/admin/offers${query({ q, status, page })}`),

  removeOffer: (id: string, reason: string) =>
    apiFetch<AdminOffer>(`/admin/offers/${id}/remove`, {
      method: 'POST',
      body: { reason },
    }),

  restoreOffer: (id: string) =>
    apiFetch<AdminOffer>(`/admin/offers/${id}/restore`, {
      method: 'POST',
      body: {},
    }),

  actions: (page: number, limit: number) =>
    apiFetch<Page<AdminAction>>(`/admin/actions${query({ page, limit })}`),
}
