// Guest Service screen rules (Todo-Pilot §8). Written first (TDD).
import { describe, expect, it } from 'vitest'
import { formatDuration, formatIDR, recoveryError, responseState } from './guest-service'

describe('formatDuration', () => {
  it.each([
    [null, '—'], [0, '0m'], [45, '45m'], [60, '1h'], [200, '3h 20m'], [1440, '1d'], [3125, '2d 4h'],
  ] as const)('%s → %s', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text)
  })
})

describe('formatIDR', () => {
  it('uses Indonesian grouping', () => {
    expect(formatIDR(100000)).toBe('Rp 100.000')
    expect(formatIDR(0)).toBe('Rp 0')
  })
})

describe('responseState', () => {
  const now = Date.parse('2026-10-03T12:00:00Z')
  const base = { reportedAt: '2026-10-03T11:30:00Z', firstResponseAt: null as string | null, status: 'open' }

  it('responded when there is a first response', () => {
    expect(responseState({ ...base, firstResponseAt: '2026-10-03T11:40:00Z' }, now, 60))
      .toEqual({ state: 'responded', minutes: null })
  })
  it('waiting while inside the target', () => {
    expect(responseState(base, now, 60)).toEqual({ state: 'waiting', minutes: 30 })
  })
  it('overdue past the target', () => {
    expect(responseState({ ...base, reportedAt: '2026-10-03T10:00:00Z' }, now, 60))
      .toEqual({ state: 'overdue', minutes: 120 })
  })
  it('cancelled complaints need no response', () => {
    expect(responseState({ ...base, status: 'cancelled' }, now, 60)).toEqual({ state: 'none', minutes: null })
  })
})

describe('recoveryError (mirrors backend validate_compensation)', () => {
  it.each([
    ['none', 0, null],
    ['none', 5000, 'No compensation means a value of 0'],
    ['voucher', 50000, null],
    ['refund', 0, 'A refund needs its value in IDR'],
    ['discount', -1, 'Compensation value cannot be negative'],
    ['free-item', 0, null],
  ] as const)('%s %s', (type, value, error) => {
    expect(recoveryError(type, value)).toBe(error)
  })
})
