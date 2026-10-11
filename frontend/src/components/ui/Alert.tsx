import { CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type AlertVariant = 'error' | 'success' | 'info'

const variants: Record<
  AlertVariant,
  { icon: LucideIcon; box: string; iconFill: string }
> = {
  error: { icon: TriangleAlert, box: 'bg-danger-soft', iconFill: 'fill-danger' },
  success: {
    icon: CircleCheck,
    box: 'bg-employer-soft',
    iconFill: 'fill-employer',
  },
  info: { icon: Info, box: 'bg-brand-soft', iconFill: 'fill-brand' },
}

type AlertProps = {
  variant?: AlertVariant
  children: ReactNode
}

// Message about a whole form or page. Errors use `role="alert"` so screen
// readers announce them at once; the others use the calmer "status".
export function Alert({ variant = 'error', children }: AlertProps) {
  const { icon: Icon, box, iconFill } = variants[variant]

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl border-2 border-ink px-4 py-3 text-sm font-semibold',
        box,
      )}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', iconFill)} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}
