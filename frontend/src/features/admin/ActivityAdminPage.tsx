import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { PageHeading } from '@/components/ui/PageHeading'
import { Pagination } from '@/components/ui/Pagination'
import { adminApi, adminKeys } from './api'
import { ActionList } from './components/ActionList'

const PAGE_SIZE = 20

export function ActivityAdminPage() {
  const { t } = useTranslation('admin')
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const actions = useQuery({
    queryKey: adminKeys.actions(page, PAGE_SIZE),
    queryFn: () => adminApi.actions(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeading title={t('activity.title')} description={t('activity.description')} />
      {actions.isPending && <FullPageLoader fullPage={false} />}
      {actions.isError && <LoadError onRetry={() => void actions.refetch()} />}
      {actions.data?.items.length === 0 && (
        <EmptyState icon={History} title={t('activity.empty')} />
      )}
      {actions.data && actions.data.items.length > 0 && (
        <>
          <Card className="mb-8 p-6 sm:p-8">
            <ActionList actions={actions.data.items} />
          </Card>
          <Pagination
            page={actions.data.page}
            totalPages={actions.data.totalPages}
            onPageChange={(next) => {
              setSearchParams(next > 1 ? { page: String(next) } : {})
              window.scrollTo({ top: 0 })
            }}
          />
        </>
      )}
    </>
  )
}
