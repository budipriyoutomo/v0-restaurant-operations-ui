import { describe, expect, it } from 'vitest'
import { countByWorkState, issueWorkState } from './issue-work-state'
import type { IssueStatus } from './types'

// Todo-Pilot §18 (UX-5, Option A): the GM dashboard separates "still being
// worked on" from "waiting to be closed".

const i = (status: IssueStatus, readyToClose = false) => ({ status, readyToClose })

describe('issueWorkState', () => {
  it('finished issues are done', () => {
    expect(issueWorkState(i('closed'))).toBe('done')
    expect(issueWorkState(i('cancelled'))).toBe('done')
  })

  it('finished work not yet closed is awaiting close', () => {
    expect(issueWorkState(i('open', true))).toBe('awaiting-close')        // WO done, no Task
    expect(issueWorkState(i('in-progress', true))).toBe('awaiting-close')
    expect(issueWorkState(i('resolved'))).toBe('awaiting-close')          // resolved waits for the manager
  })

  it('everything else is in progress', () => {
    for (const s of ['open', 'assigned', 'in-progress', 'waiting'] as IssueStatus[]) {
      expect(issueWorkState(i(s))).toBe('in-progress')
    }
  })
})

describe('countByWorkState', () => {
  it('counts each state', () => {
    expect(countByWorkState([i('open'), i('open', true), i('resolved'), i('closed'), i('cancelled'), i('waiting')]))
      .toEqual({ 'in-progress': 2, 'awaiting-close': 2, done: 2 })
  })
})
