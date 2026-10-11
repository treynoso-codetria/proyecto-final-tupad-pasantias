import { apiFetch } from '@/api/client'
import type { CatalogItem } from '@/features/catalog/api'

// Mirrors the backend contracts of /api/offers (see Swagger at /api/docs).

export const OFFER_TYPES = ['INTERNSHIP', 'JOB'] as const
export const WORK_MODALITIES = ['ON_SITE', 'REMOTE', 'HYBRID'] as const
export const WORKLOADS = ['FULL_TIME', 'PART_TIME'] as const
export const OFFER_STATUSES = ['OPEN', 'CLOSED', 'REMOVED'] as const
export const OFFER_SORTS = ['newest', 'deadline'] as const
export const MAX_OFFER_TAGS = 10

export type OfferType = (typeof OFFER_TYPES)[number]
export type WorkModality = (typeof WORK_MODALITIES)[number]
export type Workload = (typeof WORKLOADS)[number]
export type OfferStatus = (typeof OFFER_STATUSES)[number]
export type OfferSort = (typeof OFFER_SORTS)[number]

export type OfferSummary = {
  id: string
  title: string
  type: OfferType
  modality: WorkModality
  workload: Workload
  province: string | null
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  status: OfferStatus
  publishedAt: string
  // YYYY-MM-DD: last day to apply
  deadline: string | null
  company: { id: string; name: string; logoUrl: string | null }
  category: CatalogItem
  tags: CatalogItem[]
}

export type OfferDetail = OfferSummary & {
  description: string
  requirements: string | null
  vacancies: number
  closedAt: string | null
  updatedAt: string
  isAcceptingApplications: boolean
  // Only sent to the offer's company and to administrators.
  removalReason: string | null
  company: OfferSummary['company'] & {
    industry: string | null
    description: string | null
    website: string | null
    province: string | null
    city: string | null
  }
}

export type MyOffer = OfferSummary & {
  applicationsCount: number
  pendingApplicationsCount: number
  closedAt: string | null
  removalReason: string | null
}

export type OfferPage = {
  items: OfferSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type OfferFilters = {
  q?: string
  category?: string
  tags?: string[]
  type?: OfferType
  modality?: WorkModality
  workload?: Workload
  province?: string
  sort?: OfferSort
  page?: number
}

export type OfferInput = {
  title: string
  description: string
  requirements: string | null
  type: OfferType
  modality: WorkModality
  workload: Workload
  province: string | null
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  vacancies: number
  deadline: string | null
  categoryId: string
  tagIds: string[]
}

export const PAGE_SIZE = 12

export const offerKeys = {
  all: ['offers'] as const,
  list: (filters: OfferFilters) => ['offers', 'list', filters] as const,
  detail: (id: string) => ['offers', 'detail', id] as const,
  mine: (status: OfferStatus | undefined) =>
    ['offers', 'mine', status ?? 'all'] as const,
}

function toQueryString(filters: OfferFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
    } else if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }
  params.set('limit', String(PAGE_SIZE))
  return params.toString()
}

export const offersApi = {
  list: (filters: OfferFilters) =>
    apiFetch<OfferPage>(`/offers?${toQueryString(filters)}`),

  get: (id: string) => apiFetch<OfferDetail>(`/offers/${id}`),

  mine: (status: OfferStatus | undefined) =>
    apiFetch<MyOffer[]>(`/offers/mine${status ? `?status=${status}` : ''}`),

  create: (input: OfferInput) =>
    apiFetch<OfferDetail>('/offers', { method: 'POST', body: input }),

  // Only the fields sent change.
  update: (id: string, input: Partial<OfferInput>) =>
    apiFetch<OfferDetail>(`/offers/${id}`, { method: 'PATCH', body: input }),

  close: (id: string) =>
    apiFetch<OfferDetail>(`/offers/${id}/close`, { method: 'POST' }),
}
