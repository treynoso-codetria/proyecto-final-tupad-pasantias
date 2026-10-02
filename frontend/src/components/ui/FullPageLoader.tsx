import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

type FullPageLoaderProps = {
  // False when it is shown inside a layout instead of filling the screen.
  fullPage?: boolean
  // Shown under the spinner; defaults to no visible text.
  label?: string
}

export function FullPageLoader({ fullPage = true, label }: FullPageLoaderProps) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-label={label ? undefined : t('loading')}
      className={cn(
        'grid place-items-center gap-4 text-center',
        fullPage ? 'min-h-dvh' : 'min-h-48',
      )}
    >
      <div>
        <LoaderCircle
          className="mx-auto size-10 animate-spin"
          aria-hidden="true"
        />
        {label && <p className="mt-4 font-semibold">{label}</p>}
      </div>
    </div>
  )
}
