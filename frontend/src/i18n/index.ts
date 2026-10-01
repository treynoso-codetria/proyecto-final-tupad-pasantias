import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enAuth from './locales/en/auth.json'
import enCommon from './locales/en/common.json'
import enErrors from './locales/en/errors.json'
import enHome from './locales/en/home.json'
import esAuth from './locales/es/auth.json'
import esCommon from './locales/es/common.json'
import esErrors from './locales/es/errors.json'
import esHome from './locales/es/home.json'

export const LANGUAGES = ['en', 'es'] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'

const STORAGE_KEY = 'pasantias.language'

// One JSON file per language and namespace (roughly one namespace per
// feature). English is the reference: it defines the keys TypeScript accepts
// in t(), see i18next.d.ts.
const en = { common: enCommon, auth: enAuth, home: enHome, errors: enErrors }

// Typed as `typeof en` so that the build fails if Spanish is missing a key.
const es: typeof en = {
  common: esCommon,
  auth: esAuth,
  home: esHome,
  errors: esErrors,
}

export const resources = { en, es }

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

// The app starts in English unless the user chose another language before.
function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY)
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
}

export function getCurrentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE
}

function applyLanguage(language: string): void {
  localStorage.setItem(STORAGE_KEY, language)
  document.documentElement.lang = language
  document.title = i18n.t('appName')
}

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  // Translations are bundled, so they are ready before the first render.
  initAsync: false,
  // React already escapes interpolated values.
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', applyLanguage)
applyLanguage(i18n.language)

export default i18n
