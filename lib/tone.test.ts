// Three signals + neutral (Todo-Modern-UI Fase 1; was one colour per status,
// Todo-UI 0.3). Written first (TDD).
import { describe, expect, it } from 'vitest'
import {
  ASSET_SIGNAL, PRIORITY_SIGNAL, SIGNAL_DOT, SIGNAL_EDGE, SIGNAL_RING, SIGNAL_TEXT, STATUS_SIGNAL, WINDOW_SIGNAL,
  prioritySignal, statusSignal, toneIfAny, type Signal,
} from './tone'

const byStatus = (signal: Signal) => Object.keys(STATUS_SIGNAL).filter((s) => STATUS_SIGNAL[s] === signal).sort()

describe('signals', () => {
  it('maps every status to one of three signals or neutral', () => {
    expect(byStatus('action')).toEqual(['escalated', 'missed', 'overdue', 'rejected'])
    expect(byStatus('waiting')).toEqual(['late', 'on-hold', 'pending', 'pending_approval', 'waiting'])
    expect(byStatus('done')).toEqual(['approved', 'completed', 'resolved', 'submitted'])
    for (const s of ['open', 'scheduled', 'assigned', 'in-progress', 'in_progress', 'closed', 'cancelled',
      'upcoming', 'skipped', 'draft', 'ordered', 'received', 'sent']) {
      expect(statusSignal(s), s).toBe('neutral')
    }
  })

  it('unknown statuses are neutral', () => {
    expect(statusSignal('something-new')).toBe('neutral')
    expect(prioritySignal('weird')).toBe('neutral')
  })

  it('priority: only critical asks for action, high waits', () => {
    expect(PRIORITY_SIGNAL).toEqual({ critical: 'action', high: 'waiting', medium: 'neutral', low: 'neutral' })
  })

  it('daily checklist windows and asset states', () => {
    expect(WINDOW_SIGNAL).toEqual({ upcoming: 'neutral', open: 'neutral', late: 'waiting', missed: 'action', submitted: 'done' })
    expect(ASSET_SIGNAL).toEqual({ critical: 'action', warning: 'waiting', maintenance: 'waiting', operational: 'neutral' })
  })

  it('every signal has a text and a dot class made of theme tokens', () => {
    for (const map of [SIGNAL_TEXT, SIGNAL_DOT, SIGNAL_EDGE, SIGNAL_RING]) {
      expect(Object.keys(map).sort()).toEqual(['action', 'done', 'neutral', 'waiting'])
      for (const cls of Object.values(map)) expect(cls).not.toMatch(/-(red|amber|green|emerald|gray|blue)-\d/)
    }
    // Amber text on white fails AA: the brighter amber is for dots only.
    expect(SIGNAL_DOT.waiting).toBe('bg-warning-mark')
    expect(SIGNAL_TEXT.waiting).toBe('text-warning')
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
