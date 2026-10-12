import type { ReactNode } from 'react'

type PageHeadingProps = {
  title: string
  description: string
  // E.g. a button for the whole page, aligned to the right of the title.
  action?: ReactNode
}

export function PageHeading({ title, description, action }: PageHeadingProps) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
