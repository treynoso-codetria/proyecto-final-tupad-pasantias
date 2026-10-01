import { useTranslation } from 'react-i18next'
import type { Role } from '@/features/auth/types'

type HomeHeadingProps = {
  role: Role
  title: string
  description: string
}

export function HomeHeading({ role, title, description }: HomeHeadingProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-10">
      {/* The top bar hides the role badge on small screens; show it here. */}
      <p className="mb-4 inline-block rounded-full border-2 border-ink bg-accent px-3 py-1 text-xs font-bold tracking-wide uppercase md:hidden">
        {t(`roles.${role}`)}
      </p>
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight text-balance sm:text-6xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{description}</p>
    </div>
  )
}
