type PageHeadingProps = {
  title: string
  description: string
}

export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <div className="mb-10">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{description}</p>
    </div>
  )
}
