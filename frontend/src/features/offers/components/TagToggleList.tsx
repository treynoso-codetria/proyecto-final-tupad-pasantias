import { Check } from 'lucide-react'
import type { CatalogItem } from '@/features/catalog/api'
import { cn } from '@/lib/cn'

type TagToggleListProps = {
  tags: CatalogItem[]
  selected: string[]
  onToggle: (value: string) => void
  // Which tag property identifies a selection: ids in forms, slugs in filters.
  valueOf: (tag: CatalogItem) => string
  // When reached, the tags not selected are disabled.
  max?: number
  labelledBy: string
}

// Tags as toggle buttons: quicker than a multi-select for a short catalog,
// and each one announces whether it is pressed.
export function TagToggleList({
  tags,
  selected,
  onToggle,
  valueOf,
  max,
  labelledBy,
}: TagToggleListProps) {
  const full = max !== undefined && selected.length >= max

  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const value = valueOf(tag)
        const pressed = selected.includes(value)
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={pressed}
            disabled={!pressed && full}
            onClick={() => onToggle(value)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1 rounded-full border-2 border-ink px-3 py-1 text-sm font-bold',
              'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
              'disabled:cursor-not-allowed disabled:opacity-40',
              pressed
                ? 'bg-accent shadow-hard-sm'
                : 'bg-surface not-disabled:hover:bg-accent-soft',
            )}
          >
            {pressed && <Check className="size-3.5" aria-hidden="true" />}
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}
