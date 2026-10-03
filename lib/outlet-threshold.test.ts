// Effective WO approval threshold per outlet (Todo-Pilot §5/§12). Written first (TDD).
import { describe, expect, it } from 'vitest'
import { approvalThresholdsByOutlet } from './outlet-threshold'
import type { Outlet } from './types'

const outlet = (name: string, approvalThreshold: number | null, approvalThresholdDefault = 1_000_000) =>
  ({ id: name, name, approvalThreshold, approvalThresholdDefault }) as Outlet

describe('approvalThresholdsByOutlet', () => {
  it('uses the outlet override, else the global default', () => {
    expect(approvalThresholdsByOutlet([outlet('Jakarta', 5_000_000), outlet('Bandung', null, 2_000_000)]))
      .toEqual({ Jakarta: 5_000_000, Bandung: 2_000_000 })
  })
  it('keeps an explicit zero (every WO needs approval)', () => {
    expect(approvalThresholdsByOutlet([outlet('Bali', 0)])).toEqual({ Bali: 0 })
  })
  it('is empty without outlets', () => {
    expect(approvalThresholdsByOutlet([])).toEqual({})
  })
})
