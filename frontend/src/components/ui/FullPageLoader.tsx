import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function FullPageLoader() {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className="grid min-h-dvh place-items-center"
      aria-label={t('loading')}
    >
      <LoaderCircle className="size-10 animate-spin" aria-hidden="true" />
    </div>
  )
}
