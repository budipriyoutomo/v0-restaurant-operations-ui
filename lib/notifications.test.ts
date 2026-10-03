import { describe, expect, it } from 'vitest'
import { formatNotificationTime } from './notifications'

const NOW = new Date('2026-10-03T12:00:00Z').getTime()
const ago = (ms: number) => new Date(NOW - ms).toISOString()

describe('formatNotificationTime', () => {
  it('says "Just now" under a minute', () => {
    expect(formatNotificationTime(ago(30_000), NOW)).toBe('Just now')
  })

  it('uses minutes under an hour', () => {
    expect(formatNotificationTime(ago(5 * 60_000), NOW)).toBe('5m ago')
  })

  it('uses hours under a day', () => {
    expect(formatNotificationTime(ago(3 * 3_600_000), NOW)).toBe('3h ago')
  })

  it('falls back to a date after a day', () => {
    const iso = ago(3 * 86_400_000)
    expect(formatNotificationTime(iso, NOW)).toBe(new Date(iso).toLocaleDateString())
  })
})
