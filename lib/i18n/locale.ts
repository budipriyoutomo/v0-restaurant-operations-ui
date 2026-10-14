// Locale primitives without React/store imports (the store imports these).
export type Locale = 'id' | 'en'
export const DEFAULT_LOCALE: Locale = 'id'
export const LOCALE_STORAGE_KEY = 'ro.locale'

export function normalizeLocale(value: unknown): Locale {
  return value === 'en' || value === 'id' ? value : DEFAULT_LOCALE
}

/** Last language used on this device, so the login page already speaks it. */
export function storedLocale(): Locale {
  try {
    return normalizeLocale(typeof window !== 'undefined' ? window.localStorage.getItem(LOCALE_STORAGE_KEY) : null)
  } catch {
    return DEFAULT_LOCALE
  }
}

export function rememberLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch { /* private mode: the account preference still applies */ }
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}
