// Weekly / monthly schedule shape (Todo-Ops-Checklist Fase 4). Written first (TDD).
// Mirrors schedule_problem in backend/app/services/ops_checklist_rules.py.
import { describe, expect, it } from 'vitest'
import { frequencyDefaults, fromWindowInput, scheduleProblem, toWindowInput, windowUnit } from './ops-schedule'

describe('scheduleProblem', () => {
  it('daily', () => {
    expect(scheduleProblem('daily', [], null, 60, 120)).toBeNull()
    expect(scheduleProblem('daily', [], null, 720, 720)).toBeNull()
    expect(scheduleProblem('daily', [], null, 1000, 500)).toBe('window')
    expect(scheduleProblem('daily', [], 3, 60, 120)).toBe('dayOfMonthNotDaily')
  })

  it('weekly needs exactly one weekday and a window under a week', () => {
    expect(scheduleProblem('weekly', [7], null, 6 * 1440, 1440)).toBeNull()
    expect(scheduleProblem('weekly', [], null, 60, 60)).toBe('weeklyOneDay')
    expect(scheduleProblem('weekly', [6, 7], null, 60, 60)).toBe('weeklyOneDay')
    expect(scheduleProblem('weekly', [7], null, 6 * 1440, 1441)).toBe('window')
  })

  it('monthly needs a day 1–31 and a window within 28 days', () => {
    expect(scheduleProblem('monthly', [], 31, 27 * 1440, 1440)).toBeNull()
    expect(scheduleProblem('monthly', [], null, 60, 60)).toBe('monthlyDay')
    expect(scheduleProblem('monthly', [], 32, 60, 60)).toBe('monthlyDay')
    expect(scheduleProblem('monthly', [], 1, 28 * 1440, 1)).toBe('window')
  })

  it('negative minutes', () => {
    expect(scheduleProblem('daily', [], null, -1, 0)).toBe('window')
  })
})

describe('window input', () => {
  it('minutes for daily, days for weekly and monthly', () => {
    expect(windowUnit('daily')).toBe('minutes')
    expect(windowUnit('weekly')).toBe('days')
    expect(toWindowInput('weekly', 2880)).toBe(2)
    expect(fromWindowInput('weekly', 2)).toBe(2880)
    expect(fromWindowInput('monthly', 0.5)).toBe(720)
    expect(toWindowInput('daily', 90)).toBe(90)
    expect(fromWindowInput('daily', 90)).toBe(90)
  })
})

describe('frequencyDefaults', () => {
  it('gives each frequency a valid starting shape', () => {
    for (const f of ['daily', 'weekly', 'monthly'] as const) {
      const d = frequencyDefaults(f)
      expect(scheduleProblem(f, d.daysOfWeek, d.dayOfMonth, d.openMinutesBefore, d.graceMinutes)).toBeNull()
    }
    expect(frequencyDefaults('weekly').daysOfWeek).toEqual([1])
    expect(frequencyDefaults('monthly').dayOfMonth).toBe(1)
  })
})
