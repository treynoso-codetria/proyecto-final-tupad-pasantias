import { useQuery } from '@tanstack/react-query'
import {
  Briefcase,
  Building2,
  ClipboardList,
  GraduationCap,
  History,
  Megaphone,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { adminApi, adminKeys } from '@/features/admin/api'
import { ActionList } from '@/features/admin/components/ActionList'
import { cn } from '@/lib/cn'
import { HomeHeading } from './HomeHeading'

const RECENT_ACTIONS = 5

// Dashboard of the administrator: metrics of the portal, the sections of the
// panel and the latest moderation actions.
export function AdminHomePage() {
  const { t } = useTranslation('home')

  return (
    <>
      <HomeHeading role="ADMIN" title={t('admin.title')} description={t('admin.description')} />
      <div className="space-y-10">
        <Stats />
        <Sections />
        <RecentActions />
      </div>
    </>
  )
}

function Stats() {
  const { t } = useTranslation('admin')
  const stats = useQuery({ queryKey: adminKeys.stats, queryFn: adminApi.stats })

  if (stats.isPending) {
    return <FullPageLoader fullPage={false} />
  }
  if (stats.isError) {
    return <LoadError onRetry={() => void stats.refetch()} />
  }

  const { students, companies, offers, applications } = stats.data
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={GraduationCap}
        label={t('dashboard.students')}
        value={students.total}
        detail={t('dashboard.activeOf', students)}
      />
      <StatCard
        icon={Building2}
        label={t('dashboard.companies')}
        value={companies.total}
        detail={t('dashboard.activeOf', companies)}
      />
      <StatCard
        icon={Briefcase}
        label={t('dashboard.openOffers')}
        value={offers.open}
        detail={t('dashboard.offersDetail', offers)}
      />
      <StatCard
        icon={ClipboardList}
        label={t('dashboard.applications')}
        value={applications.total}
        detail={t('dashboard.applicationsDetail', applications)}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: number
  detail: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-sm font-bold">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl border-2 border-ink bg-accent">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-display text-4xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </Card>
  )
}

const SECTIONS: { key: 'users' | 'offers' | 'catalog' | 'activity'; to: string; icon: LucideIcon }[] = [
  { key: 'users', to: '/admin/users', icon: Users },
  { key: 'offers', to: '/admin/offers', icon: Megaphone },
  { key: 'catalog', to: '/admin/catalog', icon: Tags },
  { key: 'activity', to: '/admin/activity', icon: History },
]

function Sections() {
  const { t } = useTranslation('admin')

  return (
    <section>
      <SectionTitle>{t('dashboard.sections')}</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ key, to, icon: Icon }) => (
          <Link
            key={key}
            to={to}
            className="flex gap-4 rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard transition-[translate,box-shadow] duration-100 hover:-translate-0.5 hover:shadow-hard-lg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-accent-soft">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-display text-lg font-extrabold">
                {t(`sections.${key}.title`)}
              </span>
              <span className="block text-sm text-muted">{t(`sections.${key}.description`)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function RecentActions() {
  const { t } = useTranslation('admin')
  const actions = useQuery({
    queryKey: adminKeys.actions(1, RECENT_ACTIONS),
    queryFn: () => adminApi.actions(1, RECENT_ACTIONS),
  })

  let content: ReactNode
  if (actions.isPending) {
    content = <FullPageLoader fullPage={false} />
  } else if (actions.isError) {
    content = <LoadError onRetry={() => void actions.refetch()} />
  } else if (actions.data.items.length === 0) {
    content = <p className="text-sm text-muted">{t('dashboard.noActions')}</p>
  } else {
    content = <ActionList actions={actions.data.items} />
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <SectionTitle className="mb-0">{t('dashboard.recent')}</SectionTitle>
        {actions.data && actions.data.total > RECENT_ACTIONS && (
          <Link
            to="/admin/activity"
            className="text-sm font-bold underline decoration-2 underline-offset-4 hover:bg-accent"
          >
            {t('dashboard.viewAll')}
          </Link>
        )}
      </div>
      <Card className="p-6">{content}</Card>
    </section>
  )
}

function SectionTitle({ children, className = 'mb-4' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn('font-display text-2xl font-extrabold tracking-tight', className)}>{children}</h2>
  )
}
