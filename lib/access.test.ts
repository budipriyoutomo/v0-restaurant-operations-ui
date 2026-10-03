import { describe, expect, it } from 'vitest'
import { canViewPage } from './access'

const noSettings = { permissions: { settings: 'none' as const, issues: 'view' as const } }

describe('canViewPage', () => {
  it('lets every signed-in user open their own Settings (WhatsApp, email, theme)', () => {
    expect(canViewPage(noSettings, 'settings')).toBe(true)
  })

  it('lets every signed-in user open the Notification Center', () => {
    expect(canViewPage(noSettings, 'notifications')).toBe(true)
  })

  it('still gates module pages by view permission', () => {
    expect(canViewPage(noSettings, 'issues')).toBe(true)
    expect(canViewPage(noSettings, 'users')).toBe(false)
  })

  it('denies everything module-gated when signed out', () => {
    expect(canViewPage(null, 'issues')).toBe(false)
  })
})
