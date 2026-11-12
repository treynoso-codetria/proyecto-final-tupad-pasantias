import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { UserX } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { PageHeading } from '@/components/ui/PageHeading'
import { Pagination } from '@/components/ui/Pagination'
import { formatTimeAgo } from '@/lib/format'
import type { ApplicantLinkState } from '@/features/applications/pages/ApplicantProfilePage'
import {
  ACCOUNT_STATUSES,
  MANAGED_ROLES,
  adminApi,
  adminKeys,
  type AccountStatus,
  type AdminUser,
  type ManagedRole,
  type UserFilters,
} from './api'
import { AccountStatusDialog } from './components/AccountStatusDialog'
import { SearchForm } from './components/SearchForm'

// Filters live in the URL, so a search can be reloaded or shared.
function parseFilters(params: URLSearchParams): UserFilters {
  const role = params.get('role')
  const status = params.get('status')
  return {
    q: params.get('q') || undefined,
    role: MANAGED_ROLES.includes(role as ManagedRole) ? (role as ManagedRole) : undefined,
    status: ACCOUNT_STATUSES.includes(status as AccountStatus)
      ? (status as AccountStatus)
      : undefined,
    page: Math.max(1, Number(params.get('page')) || 1),
  }
}

function toParams({ q, role, status, page }: UserFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (q) params.q = q
  if (role) params.role = role
  if (status) params.status = status
  if (page > 1) params.page = String(page)
  return params
}

export function UsersAdminPage() {
  const { t } = useTranslation('admin')
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFilters(searchParams)
  const [target, setTarget] = useState<AdminUser | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const users = useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: () => adminApi.users(filters),
    placeholderData: keepPreviousData,
  })

  // Changing a filter goes back to the first page.
  const update = (changes: Partial<UserFilters>) => {
    setNotice(null)
    setSearchParams(toParams({ ...filters, page: 1, ...changes }))
  }

  return (
    <>
      <PageHeading title={t('users.title')} description={t('users.description')} />

      <div className="mb-8 space-y-4">
        <SearchForm
          value={filters.q}
          placeholder={t('users.searchPlaceholder')}
          onSearch={(q) => update({ q })}
        />
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <FilterTabs
            label={t('users.roleLabel')}
            value={filters.role}
            onChange={(role) => update({ role })}
            options={[
              { value: undefined, label: t('users.all') },
              ...MANAGED_ROLES.map((role) => ({ value: role, label: t(`users.roles.${role}`) })),
            ]}
          />
          <FilterTabs
            label={t('users.statusLabel')}
            value={filters.status}
            onChange={(status) => update({ status })}
            options={[
              { value: undefined, label: t('users.all') },
              ...ACCOUNT_STATUSES.map((status) => ({
                value: status,
                label: t(`users.statuses.${status}`),
              })),
            ]}
          />
        </div>
      </div>

      {notice && (
        <div className="mb-6">
          <Alert variant="success">{notice}</Alert>
        </div>
      )}

      {users.isPending && <FullPageLoader fullPage={false} />}
      {users.isError && <LoadError onRetry={() => void users.refetch()} />}
      {users.data?.items.length === 0 && <EmptyState icon={UserX} title={t('users.empty')} />}
      {users.data && users.data.items.length > 0 && (
        <>
          <p className="mb-4 text-sm font-semibold text-muted">
            {t('users.total', { count: users.data.total })}
          </p>
          <ul className="mb-8 space-y-4">
            {users.data.items.map((user) => (
              <li key={user.id}>
                <UserRow user={user} onChangeStatus={() => setTarget(user)} />
              </li>
            ))}
          </ul>
          <Pagination
            page={users.data.page}
            totalPages={users.data.totalPages}
            onPageChange={(page) => {
              setSearchParams(toParams({ ...filters, page }))
              window.scrollTo({ top: 0 })
            }}
          />
        </>
      )}

      <AccountStatusDialog
        user={target}
        onClose={() => setTarget(null)}
        onDone={(updated) =>
          setNotice(
            updated.isActive
              ? t('users.activated', { name: updated.name })
              : t('users.deactivated', { name: updated.name }),
          )
        }
      />
    </>
  )
}

function UserRow({ user, onChangeStatus }: { user: AdminUser; onChangeStatus: () => void }) {
  const { t } = useTranslation('admin')
  const backTo = `/admin/users${window.location.search}`

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard-sm sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t(`users.role.${user.role}`)}</Badge>
          {user.isActive ? (
            <Badge tone="success">{t('users.active')}</Badge>
          ) : (
            <Badge tone="danger">{t('users.inactive')}</Badge>
          )}
          {!user.emailVerified && <Badge tone="muted">{t('users.unverified')}</Badge>}
        </div>
        <p className="font-display text-lg leading-tight font-extrabold break-words">{user.name}</p>
        <p className="text-sm break-all">{user.email}</p>
        <p className="text-sm text-muted">
          {t('users.joined', { when: formatTimeAgo(user.createdAt) })} ·{' '}
          {user.lastLoginAt
            ? t('users.lastLogin', { when: formatTimeAgo(user.lastLoginAt) })
            : t('users.neverLoggedIn')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {user.studentId && (
          <Link
            to={`/admin/students/${user.studentId}`}
            state={{ backTo, backLabel: t('users.back') } satisfies ApplicantLinkState}
            className={buttonStyles('secondary', 'sm')}
          >
            {t('users.viewProfile')}
          </Link>
        )}
        {/* The public page of a deactivated company does not exist. */}
        {user.companyId && user.isActive && (
          <Link to={`/companies/${user.companyId}`} className={buttonStyles('secondary', 'sm')}>
            {t('users.viewCompany')}
          </Link>
        )}
        <Button variant={user.isActive ? 'secondary' : 'primary'} size="sm" onClick={onChangeStatus}>
          {user.isActive ? t('users.deactivate') : t('users.activate')}
        </Button>
      </div>
    </div>
  )
}
