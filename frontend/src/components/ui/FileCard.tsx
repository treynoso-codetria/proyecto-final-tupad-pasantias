import { useId, type ReactNode } from 'react'
import { Alert } from './Alert'
import { Card } from './Card'

type FileCardProps = {
  title: string
  hint: string
  // The current file (or a note that there is none).
  preview: ReactNode
  // Upload / replace / delete buttons.
  actions: ReactNode
  // Already translated outcome of the last action.
  error?: string
  success?: string
}

// A file attached to a profile (the CV, a logo), managed apart from the
// profile form: each upload or deletion is saved at once.
export function FileCard({
  title,
  hint,
  preview,
  actions,
  error,
  success,
}: FileCardProps) {
  const titleId = useId()

  return (
    <Card className="p-6 sm:p-8">
      <section aria-labelledby={titleId}>
        <h2
          id={titleId}
          className="font-display text-2xl font-extrabold tracking-tight"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{hint}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">{preview}</div>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
        {(error || success) && (
          <div className="mt-5">
            {error ? (
              <Alert>{error}</Alert>
            ) : (
              <Alert variant="success">{success}</Alert>
            )}
          </div>
        )}
      </section>
    </Card>
  )
}
