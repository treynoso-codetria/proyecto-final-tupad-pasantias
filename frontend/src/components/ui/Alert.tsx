import { CircleCheck, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type AlertProps = {
  variant?: 'error' | 'success'
  children: ReactNode
}

// Message about a whole form or page. Errors use `role="alert"` so screen
// readers announce them at once; success messages use the calmer "status".
export function Alert({ variant = 'error', children }: AlertProps) {
  const isError = variant === 'error'
  const Icon = isError ? TriangleAlert : CircleCheck

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl border-2 border-ink px-4 py-3 text-sm font-semibold',
        isError ? 'bg-danger-soft' : 'bg-employer-soft',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-5 shrink-0',
          isError ? 'fill-danger' : 'fill-employer',
        )}
        aria-hidden="true"
      />
      <p>{children}</p>
    </div>
  )
}
