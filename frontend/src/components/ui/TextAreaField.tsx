import type { ComponentProps } from 'react'
import { fieldControlStyles, useField } from './field'
import { FieldShell } from './FieldShell'

type TextAreaFieldProps = ComponentProps<'textarea'> & {
  label: string
  error?: string
  hint?: string
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  id,
  rows = 5,
  ...props
}: TextAreaFieldProps) {
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
      <textarea
        {...field.controlProps}
        rows={rows}
        className={fieldControlStyles(Boolean(error), 'block resize-y')}
        {...props}
      />
    </FieldShell>
  )
}
