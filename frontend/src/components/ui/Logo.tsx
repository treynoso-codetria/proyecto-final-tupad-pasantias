import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export function Logo() {
  const { t } = useTranslation()

  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 -rotate-6 place-items-center rounded-lg border-2 border-ink bg-brand font-display text-xl font-extrabold shadow-hard-sm"
      >
        P
      </span>
      <span className="font-display text-lg leading-none font-extrabold tracking-tight">
        {t('appName')}
      </span>
    </Link>
  )
}
