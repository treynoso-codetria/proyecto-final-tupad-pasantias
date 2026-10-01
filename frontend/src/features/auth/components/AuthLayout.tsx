import { useTranslation } from 'react-i18next'
import { Outlet, useMatches } from 'react-router'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Logo } from '@/components/ui/Logo'
import { DEFAULT_AUTH_PANEL, type AuthPanel } from './auth-panel'
import { StickerStack } from './StickerStack'

// Split screen shared by login and registration: a colored panel that takes
// the color of the role being registered, and the form next to it. The panel
// stays mounted across auth routes, so its color fades between roles.
export function AuthLayout() {
  const { t } = useTranslation('auth')
  const matches = useMatches()
  const panel =
    (matches.at(-1)?.handle as AuthPanel | undefined) ?? DEFAULT_AUTH_PANEL

  return (
    <div
      data-role={panel.role}
      className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-1"
    >
      <aside className="flex flex-col gap-6 border-b-2 border-ink bg-accent px-6 py-6 transition-colors duration-300 motion-reduce:transition-none lg:gap-10 lg:border-r-2 lg:border-b-0 lg:px-12 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className="lg:my-auto">
          <p className="hidden rounded-full border-2 border-ink bg-surface px-3 py-1 text-sm font-bold lg:inline-block">
            {t(`panel.${panel.content}.tag`)}
          </p>
          <p className="font-display text-2xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-3xl lg:mt-5 lg:text-6xl lg:leading-[0.95]">
            {t(`panel.${panel.content}.headline`)}
          </p>
          <p className="mt-5 hidden max-w-md text-lg lg:block">
            {t(`panel.${panel.content}.description`)}
          </p>
        </div>
        <div className="hidden lg:block">
          <StickerStack />
        </div>
      </aside>

      <main className="flex items-start justify-center px-5 py-8 sm:px-8 lg:items-center lg:py-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
