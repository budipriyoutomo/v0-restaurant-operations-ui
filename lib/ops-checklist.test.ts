// Daily ops checklist rules on the phone (Todo-Ops-Checklist Fase 1 §1.8). Written first (TDD).
// They mirror backend/app/services/ops_checklist_rules.py so staff see the same
// result, score and blockers before submitting as the server computes.
import { describe, expect, it } from 'vitest'
import {
  evaluateItem, failPreview, progress, runScore, submitProblems, windowState,
} from './ops-checklist'
import type { OpsRunItem } from './types'

const item = (over: Partial<OpsRunItem> = {}): OpsRunItem => ({
  id: 'i', templateItemId: 't', title: 'Item', section: '', itemType: 'check', minValue: null, maxValue: null,
  unit: '', requiresPhoto: false, isCritical: false, result: 'pass', value: null, notes: '',
  correctiveAction: null, recordedAt: null, issueId: null, issueNumber: null, photos: [], ...over,
})
const photo = { id: 'p', fileUrl: '/f', thumbnailUrl: '/t', createdAt: '' }

describe('evaluateItem', () => {
  it('uses inclusive bounds', () => {
    expect(evaluateItem(-22, -22, -15)).toBe('pass')
    expect(evaluateItem(-15, -22, -15)).toBe('pass')
    expect(evaluateItem(-14.9, -22, -15)).toBe('fail')
  })
  it('treats a missing bound as unbounded', () => {
    expect(evaluateItem(100, 0, null)).toBe('pass')
    expect(evaluateItem(5, null, 4)).toBe('fail')
  })
  it('is null without a value', () => {
    expect(evaluateItem(null, 0, 4)).toBeNull()
  })
})

describe('submitProblems', () => {
  it('is empty for a complete run', () => {
    expect(submitProblems([item(), item({ result: 'na' }), item({ result: 'fail' })])).toEqual([])
  })
  it('lists unanswered, missing photo and missing corrective action', () => {
    expect(submitProblems([
      item({ title: 'Lantai', result: null }),
      item({ title: 'Toilet', requiresPhoto: true }),
      item({ title: 'Freezer', itemType: 'temperature', result: 'fail', correctiveAction: '  ' }),
    ])).toEqual([
      { title: 'Lantai', kind: 'unanswered' },
      { title: 'Toilet', kind: 'photo' },
      { title: 'Freezer', kind: 'corrective' },
    ])
  })
  it('counts queued photos and skips photos on n/a', () => {
    expect(submitProblems([item({ requiresPhoto: true })], { i: 1 })).toEqual([])
    expect(submitProblems([item({ requiresPhoto: true, result: 'na' })])).toEqual([])
    expect(submitProblems([item({ requiresPhoto: true, photos: [photo] })])).toEqual([])
  })
})

describe('runScore', () => {
  it('is the % of pass among pass/fail, rounded to one decimal', () => {
    expect(runScore([item(), item(), item({ result: 'fail' }), item({ result: 'na' })])).toBe(66.7)
  })
  it('is null when nothing applies', () => {
    expect(runScore([item({ result: 'na' }), item({ result: null })])).toBeNull()
  })
})

describe('failPreview', () => {
  it('lists failed items that will raise (or add to) an issue', () => {
    const items = [item({ id: 'a', title: 'Sabun', result: 'fail' }), item({ id: 'b' }),
      item({ id: 'c', title: 'Freezer', result: 'fail', isCritical: true })]
    expect(failPreview(items).map((i) => [i.title, i.critical])).toEqual([['Sabun', false], ['Freezer', true]])
  })
})

describe('progress', () => {
  it('counts answered items', () => {
    expect(progress([item(), item({ result: null })])).toEqual({ answered: 1, total: 2, percent: 50 })
    expect(progress([])).toEqual({ answered: 0, total: 0, percent: 0 })
  })
})

describe('windowState', () => {
  const run = { status: 'pending' as const, opensAt: '2026-10-16T01:30:00Z', dueAt: '2026-10-16T02:30:00Z', closesAt: '2026-10-16T04:30:00Z' }
  const at = (iso: string) => new Date(iso).getTime()
  it('follows the window', () => {
    expect(windowState(run, at('2026-10-16T01:00:00Z'))).toBe('upcoming')
    expect(windowState(run, at('2026-10-16T02:00:00Z'))).toBe('open')
    expect(windowState(run, at('2026-10-16T03:00:00Z'))).toBe('late')
    expect(windowState(run, at('2026-10-16T05:00:00Z'))).toBe('missed')
  })
  it('final statuses win', () => {
    expect(windowState({ ...run, status: 'submitted' }, at('2026-10-16T02:00:00Z'))).toBe('submitted')
    expect(windowState({ ...run, status: 'missed' }, at('2026-10-16T02:00:00Z'))).toBe('missed')
  })
})
