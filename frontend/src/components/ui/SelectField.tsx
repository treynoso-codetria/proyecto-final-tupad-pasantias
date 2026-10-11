import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { fieldControlStyles, useField } from './field'
import { FieldShell } from './FieldShell'

type SelectFieldProps = ComponentProps<'select'> & {
  label: string
  error?: string
  hint?: string
}

// A native <select>: keyboard, screen reader and mobile pickers work without
// extra code. Options are passed as <option> children.
export function SelectField({
  label,
  error,
  hint,
  className,
  id,
  children,
  ...props
}: SelectFieldProps) {
  const field = useField({ id, error, hint })

  return (
    <FieldShell
      label={label}
      controlId={field.controlProps.id}
      messageId={field.messageId}
      message={field.message}
      isError={Boolean(error)}
      className={className}
    >
      <div className="relative">
        <select
          {...field.controlProps}
          className={fieldControlStyles(
            Boolean(error),
            'cursor-pointer appearance-none pr-12',
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2"
          aria-hidden="true"
        />
      </div>
    </FieldShell>
  )
}
