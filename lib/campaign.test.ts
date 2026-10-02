// Campaign screen rules (Todo-Pilot §10). Written first (TDD).
import { describe, expect, it } from 'vitest'
import { budgetBar, formatMoney, parseMoneyInput, upliftLabel } from './campaign'

describe('formatMoney', () => {
  it('formats per currency', () => {
    expect(formatMoney(5_000_000, 'IDR')).toBe('Rp 5.000.000')
    expect(formatMoney(5_000, 'MYR')).toBe('RM 5,000')
    expect(formatMoney(1_200, 'USD')).toBe('USD 1,200')
  })
  it('shows a dash for nothing', () => {
    expect(formatMoney(null, 'IDR')).toBe('—')
  })
})

describe('parseMoneyInput', () => {
  it.each([
    ['5000000', 5_000_000], ['5.000.000', 5_000_000], ['Rp 5.000.000', 5_000_000], ['', null], ['  ', null],
  ] as const)('%j → %j', (raw, value) => {
    expect(parseMoneyInput(raw)).toBe(value)
  })
})

describe('budgetBar', () => {
  it('fills to the share of budget used', () => {
    expect(budgetBar(10_000_000, 4_000_000)).toEqual({ fill: 40, over: false, label: '40% used' })
  })
  it('caps the bar and flags overspend', () => {
    expect(budgetBar(10_000_000, 12_500_000)).toEqual({ fill: 100, over: true, label: '125% used — over budget' })
  })
  it('handles missing numbers', () => {
    expect(budgetBar(null, 1_000)).toEqual({ fill: 0, over: false, label: 'No budget set' })
    expect(budgetBar(10_000, null)).toEqual({ fill: 0, over: false, label: 'No spend recorded' })
  })
})

describe('upliftLabel', () => {
  it('signs the number', () => {
    expect(upliftLabel(20)).toBe('+20%')
    expect(upliftLabel(-5.5)).toBe('-5.5%')
    expect(upliftLabel(0)).toBe('0%')
    expect(upliftLabel(null)).toBe('—')
  })
})
