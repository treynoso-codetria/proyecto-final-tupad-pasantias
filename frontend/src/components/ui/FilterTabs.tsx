import { cn } from '@/lib/cn'

type FilterTabsProps<Value extends string> = {
  // Accessible name of the group, e.g. "Status".
  label: string
  options: { value: Value | undefined; label: string }[]
  value: Value | undefined
  onChange: (value: Value | undefined) => void
}

// A row of mutually exclusive filters (undefined = "all").
export function FilterTabs<Value extends string>({
  label,
  options,
  value,
  onChange,
}: FilterTabsProps<Value>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value ?? 'all'}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'cursor-pointer rounded-xl border-2 px-3 py-1.5 font-display text-sm font-bold',
            'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
            option.value === value
              ? 'border-ink bg-accent shadow-hard-sm'
              : 'border-ink/30 bg-surface hover:border-ink hover:bg-accent-soft',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
