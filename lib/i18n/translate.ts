// Pure translation & formatting (no React, no store) — safe to import from
// lib/store.ts and other plain modules. Todo-Pilot §16.
import { en } from './en'
import { id, type Messages } from './id'
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from './locale'

export { DEFAULT_LOCALE, normalizeLocale, type Locale }
export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'en', label: 'English' },
]
const DICTIONARIES: Record<Locale, Messages> = { id, en }
const INTL_LOCALE: Record<Locale, string> = { id: 'id-ID', en: 'en-GB' }

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]
export type MessageKey = Leaves<Messages>
export type Vars = Record<string, string | number>
export type EnumGroup = keyof Messages['enum']

function lookup(dict: unknown, key: string): string | undefined {
  const v = key.split('.').reduce<unknown>((o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined), dict)
  return typeof v === 'string' ? v : undefined
}

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const text = lookup(DICTIONARIES[locale], key) ?? lookup(id, key) ?? key
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : text
}

/** Label of an API enum value (status, priority, …); unknown values show as is. */
export function enumLabel(locale: Locale, group: EnumGroup, value: string): string {
  return lookup(DICTIONARIES[locale], `enum.${group}.${value}`) ?? value
}

/** Label of any record status (Issue/Task, WO, approval, …). */
export function statusLabel(locale: Locale, status: string): string {
  for (const group of ['status', 'woStatus', 'approvalStatus', 'extraStatus'] as const) {
    const v = lookup(DICTIONARIES[locale], `enum.${group}.${status}`)
    if (v) return v
  }
  return status
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export function formatDate(locale: Locale, value: string | null | undefined): string {
  if (!value) return '—'
  // A date-only value is a calendar day: format it in UTC so it never shifts.
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const d = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00Z` : value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], DATE_ONLY.test(value) ? { ...opts, timeZone: 'UTC' } : opts).format(d)
}

export function formatDateTime(locale: Locale, value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d)
}

export function formatRelative(locale: Locale, iso: string, now: number = Date.now()): string {
  const diffMin = Math.floor((now - new Date(iso).getTime()) / 60000)
  if (Number.isNaN(diffMin)) return iso
  if (diffMin < 1) return translate(locale, 'time.justNow')
  if (diffMin < 60) return translate(locale, 'time.minutesAgo', { n: diffMin })
  const h = Math.floor(diffMin / 60)
  if (h < 24) return translate(locale, 'time.hoursAgo', { n: h })
  return translate(locale, 'time.daysAgo', { n: Math.floor(h / 24) })
}

