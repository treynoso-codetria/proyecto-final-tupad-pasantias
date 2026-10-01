import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { buttonStyles } from '@/components/ui/button-styles'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <p className="inline-block -rotate-3 rounded-2xl border-2 border-ink bg-accent px-5 py-1 font-display text-7xl font-extrabold shadow-hard-lg">
          404
        </p>
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight">
          {t('notFound.title')}
        </h1>
        <p className="mt-2 text-muted">{t('notFound.description')}</p>
        <Link to="/" className={buttonStyles('primary', 'md', 'mt-8')}>
          {t('notFound.back')}
        </Link>
      </div>
    </main>
  )
}
