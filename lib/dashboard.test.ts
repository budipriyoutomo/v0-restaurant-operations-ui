// GM dashboard (Todo-Modern-UI Fase 3): today's condition as a sentence and the
// outlet rail. Written first (TDD).
import { describe, expect, it } from 'vitest'
import { headlineParts, outletRail, outletSignal } from './dashboard'
import type { OutletRow } from './outlets-api'

const row = (outlet: string, flags: OutletRow['flags'] = [], over: Partial<OutletRow> = {}): OutletRow => ({
  outletId: outlet, outlet, openIssues: 0, slaBreached: 0, readyToClose: 0, qaScore: null, guestWaiting: 0,
  guestResponseMinutes: null, budgetPct: null, downtimeHours: 0, flags, ...over })

describe('headlineParts', () => {
  it('names what needs attention, or says all is well', () => {
    expect(headlineParts(0, 0)).toEqual([{ key: 'dashboard.headline.allClear' }])
    expect(headlineParts(2, 6)).toEqual([
      { key: 'dashboard.headline.outlets', count: 2 }, { key: 'dashboard.headline.late', count: 6 }])
    expect(headlineParts(0, 1)).toEqual([{ key: 'dashboard.headline.late', count: 1 }])
  })
})

describe('outletRail', () => {
  it('keeps the server order (most urgent first) and shows every outlet when few', () => {
    const rows = [row('Kemang', ['sla']), row('Senopati')]
    expect(outletRail(rows)).toEqual({ tickets: rows, normal: 0 })
  })

  it('a single outlet still gets its ticket', () => {
    expect(outletRail([row('Kemang')]).tickets).toHaveLength(1)
  })

  it('many outlets: the flagged ones as tickets, the normal ones counted', () => {
    const flagged = [row('A', ['sla']), row('B', ['qa'])]
    const normal = Array.from({ length: 10 }, (_, i) => row(`N${i}`))
    expect(outletRail([...flagged, ...normal], 8)).toEqual({ tickets: flagged, normal: 10 })
  })
})

describe('outletSignal', () => {
  it('any exception asks for action; otherwise neutral', () => {
    expect(outletSignal(row('A', ['budget']))).toBe('action')
    expect(outletSignal(row('B', [], { openIssues: 4 }))).toBe('neutral')
  })
})
