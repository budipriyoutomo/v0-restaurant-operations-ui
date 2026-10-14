// Guest Service screen rules (Todo-Pilot §8). Pure — tested in guest-service.test.ts.
// recoveryError mirrors backend guest_service.validate_compensation; the server
// stays the authority.
import { enumLabel, translate } from './i18n/translate'
import type { Locale } from './i18n/locale'
import type { CompensationType, GuestChannel } from './types'
import { formatMoney } from './money'

// Labels: label('guestChannel' | 'compensation', value) — lib/i18n (Todo-Pilot §16).
export const GUEST_CHANNELS: GuestChannel[] = ['walk-in', 'phone', 'google-review', 'instagram', 'whatsapp', 'other']
export const COMPENSATION_TYPES: CompensationType[] = ['none', 'discount', 'free-item', 'voucher', 'refund', 'other']

/** 45 → "45m", 200 → "3h 20m", 3125 → "2d 4h" (minutes dropped from a day up). */
export function formatDuration(minutes: number | null, locale: Locale = 'en'): string {
  if (minutes === null) return '—'
  if (minutes < 60) return translate(locale, 'duration.m', { m: minutes })
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60), m = minutes % 60
    return m ? translate(locale, 'duration.hm', { h, m }) : translate(locale, 'duration.h', { h })
  }
  const d = Math.floor(minutes / 1440), h = Math.floor((minutes % 1440) / 60)
  return h ? translate(locale, 'duration.dh', { d, h }) : translate(locale, 'duration.d', { d })
}

export function formatIDR(value: number): string {
  return formatMoney(value ?? 0)
}

/** Is this complaint still waiting for a first response, and is it past the target? */
export function responseState(
  c: { reportedAt: string; firstResponseAt: string | null; status: string },
  nowMs: number,
  targetMinutes: number,
): { state: 'responded' | 'waiting' | 'overdue' | 'none'; minutes: number | null } {
  if (c.firstResponseAt) return { state: 'responded', minutes: null }
  if (c.status === 'cancelled') return { state: 'none', minutes: null }
  const minutes = Math.max(0, Math.floor((nowMs - Date.parse(c.reportedAt)) / 60000))
  return { state: minutes > targetMinutes ? 'overdue' : 'waiting', minutes }
}

const VALUE_REQUIRED: CompensationType[] = ['discount', 'voucher', 'refund']

export function recoveryError(type: CompensationType, value: number, locale: Locale = 'en'): string | null {
  if (value < 0) return translate(locale, 'guestRules.negative')
  if (type === 'none' && value !== 0) return translate(locale, 'guestRules.noneZero')
  if (VALUE_REQUIRED.includes(type) && value === 0) {
    return translate(locale, 'guestRules.needsValue', { type: locale === 'en' ? type : enumLabel(locale, 'compensation', type) })
  }
  return null
}
