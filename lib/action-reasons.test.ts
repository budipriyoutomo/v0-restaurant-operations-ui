import { describe, expect, it } from 'vitest'
import { approvalConsequence, closeBlockedReason, taskMoveBlock, woPrimaryAction } from './action-reasons'
import type { ApprovalRequest } from './types'

const approval = (over: Partial<ApprovalRequest> = {}) => ({
  id: 'a1', number: 'APR-2026-00007', status: 'pending', currentStepOrder: 1, steps: [{}, {}], issueId: 'i1',
  ...over,
}) as ApprovalRequest

describe('woPrimaryAction (Todo-Pilot §23)', () => {
  const wo = (status: string, over: object = {}) => ({ status, requiresApproval: false, approvalId: null, checklistItems: [], ...over }) as never

  it('offers start, resume and complete; nothing once finished', () => {
    expect(woPrimaryAction(wo('scheduled'), undefined, true)).toMatchObject({ target: 'in-progress', kind: 'start', reason: null })
    expect(woPrimaryAction(wo('on-hold'), undefined, true)).toMatchObject({ target: 'in-progress', kind: 'resume', reason: null })
    expect(woPrimaryAction(wo('in-progress'), undefined, true)).toMatchObject({ target: 'completed', kind: 'complete', reason: null })
    expect(woPrimaryAction(wo('completed'), undefined, true)).toBeNull()
    expect(woPrimaryAction(wo('cancelled'), undefined, true)).toBeNull()
  })

  it('explains that work waits for its approval, naming the approval and step', () => {
    const held = wo('on-hold', { requiresApproval: true, approvalId: 'a1' })
    expect(woPrimaryAction(held, approval({ currentStepOrder: 2 }), true)?.reason)
      .toEqual({ key: 'wo.reasonApproval', params: { number: 'APR-2026-00007', step: 2, total: 2 } })
  })

  it('still says it waits when the approval is not visible to this role', () => {
    const held = wo('on-hold', { requiresApproval: true, approvalId: 'a1' })
    expect(woPrimaryAction(held, undefined, true)?.reason).toEqual({ key: 'wo.reasonApprovalHidden', params: {} })
  })

  it('a decided approval no longer blocks (a later manual hold can resume)', () => {
    const held = wo('on-hold', { requiresApproval: true, approvalId: 'a1' })
    expect(woPrimaryAction(held, approval({ status: 'approved' }), true)?.reason).toBeNull()
  })

  it('tells viewers who may do it instead of hiding the action', () => {
    expect(woPrimaryAction(wo('scheduled'), undefined, false)?.reason).toEqual({ key: 'wo.reasonNoPermission', params: {} })
  })

  it('warns, without blocking, when checklist items are still open', () => {
    const items = [{ isDone: true }, { isDone: false }, { isDone: false }]
    const action = woPrimaryAction(wo('in-progress', { checklistItems: items }), undefined, true)
    expect(action?.reason).toBeNull()
    expect(action?.warning).toEqual({ key: 'wo.warnChecklist', params: { open: 2, total: 3 } })
  })
})

describe('taskMoveBlock', () => {
  it('a task of a closed or cancelled issue stays put until the issue is reopened', () => {
    expect(taskMoveBlock({ number: 'ISS-1', status: 'closed' })).toEqual({ key: 'tasks.reasonIssueFinished', params: { number: 'ISS-1' } })
    expect(taskMoveBlock({ number: 'ISS-1', status: 'cancelled' })).toEqual({ key: 'tasks.reasonIssueFinished', params: { number: 'ISS-1' } })
    expect(taskMoveBlock({ number: 'ISS-1', status: 'in-progress' })).toBeNull()
    expect(taskMoveBlock(undefined)).toBeNull()
  })
})

describe('closeBlockedReason', () => {
  it('names what still has to finish', () => {
    expect(closeBlockedReason([{ number: 'TSK-1' }, { number: 'WO-2' }] as never))
      .toEqual({ key: 'issueDrawer.reasonBlocked', params: { records: 'TSK-1, WO-2' } })
    expect(closeBlockedReason([])).toBeNull()
  })
})

describe('approvalConsequence', () => {
  it('says what happens next for each decision', () => {
    expect(approvalConsequence(approval(), 'approved')).toEqual({ key: 'approvals.confirmNextStep', params: { next: 2, total: 2 } })
    expect(approvalConsequence(approval({ currentStepOrder: 2 }), 'approved')).toEqual({ key: 'approvals.confirmFinal', params: {} })
    expect(approvalConsequence(approval({ steps: [] }), 'approved')).toEqual({ key: 'approvals.confirmFinal', params: {} })
    expect(approvalConsequence(approval(), 'rejected')).toEqual({ key: 'approvals.confirmReject', params: {} })
  })
})
