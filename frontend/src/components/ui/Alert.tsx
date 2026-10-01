import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

// Form-level error message. `role="alert"` makes screen readers announce it.
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border-2 border-ink bg-danger-soft px-4 py-3 text-sm font-semibold"
    >
      <TriangleAlert
        className="mt-0.5 size-5 shrink-0 fill-danger"
        aria-hidden="true"
      />
      <p>{children}</p>
    </div>
  )
}
