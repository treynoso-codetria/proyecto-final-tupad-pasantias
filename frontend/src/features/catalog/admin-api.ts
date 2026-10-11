import { apiFetch } from '@/api/client'
import type { CatalogItem } from './api'

export type AdminCategory = CatalogItem & {
  isActive: boolean
  offersCount: number
  createdAt: string
  updatedAt: string
}

export type AdminTag = CatalogItem & {
  offersCount: number
  createdAt: string
}

// Under the ['catalog'] prefix: invalidating it after a change also refreshes
// the public lists used by the offer filters and forms.
export const adminCatalogKeys = {
  all: ['catalog'] as const,
  categories: ['catalog', 'admin', 'categories'] as const,
  tags: ['catalog', 'admin', 'tags'] as const,
}

export const adminCatalogApi = {
  listCategories: () => apiFetch<AdminCategory[]>('/admin/categories'),

  createCategory: (name: string) =>
    apiFetch<AdminCategory>('/admin/categories', {
      method: 'POST',
      body: { name },
    }),

  updateCategory: (
    id: string,
    changes: { name?: string; isActive?: boolean },
  ) =>
    apiFetch<AdminCategory>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: changes,
    }),

  listTags: () => apiFetch<AdminTag[]>('/admin/tags'),

  createTag: (name: string) =>
    apiFetch<AdminTag>('/admin/tags', { method: 'POST', body: { name } }),

  renameTag: (id: string, name: string) =>
    apiFetch<AdminTag>(`/admin/tags/${id}`, {
      method: 'PATCH',
      body: { name },
    }),

  deleteTag: (id: string) =>
    apiFetch<void>(`/admin/tags/${id}`, { method: 'DELETE' }),
}
