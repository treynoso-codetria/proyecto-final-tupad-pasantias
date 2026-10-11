import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

// Frame of every form control (TextField, SelectField, TextAreaField): the
// label above, the control, and the error or hint below.

type FieldShellProps = {
  label: string
  controlId: string
  messageId: string
  message?: string
  isError: boolean
  className?: string
  children: ReactNode
}

export function FieldShell({
  label,
  controlId,
  messageId,
  message,
  isError,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={controlId} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      {children}
      {message && (
        <p
          id={messageId}
          className={cn(
            'mt-1.5 flex items-start gap-1.5 text-sm',
            isError ? 'font-semibold' : 'text-muted',
          )}
        >
          {isError && (
            <CircleAlert
              className="mt-0.5 size-4 shrink-0 fill-danger"
              aria-hidden="true"
            />
          )}
          {message}
        </p>
      )}
    </div>
  )
}
