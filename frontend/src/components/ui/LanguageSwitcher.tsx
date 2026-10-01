import { useTranslation } from 'react-i18next'
import { getCurrentLanguage, LANGUAGES, type Language } from '@/i18n'
import { cn } from '@/lib/cn'

// Each language is always shown in its own language, so it can be recognized
// by someone who does not understand the current one.
const NAMES: Record<Language, string> = { en: 'English', es: 'Español' }

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = getCurrentLanguage()

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="inline-flex shrink-0 overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-hard-sm"
    >
      {LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          lang={language}
          title={NAMES[language]}
          aria-label={NAMES[language]}
          aria-pressed={language === current}
          onClick={() => void i18n.changeLanguage(language)}
          className={cn(
            'cursor-pointer px-2.5 py-1.5 font-display text-sm font-bold uppercase',
            'focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-accent',
            language === current
              ? 'bg-ink text-paper'
              : 'hover:bg-accent-soft',
          )}
        >
          {language}
        </button>
      ))}
    </div>
  )
}
