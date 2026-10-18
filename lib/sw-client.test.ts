// Page side of the service worker (Todo-PWA P1): which build a worker is,
// what to do with a waiting update, wiping cached pages on logout.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET as versionJson } from '@/app/version.json/route'
import { BUILD_ID, clearPageCache, swVersion, waitingAction } from './sw-client'

afterEach(() => vi.unstubAllGlobals())

describe('swVersion / waitingAction', () => {
  it('reads the build from the registered script URL', () => {
    expect(swVersion('https://ops.example.com/sw.js?v=abc123')).toBe('abc123')
    expect(swVersion('https://ops.example.com/sw.js')).toBeNull()
  })

  it('a waiting worker of this page\'s own build is switched on quietly', () => {
    expect(waitingAction('https://x/sw.js?v=b2', 'b2')).toBe('activate')
  })

  it('a waiting worker of a newer build asks the user to reload (never mid-form)', () => {
    expect(waitingAction('https://x/sw.js?v=b3', 'b2')).toBe('prompt')
  })
})

describe('clearPageCache', () => {
  it('deletes cached pages of every build, keeps static assets', async () => {
    const names = new Set(['ro-pages-b1', 'ro-pages-b2', 'ro-static-b2', 'other'])
    vi.stubGlobal('caches', { keys: async () => [...names], delete: async (n: string) => names.delete(n) })
    await clearPageCache()
    expect([...names].sort()).toEqual(['other', 'ro-static-b2'])
  })

  it('is a no-op without Cache Storage (node, old browsers)', async () => {
    await expect(clearPageCache()).resolves.toBeUndefined()
  })
})

describe('/version.json', () => {
  it('reports the build this server runs, for long-open tabs to compare', async () => {
    const res = versionJson()
    expect(res.headers.get('cache-control')).toContain('no-store')
    expect(await res.json()).toEqual({ version: BUILD_ID })
  })
})
