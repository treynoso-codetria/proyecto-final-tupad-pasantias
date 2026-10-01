import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Purely decorative: a sample offer card with an "accepted" stamp, hinting at
// what the portal is about. Hidden from assistive technology.
export function StickerStack() {
  const { t } = useTranslation('auth')

  return (
    <div aria-hidden="true" className="relative h-40 max-w-sm select-none">
      <div className="absolute top-4 left-0 w-80 -rotate-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-lg">
        <span className="inline-block rounded-full border-2 border-ink bg-brand px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase">
          {t('sticker.tag')}
        </span>
        <p className="mt-2 font-display text-lg leading-tight font-extrabold whitespace-nowrap">
          {t('sticker.title')}
        </p>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <MapPin className="size-4" />
          {t('sticker.location')}
        </p>
      </div>
      <div className="absolute top-0 left-60 rotate-6 rounded-xl border-2 border-ink bg-ink px-4 py-2 font-display text-lg font-extrabold tracking-wide whitespace-nowrap text-paper uppercase shadow-[4px_4px_0_0_var(--color-surface)]">
        {t('sticker.stamp')}
      </div>
    </div>
  )
}
