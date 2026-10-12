import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'

type LogoProps = {
  // Where the logo leads; the home of the signed-in user by default.
  to?: string
  // Only the mark on small screens, to leave room for other controls (the
  // name stays for screen readers).
  compact?: boolean
}

export function Logo({ to = '/', compact = false }: LogoProps) {
  const { t } = useTranslation()

  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 -rotate-6 place-items-center rounded-lg border-2 border-ink bg-brand font-display text-xl font-extrabold shadow-hard-sm"
      >
        P
      </span>
      <span
        className={cn(
          'font-display text-lg leading-none font-extrabold tracking-tight',
          compact && 'sr-only sm:not-sr-only',
        )}
      >
        {t('appName')}
      </span>
    </Link>
  )
}
