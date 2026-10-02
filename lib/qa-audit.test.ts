// Unit tests for the QA audit screen's rules (Todo-Pilot §7). Written first (TDD).
// They mirror backend/app/services/qa_audit_service.py so the auditor sees the
// same score and the same blockers before submitting as the server computes.
import { describe, expect, it } from 'vitest'
import { auditProgress, previewScore, scoreTone, submitProblems } from './qa-audit'

type F = Parameters<typeof previewScore>[0][number]
const f = (result: F['result'], over: Partial<F> = {}): F => ({
  title: 'Item', result, weight: 1, requiresPhoto: false, photos: [], ...over,
})
const photo = { id: 'p', fileUrl: '/f', thumbnailUrl: '/t', createdAt: '' }

describe('previewScore', () => {
  it('is 100 when everything passes', () => {
    expect(previewScore([f('pass'), f('pass')])).toBe(100)
  })
  it('is weighted', () => {
    expect(previewScore([f('pass', { weight: 3 }), f('fail', { weight: 1 })])).toBe(75)
  })
  it('ignores na and unanswered items', () => {
    expect(previewScore([f('pass'), f('na', { weight: 5 }), f(null)])).toBe(100)
  })
  it('rounds to one decimal like the backend', () => {
    expect(previewScore([f('pass'), f('fail'), f('fail')])).toBe(33.3)
  })
  it('is null when nothing is applicable', () => {
    expect(previewScore([f('na')])).toBeNull()
    expect(previewScore([])).toBeNull()
  })
})

describe('submitProblems', () => {
  it('is empty for a complete audit', () => {
    expect(submitProblems([f('pass'), f('fail'), f('na')])).toEqual([])
  })
  it('lists unanswered items and missing required photos, in order', () => {
    expect(submitProblems([
      f(null, { title: 'A' }),
      f('fail', { title: 'B', requiresPhoto: true }),
      f('pass', { title: 'C', requiresPhoto: true, photos: [photo] }),
      f('na', { title: 'D', requiresPhoto: true }),
    ])).toEqual(['A: not answered', 'B: photo required'])
  })
})

describe('auditProgress', () => {
  it('counts answered items', () => {
    expect(auditProgress([f('pass'), f(null), f('na'), f(null)])).toEqual({ answered: 2, total: 4, percent: 50 })
  })
  it('handles an empty checklist', () => {
    expect(auditProgress([])).toEqual({ answered: 0, total: 0, percent: 0 })
  })
})

describe('scoreTone', () => {
  it.each([
    [100, 'good'], [85, 'good'], [84.9, 'warn'], [70, 'warn'], [69.9, 'bad'], [null, 'none'],
  ] as const)('%s → %s', (score, tone) => {
    expect(scoreTone(score)).toBe(tone)
  })
})
