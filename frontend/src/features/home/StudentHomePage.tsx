import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth/auth-context'
import { getDisplayName } from '@/features/auth/roles'
import { HomeHeading } from './HomeHeading'

export function StudentHomePage() {
  const { t } = useTranslation('home')
  const { user } = useAuth()
  if (!user) {
    return null
  }

  return (
    <>
      <HomeHeading
        role="STUDENT"
        title={t('greeting', { name: getDisplayName(user) })}
        description={t('student.description')}
      />
      <EmptyState
        icon={Search}
        title={t('student.emptyTitle')}
        description={t('student.emptyDescription')}
      />
    </>
  )
}
