import { useTranslation } from 'react-i18next'
import { Alert } from './Alert'
import { Button } from './Button'

// Shown in place of a screen's content when its data could not be loaded.
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="max-w-xl space-y-4">
      <Alert>{t('loadFailed')}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        {t('retry')}
      </Button>
    </div>
  )
}
