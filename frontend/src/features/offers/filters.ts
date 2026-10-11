import {
  OFFER_SORTS,
  OFFER_TYPES,
  WORK_MODALITIES,
  WORKLOADS,
  type OfferFilters,
} from './api'
import { PROVINCES } from '@/lib/provinces'

// The search lives in the URL (?q=react&modality=REMOTE&page=2), so a search
// can be shared and the back button restores it. Unknown values are dropped
// instead of being sent to the API, which would reject them.

const oneOf = <T extends string>(
  options: readonly T[],
  value: string | null,
): T | undefined =>
  value !== null && options.includes(value as T) ? (value as T) : undefined

export function parseFilters(params: URLSearchParams): OfferFilters {
  const page = Number(params.get('page'))
  return {
    q: params.get('q')?.trim() || undefined,
    category: params.get('category') || undefined,
    tags: params.getAll('tags').filter(Boolean),
    type: oneOf(OFFER_TYPES, params.get('type')),
    modality: oneOf(WORK_MODALITIES, params.get('modality')),
    workload: oneOf(WORKLOADS, params.get('workload')),
    province: oneOf(PROVINCES, params.get('province')),
    sort: oneOf(OFFER_SORTS, params.get('sort')),
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}

export function toSearchParams(filters: OfferFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
    } else if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }
  return params
}

// Filters that narrow the results (sorting and paging do not).
export function hasActiveFilters(filters: OfferFilters): boolean {
  const { sort: _sort, page: _page, tags, ...rest } = filters
  return Boolean(tags?.length) || Object.values(rest).some(Boolean)
}
