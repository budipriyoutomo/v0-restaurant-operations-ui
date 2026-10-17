// Weekly / monthly checklist schedules (Todo-Ops-Checklist Fase 4).
// Mirrors schedule_problem in backend/app/services/ops_checklist_rules.py so the
// form explains a bad shape before the server answers 422.
import type { OpsScheduleFrequency } from './types'

// open + grace may not exceed the gap between two occurrences (monthly: the shortest month).
export const MAX_WINDOW_MINUTES: Record<OpsScheduleFrequency, number> = {
  daily: 24 * 60, weekly: 7 * 24 * 60, monthly: 28 * 24 * 60,
}

export type ScheduleProblem = 'weeklyOneDay' | 'monthlyDay' | 'dayOfMonthNotDaily' | 'window'

export function scheduleProblem(
  frequency: OpsScheduleFrequency, daysOfWeek: number[], dayOfMonth: number | null,
  openMinutesBefore: number, graceMinutes: number,
): ScheduleProblem | null {
  if (openMinutesBefore < 0 || graceMinutes < 0) return 'window'
  if (frequency === 'weekly' && daysOfWeek.length !== 1) return 'weeklyOneDay'
  if (frequency === 'monthly') {
    if (dayOfMonth === null || dayOfMonth < 1 || dayOfMonth > 31) return 'monthlyDay'
  } else if (dayOfMonth !== null) {
    return 'dayOfMonthNotDaily'
  }
  if (openMinutesBefore + graceMinutes > MAX_WINDOW_MINUTES[frequency]) return 'window'
  return null
}

/** The form asks minutes for a daily schedule and days for weekly/monthly ones. */
export const windowUnit = (f: OpsScheduleFrequency): 'minutes' | 'days' => (f === 'daily' ? 'minutes' : 'days')
export const toWindowInput = (f: OpsScheduleFrequency, minutes: number) =>
  windowUnit(f) === 'days' ? minutes / 1440 : minutes
export const fromWindowInput = (f: OpsScheduleFrequency, value: number) =>
  Math.round(windowUnit(f) === 'days' ? value * 1440 : value)

export interface ScheduleShape {
  daysOfWeek: number[]
  dayOfMonth: number | null
  openMinutesBefore: number
  graceMinutes: number
}

/** Where the form starts when the frequency changes: deep cleaning on Monday,
 *  open 2 days; calibration on the 1st, open 3 days; both 1 day of grace. */
export function frequencyDefaults(f: OpsScheduleFrequency): ScheduleShape {
  if (f === 'weekly') return { daysOfWeek: [1], dayOfMonth: null, openMinutesBefore: 2 * 1440, graceMinutes: 1440 }
  if (f === 'monthly') return { daysOfWeek: [], dayOfMonth: 1, openMinutesBefore: 3 * 1440, graceMinutes: 1440 }
  return { daysOfWeek: [], dayOfMonth: null, openMinutesBefore: 60, graceMinutes: 120 }
}
