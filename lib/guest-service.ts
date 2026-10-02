// Guest Service screen rules (Todo-Pilot §8). Pure — tested in guest-service.test.ts.
// recoveryError mirrors backend guest_service.validate_compensation; the server
// stays the authority.
import type { CompensationType, GuestChannel } from './types'

export const CHANNEL_LABELS: Record<GuestChannel, string> = {
  'walk-in': 'Walk-in', phone: 'Phone', 'google-review': 'Google Review',
  instagram: 'Instagram', whatsapp: 'WhatsApp', other: 'Other',
}

export const COMPENSATION_LABELS: Record<CompensationType, string> = {
  none: 'None', discount: 'Discount', 'free-item': 'Free item', voucher: 'Voucher', refund: 'Refund', other: 'Other',
}

/** 45 → "45m", 200 → "3h 20m", 3125 → "2d 4h" (minutes dropped from a day up). */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60), m = minutes % 60
    return m ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(minutes / 1440), h = Math.floor((minutes % 1440) / 60)
  return h ? `${d}d ${h}h` : `${d}d`
}

export function formatIDR(value: number): string {
  return 'Rp ' + (value ?? 0).toLocaleString('id-ID')
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

export function recoveryError(type: CompensationType, value: number): string | null {
  if (value < 0) return 'Compensation value cannot be negative'
  if (type === 'none' && value !== 0) return 'No compensation means a value of 0'
  if (VALUE_REQUIRED.includes(type) && value === 0) return `A ${type} needs its value in IDR`
  return null
}
