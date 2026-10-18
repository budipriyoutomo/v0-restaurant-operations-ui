// Unread notifications on the installed app's icon (Todo-PWA P3).
import { describe, expect, it, vi } from 'vitest'
import { syncAppBadge } from './app-badge'

const nav = () => ({ setAppBadge: vi.fn(async () => {}), clearAppBadge: vi.fn(async () => {}) })

describe('syncAppBadge', () => {
  it('shows the unread count', () => {
    const n = nav()
    syncAppBadge(7, n)
    expect(n.setAppBadge).toHaveBeenCalledWith(7)
  })

  it('clears the badge at zero', () => {
    const n = nav()
    syncAppBadge(0, n)
    expect(n.clearAppBadge).toHaveBeenCalled()
    expect(n.setAppBadge).not.toHaveBeenCalled()
  })

  it('does nothing where the Badging API is missing (Firefox, iOS Safari tab)', () => {
    expect(() => syncAppBadge(3, {})).not.toThrow()
  })

  it('a refused badge (no permission) is not an error', async () => {
    const n = { setAppBadge: vi.fn(() => Promise.reject(new DOMException('denied'))), clearAppBadge: vi.fn() }
    expect(() => syncAppBadge(2, n)).not.toThrow()
    await Promise.resolve()
  })
})
