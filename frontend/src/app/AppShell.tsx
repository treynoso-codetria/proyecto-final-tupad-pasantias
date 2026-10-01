import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { Button } from '@/components/ui/Button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/auth-context'
import { getDisplayName } from '@/features/auth/roles'

// Frame of the private area: top bar + page content, tinted with the color
// of the signed-in user's role. Only rendered under <RequireRole>.
export function AppShell() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  if (!user) {
    return null
  }

  return (
    <div data-role={user.role} className="min-h-dvh">
      <header className="border-b-2 border-ink bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-3">
            <p className="hidden min-w-0 items-center gap-2 text-sm md:flex">
              <span className="truncate font-semibold">
                {getDisplayName(user)}
              </span>
              <span className="rounded-full border-2 border-ink bg-accent px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase">
                {t(`roles.${user.role}`)}
              </span>
            </p>
            <LanguageSwitcher />
            {/* Icon-only on small screens; the label stays for screen readers. */}
            <Button variant="secondary" size="sm" onClick={logout}>
              <LogOut className="size-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t('logout')}</span>
            </Button>
          </div>
        </div>
        {/* Role-colored strip: the user always knows which area they are in. */}
        <div className="h-2 border-t-2 border-ink bg-accent" />
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <Outlet />
      </main>
    </div>
  )
}
