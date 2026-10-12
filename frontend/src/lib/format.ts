import { getCurrentLanguage, type Language } from '@/i18n'

// Locale for Intl formatting: Spanish uses Argentine conventions (dates as
// 31/12/2026, $ 1.200.000).
const LOCALES: Record<Language, string> = { en: 'en-US', es: 'es-AR' }

const locale = () => LOCALES[getCurrentLanguage()]

// Dates that are only a day (YYYY-MM-DD, e.g. a deadline) are formatted in
// UTC, the zone they were parsed in, so they never shift by one day.
export function formatDay(isoDate: string): string {
  return new Intl.DateTimeFormat(locale(), {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(isoDate))
}

// "Oct 12, 2026, 3:45 PM" / "12 oct 2026, 15:45".
export function formatDateTime(isoDateTime: string): string {
  return new Intl.DateTimeFormat(locale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoDateTime))
}

// "3 days ago", "hace 3 días"; past moments only.
export function formatTimeAgo(isoDateTime: string): string {
  const seconds = (Date.now() - new Date(isoDateTime).getTime()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['week', 7 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
  ]
  const format = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (seconds >= size) {
      return format.format(-Math.floor(seconds / size), unit)
    }
  }
  return format.format(0, 'minute')
}

// Amounts are in Argentine pesos.
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}
