// Daily sign-off & inspection export helpers (Todo-Ops-Checklist Fase 4). Written first (TDD).
import { describe, expect, it } from 'vitest'
import { EXPORT_MAX_DAYS, daysDesc, exportRangeProblem, signoffState } from './ops-signoff'

describe('daysDesc', () => {
  it('lists the range newest first', () => {
    expect(daysDesc('2026-10-14', '2026-10-16')).toEqual(['2026-10-16', '2026-10-15', '2026-10-14'])
  })
  it('crosses month ends', () => {
    expect(daysDesc('2026-10-31', '2026-11-01')).toEqual(['2026-11-01', '2026-10-31'])
  })
  it('caps at 31 days and is empty for a reversed range', () => {
    expect(daysDesc('2026-01-01', '2026-12-31')).toHaveLength(31)
    expect(daysDesc('2026-10-16', '2026-10-15')).toEqual([])
  })
})

describe('exportRangeProblem', () => {
  it('needs an outlet and at most 31 days', () => {
    expect(EXPORT_MAX_DAYS).toBe(31)
    expect(exportRangeProblem('', '2026-10-01', '2026-10-02')).toBe('outlet')
    expect(exportRangeProblem('Dago', '2026-10-02', '2026-10-01')).toBe('order')
    expect(exportRangeProblem('Dago', '2026-10-01', '2026-10-31')).toBeNull()
    expect(exportRangeProblem('Dago', '2026-10-01', '2026-11-01')).toBe('tooLong')
  })
})

describe('signoffState', () => {
  it('signed, changed after signing, or open', () => {
    expect(signoffState(null)).toBe('unsigned')
    expect(signoffState({ signoff: { id: 's' }, isIntact: true })).toBe('signed')
    expect(signoffState({ signoff: { id: 's' }, isIntact: false })).toBe('changed')
    expect(signoffState({ signoff: null, isIntact: null })).toBe('unsigned')
  })
})
