import { LogOut, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router'
import { Button } from '@/components/ui/Button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/auth-context'
import { getDisplayName } from '@/features/auth/roles'
import type { Role } from '@/features/auth/types'
import { cn } from '@/lib/cn'

// Sections of each role's area; labels are under `nav` in the `common`
// translations. A role with a single section gets no navigation bar.
const NAVIGATION: Record<
  Role,
  { to: string; label: 'home' | 'studentProfile' | 'company' }[]
> = {
  STUDENT: [
    { to: '/student', label: 'home' },
    { to: '/student/profile', label: 'studentProfile' },
  ],
  EMPLOYER: [
    { to: '/employer', label: 'home' },
    { to: '/employer/company', label: 'company' },
  ],
  ADMIN: [{ to: '/admin', label: 'home' }],
}

// Frame of the private area: top bar + page content, tinted with the color
// of the signed-in user's role. Only rendered under <RequireRole>.
export function AppShell() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  if (!user) {
    return null
  }
  const navigation = NAVIGATION[user.role]

  return (
    <div data-role={user.role} className="min-h-dvh">
      <header className="border-b-2 border-ink bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/account"
              aria-label={t('account')}
              title={t('account')}
              className="flex min-w-0 items-center gap-2 rounded-xl border-2 border-transparent px-2 py-1 text-sm hover:border-ink hover:bg-accent-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <UserRound className="size-5 shrink-0" aria-hidden="true" />
              <span className="hidden truncate font-semibold md:inline">
                {getDisplayName(user)}
              </span>
              <span className="hidden rounded-full border-2 border-ink bg-accent px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase md:inline">
                {t(`roles.${user.role}`)}
              </span>
            </Link>
            <LanguageSwitcher />
            {/* Icon-only on small screens; the label stays for screen readers. */}
            <Button variant="secondary" size="sm" onClick={logout}>
              <LogOut className="size-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t('logout')}</span>
            </Button>
          </div>
        </div>
        {navigation.length > 1 && (
          <nav
            aria-label={t('nav.label')}
            className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-5 pb-3 sm:px-8"
          >
            {navigation.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                // `end`: the home link is not "active" on its sub-pages.
                end
                className={({ isActive }) =>
                  cn(
                    'shrink-0 rounded-xl border-2 px-3 py-1.5 font-display text-sm font-bold whitespace-nowrap',
                    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
                    isActive
                      ? 'border-ink bg-accent shadow-hard-sm'
                      : 'border-transparent hover:border-ink hover:bg-accent-soft',
                  )
                }
              >
                {t(`nav.${label}`)}
              </NavLink>
            ))}
          </nav>
        )}
        {/* Role-colored strip: the user always knows which area they are in. */}
        <div className="h-2 border-t-2 border-ink bg-accent" />
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <Outlet />
      </main>
    </div>
  )
}
