// The top bar's outlet filter (Todo-UI "Filter outlet"). Written first (TDD).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { byOutlet, effectiveOutlet, outletQuery, rememberOutletFilter, storedOutletFilter } from './outlet-filter'
import type { Outlet, User } from './types'

const outlets = [
  { id: 'o1', name: 'Dago' },
  { id: 'o2', name: 'Riau' },
] as Outlet[]
const admin = { all_outlets: true, effective_outlet_ids: [] } as unknown as User
const riauStaff = { all_outlets: false, effective_outlet_ids: ['o2'] } as unknown as User

/** In-memory Storage: Node's own experimental localStorage shadows jsdom's. */
function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => { m.delete(k) },
    setItem: (k, v) => { m.set(k, String(v)) },
  }
}

beforeEach(() => { vi.stubGlobal('window', { localStorage: memoryStorage() }) })

describe('storedOutletFilter / rememberOutletFilter', () => {
  it('remembers the choice on this device and forgets "all outlets"', () => {
    expect(storedOutletFilter()).toBeNull()
    rememberOutletFilter('Dago')
    expect(storedOutletFilter()).toBe('Dago')
    rememberOutletFilter(null)
    expect(storedOutletFilter()).toBeNull()
  })
})

describe('effectiveOutlet', () => {
  it('keeps an outlet the user can see', () => {
    expect(effectiveOutlet('Dago', admin, outlets)).toBe('Dago')
    expect(effectiveOutlet('Riau', riauStaff, outlets)).toBe('Riau')
  })

  it('drops an outlet the user cannot see (another account on this device)', () => {
    expect(effectiveOutlet('Dago', riauStaff, outlets)).toBeNull()
    expect(effectiveOutlet('Gone', admin, outlets)).toBeNull()
    expect(effectiveOutlet('Dago', null, outlets)).toBeNull()
  })

  it('is null while outlets are not loaded yet', () => {
    expect(effectiveOutlet('Dago', admin, [])).toBeNull()
  })
})

describe('outletQuery', () => {
  it('builds the query-string part', () => {
    expect(outletQuery(null)).toBe('')
    expect(outletQuery('Dago Atas')).toBe('outlet=Dago%20Atas')
  })
})

describe('byOutlet', () => {
  it('keeps the rows of the chosen outlet, or all of them', () => {
    const rows = [{ id: 1, outlet: 'Dago' }, { id: 2, outlet: 'Riau' }]
    expect(byOutlet(rows, 'Riau').map((r) => r.id)).toEqual([2])
    expect(byOutlet(rows, null)).toBe(rows)
  })
})

describe('byOutlet — shared rows', () => {
  it('keeps rows for every outlet (outlet empty) when asked', () => {
    const rows = [{ id: 1, outlet: 'Dago' }, { id: 2, outlet: null }, { id: 3, outlet: '' }, { id: 4, outlet: 'Riau' }]
    expect(byOutlet(rows, 'Dago', { includeShared: true }).map((r) => r.id)).toEqual([1, 2, 3])
    expect(byOutlet(rows, 'Dago').map((r) => r.id)).toEqual([1])
  })
})
