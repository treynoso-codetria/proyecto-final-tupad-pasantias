import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'

// A category or a tag. Their names are data managed by administrators, so
// they are shown as stored, not translated.
export type CatalogItem = {
  id: string
  name: string
  slug: string
}

const ONE_HOUR = 60 * 60 * 1000

// The catalog changes rarely: it is loaded once and kept for an hour.
export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: () => apiFetch<CatalogItem[]>('/categories'),
    staleTime: ONE_HOUR,
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['catalog', 'tags'],
    queryFn: () => apiFetch<CatalogItem[]>('/tags'),
    staleTime: ONE_HOUR,
  })
}
