import { useId } from 'react'
import { cn } from '@/lib/cn'

// Helpers shared by the form controls (TextField, SelectField, TextAreaField).

type FieldOptions = { id?: string; error?: string; hint?: string }

// Ids and ARIA attributes that link a control with its label and message.
export function useField({ id, error, hint }: FieldOptions) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const messageId = `${controlId}-message`
  const message = error ?? hint

  return {
    messageId,
    message,
    controlProps: {
      id: controlId,
      'aria-invalid': error ? (true as const) : undefined,
      'aria-describedby': message ? messageId : undefined,
    },
  }
}

// Look shared by inputs, selects and textareas.
export function fieldControlStyles(hasError: boolean, className?: string) {
  return cn(
    'w-full rounded-xl border-2 border-ink px-4 py-3 text-base',
    'placeholder:text-muted/70 transition-[box-shadow,background-color] duration-100',
    'focus:bg-accent-soft focus:shadow-hard focus:outline-none',
    'motion-reduce:transition-none',
    hasError ? 'bg-danger-soft' : 'bg-surface',
    className,
  )
}
