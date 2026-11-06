// One source of badge colours (Todo-UI 0.3). Written first (TDD).
import { describe, expect, it } from 'vitest'
import { PRIORITY_TONE, STATUS_TONE, WINDOW_TONE, priorityTone, statusTone, toneIfAny } from './tone'

describe('badge tones', () => {
  it('every tone has a dark-mode variant', () => {
    for (const tone of [...Object.values(PRIORITY_TONE), ...Object.values(STATUS_TONE), ...Object.values(WINDOW_TONE)]) {
      expect(tone).toMatch(/dark:bg-/)
      expect(tone).toMatch(/dark:text-/)
    }
  })

  it('covers issue, task, work order, approval and ops statuses', () => {
    for (const s of ['open', 'assigned', 'in-progress', 'in_progress', 'waiting', 'resolved', 'closed', 'cancelled',
      'scheduled', 'on-hold', 'completed', 'overdue', 'escalated', 'pending', 'approved', 'rejected', 'submitted', 'missed']) {
      expect(STATUS_TONE[s], s).toBeDefined()
    }
    expect(Object.keys(WINDOW_TONE).sort()).toEqual(['late', 'missed', 'open', 'submitted', 'upcoming'])
  })

  it('falls back to a neutral tone', () => {
    expect(statusTone('something-new')).toBe(STATUS_TONE.closed)
    expect(priorityTone('weird')).toBe(PRIORITY_TONE.low)
    expect(priorityTone('critical')).toBe(PRIORITY_TONE.critical)
  })
})

// A zero or a missing value is not a signal (Todo-Modern-UI Fase 0).
describe('toneIfAny', () => {
  it('keeps the tone only for a value above zero', () => {
    expect(toneIfAny(3, 'critical')).toBe('critical')
    expect(toneIfAny(0, 'critical')).toBeUndefined()
    expect(toneIfAny(null, 'success')).toBeUndefined()
    expect(toneIfAny(undefined, 'text-red-600')).toBeUndefined()
  })
})
