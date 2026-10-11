import type { CatalogItem } from '@/features/catalog/api'

export function TagList({ tags }: { tags: CatalogItem[] }) {
  if (tags.length === 0) {
    return null
  }
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-muted">
      {tags.map((tag) => (
        <li key={tag.id}>#{tag.name}</li>
      ))}
    </ul>
  )
}
