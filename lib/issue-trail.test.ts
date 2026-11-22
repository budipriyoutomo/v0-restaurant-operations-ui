// "Jalur Penanganan": every task, approval and work order of one issue on the
// rail, each with its own status and owner (Todo-Modern-UI Fase 3). Written first (TDD).
import { describe, expect, it } from 'vitest'
import { issueTrail } from './issue-trail'
import type { ApprovalRequest, Issue, Task, WorkOrder } from './types'

const issue = (over: Partial<Issue> = {}) => ({
  id: 'i1', number: 'ISS-1', approval: null, workOrder: null, ...over }) as Issue
const task = (id: string, status: string, assignee = 'Agus') =>
  ({ id, number: `TSK-${id}`, title: `Task ${id}`, status, assignee, issueId: 'i1' }) as unknown as Task
const wo = (id: string, status: string, assignee = 'Rudi') =>
  ({ id, number: `WO-${id}`, title: `WO ${id}`, status, assignee, issueId: 'i1' }) as unknown as WorkOrder

describe('issueTrail', () => {
  it('lists every child with its status and owner; open work first, finished last', () => {
    const trail = issueTrail(issue(), {
      tasks: [task('1', 'resolved'), task('2', 'in-progress')],
      workOrders: [wo('1', 'scheduled')],
    })
    expect(trail.map((s) => [s.key, s.owner, s.done])).toEqual([
      ['workOrder:1', 'Rudi', false],
      ['task:2', 'Agus', false],
      ['task:1', 'Agus', true],
    ])
    expect(trail.map((s) => s.to)).toEqual(['/work-orders/1', null, null])   // a task lives on its issue
  })

  it('an approval names the step and the role whose turn it is', () => {
    const approval = { id: 'a1', number: 'APR-1', status: 'pending', currentStepOrder: 2, stepCount: 2, escalated: false }
    const detail = { id: 'a1', currentStepOrder: 2, steps: [
      { stepOrder: 1, approverRole: 'manager', status: 'approved' },
      { stepOrder: 2, approverRole: 'admin', status: 'pending' }] } as unknown as ApprovalRequest
    const [step] = issueTrail(issue({ approval } as Partial<Issue>), { tasks: [], workOrders: [], approval: detail })
    expect(step).toMatchObject({ key: 'approval:a1', kind: 'approval', status: 'pending', signal: 'waiting',
      step: 2, steps: 2, ownerRole: 'admin', to: '/approvals/a1', done: false })
  })

  it('without the approval detail it still shows the step from the summary', () => {
    const approval = { id: 'a1', number: 'APR-1', status: 'pending', currentStepOrder: 1, stepCount: 2, escalated: true }
    const [step] = issueTrail(issue({ approval } as Partial<Issue>), { tasks: [], workOrders: [] })
    expect(step).toMatchObject({ step: 1, steps: 2, ownerRole: null, signal: 'action' })   // escalated
  })

  it('without CMMS access the work order comes from the issue summary, without an owner', () => {
    const [step] = issueTrail(issue({ workOrder: { id: 'w9', number: 'WO-9', status: 'in-progress' } } as Partial<Issue>),
      { tasks: [], workOrders: null })
    expect(step).toMatchObject({ key: 'workOrder:w9', number: 'WO-9', owner: null, title: null })
  })

  it('no children, no rail', () => {
    expect(issueTrail(issue(), { tasks: [], workOrders: [] })).toEqual([])
  })
})
