import { Megaphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth/auth-context'
import { getDisplayName } from '@/features/auth/roles'
import { HomeHeading } from './HomeHeading'

export function EmployerHomePage() {
  const { t } = useTranslation('home')
  const { user } = useAuth()
  if (!user) {
    return null
  }

  return (
    <>
      <HomeHeading
        role="EMPLOYER"
        title={t('greeting', { name: getDisplayName(user) })}
        description={t('employer.description')}
      />
      <EmptyState
        icon={Megaphone}
        title={t('employer.emptyTitle')}
        description={t('employer.emptyDescription')}
      />
    </>
  )
}
