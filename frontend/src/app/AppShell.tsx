import { LogOut, UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/auth-context'
import { getDisplayName } from '@/features/auth/roles'
import { UnreadMessagesBadge } from '@/features/messages/UnreadMessagesBadge'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import type { Role } from '@/features/auth/types'
import { cn } from '@/lib/cn'

type NavItem = {
  to: string
  label:
    | 'home'
    | 'offers'
    | 'myOffers'
    | 'studentProfile'
    | 'company'
    | 'catalog'
    | 'myApplications'
    | 'messages'
  // Only active on that exact path, not on the pages below it.
  end?: boolean
}

// Sections of each role's area; labels are under `nav` in the `common`
// translations.
const NAVIGATION: Record<Role, NavItem[]> = {
  STUDENT: [
    { to: '/student', label: 'home', end: true },
    { to: '/offers', label: 'offers' },
    { to: '/student/applications', label: 'myApplications' },
    { to: '/messages', label: 'messages' },
    { to: '/student/profile', label: 'studentProfile' },
  ],
  EMPLOYER: [
    { to: '/employer', label: 'home', end: true },
    { to: '/employer/offers', label: 'myOffers' },
    { to: '/messages', label: 'messages' },
    { to: '/employer/company', label: 'company' },
  ],
  ADMIN: [
    { to: '/admin', label: 'home', end: true },
    { to: '/offers', label: 'offers' },
    { to: '/admin/catalog', label: 'catalog' },
  ],
}

// Frame of every page outside login/registration: top bar + content. With a
// session it is tinted with the user's role color and shows their sections;
// without one (public pages such as the offers) it offers to log in.
export function AppShell() {
  const { t } = useTranslation()
  const auth = useAuth()
  const { user } = auth
  const navigation = user ? NAVIGATION[user.role] : []

  // Dialogs and other overlays are rendered at the end of <body>, outside
  // this component, so the role color is also set there for them.
  useEffect(() => {
    if (!user) {
      return
    }
    document.body.dataset.role = user.role
    return () => {
      delete document.body.dataset.role
    }
  }, [user])

  return (
    <div data-role={user?.role} className="min-h-dvh">
      <header className="border-b-2 border-ink bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Logo to={user ? '/' : '/offers'} compact={Boolean(user)} />
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
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
            )}
            {user && <NotificationBell />}
            <LanguageSwitcher />
            {user && (
              // Icon-only on small screens; the label stays for screen readers.
              <Button variant="secondary" size="sm" onClick={auth.logout}>
                <LogOut className="size-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">{t('logout')}</span>
              </Button>
            )}
            {auth.status === 'anonymous' && (
              <>
                <Link
                  to="/login"
                  className={buttonStyles('secondary', 'sm', 'hidden sm:inline-flex')}
                >
                  {t('login')}
                </Link>
                <Link to="/register" className={buttonStyles('primary', 'sm')}>
                  {t('register')}
                </Link>
              </>
            )}
          </div>
        </div>
        {navigation.length > 1 && (
          <nav
            aria-label={t('nav.label')}
            className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-5 pb-3 sm:px-8"
          >
            {navigation.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
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
                {label === 'messages' && <UnreadMessagesBadge />}
              </NavLink>
            ))}
          </nav>
        )}
        {/* Strip in the role color: the user always knows which area they
            are in (the brand color when there is no session). */}
        <div className="h-2 border-t-2 border-ink bg-accent" />
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <Outlet />
      </main>
    </div>
  )
}
