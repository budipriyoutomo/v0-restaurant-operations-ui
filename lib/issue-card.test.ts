import { describe, expect, it } from 'vitest'
import { approvalBadge, linkedWorkOrder, slaState } from './issue-card'
import type { ApprovalRequest, Issue, WorkOrder } from './types'

const TODAY = new Date(2026, 9, 14, 15, 30)   // 14 Oct 2026, local afternoon

describe('slaState (Todo-Pilot §21)', () => {
  const issue = (dueDate: string | null, status: Issue['status'] = 'open') => ({ dueDate, status })

  it('has nothing to count without a due date', () => {
    expect(slaState(issue(null), TODAY)).toEqual({ kind: 'none' })
    expect(slaState(issue(''), TODAY)).toEqual({ kind: 'none' })
  })

  it('counts whole days left, due today, and days overdue', () => {
    expect(slaState(issue('2026-10-17'), TODAY)).toEqual({ kind: 'left', days: 3 })
    expect(slaState(issue('2026-10-15'), TODAY)).toEqual({ kind: 'left', days: 1 })
    expect(slaState(issue('2026-10-14'), TODAY)).toEqual({ kind: 'today' })
    expect(slaState(issue('2026-10-12'), TODAY)).toEqual({ kind: 'breached', days: 2 })
  })

  it('stops counting once the work is over', () => {
    for (const status of ['resolved', 'closed', 'cancelled'] as const) {
      expect(slaState(issue('2026-10-01', status), TODAY)).toEqual({ kind: 'none' })
    }
  })
})

describe('approvalBadge', () => {
  const approval = (over: Partial<ApprovalRequest>): ApprovalRequest => ({
    id: 'a1', number: 'APR-1', title: '', type: 'maintenance' as never, description: '', requester: '', outlet: '',
    requestedDate: null, status: 'pending', issueId: 'i1', issueNumber: 'ISS-1', currentStepOrder: 1, escalated: false,
    steps: [{}, {}] as never, ...over,
  })

  it('shows which step a pending approval waits on', () => {
    expect(approvalBadge(approval({ currentStepOrder: 2 }))).toEqual({ kind: 'pending', step: 2, total: 2, escalated: false })
  })

  it('a single-step approval without step rows still reads 1/1', () => {
    expect(approvalBadge(approval({ steps: [] }))).toEqual({ kind: 'pending', step: 1, total: 1, escalated: false })
  })

  it('shows rejected and approved, and nothing without an approval', () => {
    expect(approvalBadge(approval({ status: 'rejected' }))).toEqual({ kind: 'rejected' })
    expect(approvalBadge(approval({ status: 'approved' }))).toEqual({ kind: 'approved' })
    expect(approvalBadge(undefined)).toBeNull()
  })
})

describe('linkedWorkOrder', () => {
  const wo = (id: string, issueId: string | null, status: WorkOrder['status'] = 'scheduled') =>
    ({ id, number: `WO-${id}`, issueId, status }) as WorkOrder

  it('prefers the corrective WO named on the issue, else any WO of that issue', () => {
    const wos = [wo('1', 'i1', 'completed'), wo('2', 'i1', 'in-progress'), wo('3', 'i2')]
    expect(linkedWorkOrder({ id: 'i1', workOrderId: '2' }, wos)?.id).toBe('2')
    expect(linkedWorkOrder({ id: 'i1', workOrderId: null }, wos)?.id).toBe('1')
    expect(linkedWorkOrder({ id: 'i9', workOrderId: null }, wos)).toBeUndefined()
  })
})

describe('server summaries (Todo-Pilot §22)', () => {
  it('a card reads its approval and work order from the issue itself', () => {
    expect(approvalBadge({ status: 'pending', currentStepOrder: 2, stepCount: 3, escalated: true }))
      .toEqual({ kind: 'pending', step: 2, total: 3, escalated: true })
    const wo = { id: 'w9', number: 'WO-9', status: 'in-progress' as const }
    expect(linkedWorkOrder({ id: 'i1', workOrderId: 'w9', workOrder: wo }, [])).toEqual(wo)
  })
})
