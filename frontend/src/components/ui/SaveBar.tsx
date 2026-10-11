import { useTranslation } from 'react-i18next'
import { Alert } from './Alert'
import { Button } from './Button'

type SaveBarProps = {
  saving: boolean
  // Nothing to save: the form matches what is stored.
  pristine: boolean
  saved: boolean
  // Already translated message for a failure not tied to a field.
  error?: string
}

// Submit button of an edit form, with the outcome of the last save next to it.
export function SaveBar({ saving, pristine, saved, error }: SaveBarProps) {
  const { t } = useTranslation('profile')

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {saved && pristine && <Alert variant="success">{t('saved')}</Alert>}
      <Button type="submit" loading={saving} disabled={pristine}>
        {t('save')}
      </Button>
    </div>
  )
}
