import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { buttonStyles } from '@/components/ui/button-styles'
import { EmptyState } from '@/components/ui/EmptyState'
import { HomeHeading } from './HomeHeading'

export function AdminHomePage() {
  const { t } = useTranslation('home')

  return (
    <>
      <HomeHeading
        role="ADMIN"
        title={t('admin.title')}
        description={t('admin.description')}
      />
      <EmptyState
        icon={ShieldCheck}
        title={t('admin.emptyTitle')}
        description={t('admin.emptyDescription')}
        action={
          <Link to="/admin/catalog" className={buttonStyles()}>
            {t('admin.action')}
          </Link>
        }
      />
    </>
  )
}
