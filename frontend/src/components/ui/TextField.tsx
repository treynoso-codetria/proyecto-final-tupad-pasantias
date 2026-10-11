import type { ComponentProps, ReactNode } from 'react'
import { fieldControlStyles, useField } from './field'
import { FieldShell } from './FieldShell'

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
        <input
          {...field.controlProps}
          className={fieldControlStyles(
            Boolean(error),
            trailing !== undefined ? 'pr-12' : undefined,
          )}
          {...props}
        />
        {trailing !== undefined && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {trailing}
          </div>
        )}
      </div>
    </FieldShell>
  )
}
