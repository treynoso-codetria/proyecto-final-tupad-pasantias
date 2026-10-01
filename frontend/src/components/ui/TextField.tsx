import { CircleAlert } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

// `ref` is part of ComponentProps<'input'> and is forwarded to the <input>,
// which is what React Hook Form's register() needs.
export type TextFieldProps = ComponentProps<'input'> & {
  label: string
  error?: string
  hint?: string
  // Rendered inside the input's right edge (e.g. the show-password toggle).
  trailing?: ReactNode
}

export function TextField({
  label,
  error,
  hint,
  trailing,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  const message = error ?? hint

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'w-full rounded-xl border-2 border-ink px-4 py-3 text-base',
            'placeholder:text-muted/70 transition-[box-shadow,background-color] duration-100',
            'focus:bg-accent-soft focus:shadow-hard focus:outline-none',
            'motion-reduce:transition-none',
            error ? 'bg-danger-soft' : 'bg-surface',
            trailing !== undefined && 'pr-12',
          )}
          {...props}
        />
        {trailing !== undefined && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {message && (
        <p
          id={messageId}
          className={cn(
            'mt-1.5 flex items-start gap-1.5 text-sm',
            error ? 'font-semibold' : 'text-muted',
          )}
        >
          {error && (
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
