import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-16 -rotate-3 place-items-center rounded-2xl border-2 border-ink bg-accent shadow-hard">
        <Icon className="size-8" aria-hidden="true" />
      </span>
      <h2 className="mt-6 font-display text-2xl font-extrabold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-muted">{description}</p>
    </Card>
  )
}
