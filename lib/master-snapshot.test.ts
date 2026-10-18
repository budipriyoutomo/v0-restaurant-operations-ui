// Outlets and categories kept on the device (Todo-PWA, verifikasi akhir), so
// "Lapor" works when the app is opened with no signal. Same lifetime as the
// session: dropped with the token (logout, 401).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authToken, cachedMasterData } from './api-client'
import type { MasterCategory, Outlet } from './types'

const outlets = [{ id: 'o1', name: 'KL Central' }] as Outlet[]
const categories = [{ id: 'c1', name: 'Other' }] as MasterCategory[]

beforeEach(() => {
  const m = new Map<string, string>()
  vi.stubGlobal('window', globalThis)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('cachedMasterData', () => {
  it('gives back what this user last loaded', () => {
    cachedMasterData.set('u1', { outlets, categories })
    expect(cachedMasterData.get('u1')).toEqual({ outlets, categories })
  })

  it('never another user\'s', () => {
    cachedMasterData.set('u1', { outlets, categories })
    expect(cachedMasterData.get('u2')).toBeNull()
    expect(cachedMasterData.get(undefined)).toBeNull()
  })

  it('is forgotten with the session', () => {
    cachedMasterData.set('u1', { outlets, categories })
    authToken.clear()
    expect(cachedMasterData.get('u1')).toBeNull()
  })

  it('a corrupt entry reads as nothing', () => {
    localStorage.setItem('ro.masterData', '{nope')
    expect(cachedMasterData.get('u1')).toBeNull()
  })
})
