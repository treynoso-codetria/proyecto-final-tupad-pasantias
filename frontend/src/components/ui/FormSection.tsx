import { useId, type ReactNode } from 'react'
import { Card } from './Card'

type FormSectionProps = {
  title: string
  children: ReactNode
}

// A titled group of fields inside a longer form. Fields are laid out in two
// columns on wide screens; a field spans both with `className="sm:col-span-2"`.
export function FormSection({ title, children }: FormSectionProps) {
  const titleId = useId()

  return (
    <Card className="p-6 sm:p-8">
      <fieldset aria-labelledby={titleId}>
        <h2
          id={titleId}
          className="font-display text-2xl font-extrabold tracking-tight"
        >
          {title}
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
      </fieldset>
    </Card>
  )
}
