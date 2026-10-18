// Session restore on app start (Todo-PWA P1): a dead network must not sign
// the user out; the last known profile keeps the app shell usable offline.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api-client', async (importOriginal) => {
  const real = await importOriginal<typeof import('./api-client')>()
  return { ...real, api: { get: vi.fn() } }
})

import { api, authToken, cachedUser } from './api-client'
import { restoreSession } from './session'
import type { User } from './types'

const get = api.get as unknown as ReturnType<typeof vi.fn>
const USER = { id: 'u1', name: 'Sari', email: 'sari@x.id' } as unknown as User

function fakeLocalStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
  }
}

beforeEach(() => {
  vi.stubGlobal('window', globalThis)
  vi.stubGlobal('localStorage', fakeLocalStorage())
  get.mockReset()
})
afterEach(() => vi.unstubAllGlobals())

describe('cachedUser', () => {
  it('is forgotten with the token (logout, 401)', () => {
    cachedUser.set(USER)
    expect(cachedUser.get()).toEqual(USER)
    authToken.clear()
    expect(cachedUser.get()).toBeNull()
  })

  it('a corrupt entry reads as no user', () => {
    localStorage.setItem('ro.user', '{nope')
    expect(cachedUser.get()).toBeNull()
  })
})

describe('restoreSession', () => {
  it('no token: no request, no user', async () => {
    expect(await restoreSession()).toBeNull()
    expect(get).not.toHaveBeenCalled()
  })

  it('online: the server profile, remembered for offline starts', async () => {
    authToken.set('t')
    get.mockResolvedValue(USER)
    expect(await restoreSession()).toEqual(USER)
    expect(cachedUser.get()).toEqual(USER)
  })

  it('network down: keeps the session on the last known profile', async () => {
    authToken.set('t')
    cachedUser.set(USER)
    get.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await restoreSession()).toEqual(USER)
    expect(authToken.get()).toBe('t')
  })

  it('network down and no profile yet: login page, but the token is kept', async () => {
    authToken.set('t')
    get.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await restoreSession()).toBeNull()
    expect(authToken.get()).toBe('t')
  })

  it('server refuses the token: signed out', async () => {
    authToken.set('t')
    cachedUser.set(USER)
    get.mockRejectedValue(new Error('API 401 /api/auth/me: {}'))
    expect(await restoreSession()).toBeNull()
    expect(authToken.get()).toBeNull()
    expect(cachedUser.get()).toBeNull()
  })
})
