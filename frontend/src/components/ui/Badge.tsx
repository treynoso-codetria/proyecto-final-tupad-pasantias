import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type BadgeTone = 'accent' | 'neutral' | 'success' | 'danger' | 'muted'

const tones: Record<BadgeTone, string> = {
  accent: 'border-ink bg-accent',
  neutral: 'border-ink bg-surface',
  success: 'border-ink bg-employer-soft',
  danger: 'border-ink bg-danger-soft',
  muted: 'border-ink/40 bg-paper text-muted',
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: BadgeTone
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}
