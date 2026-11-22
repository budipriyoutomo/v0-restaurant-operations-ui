// "Jalur Penanganan" (Todo-Modern-UI Fase 3): the tasks, approval and work
// orders an issue spawned, each with its own status and owner. One issue can
// have many children that run side by side, so this is a set ordered by what
// is still open — not a fixed sequence.
import { recordPath } from './routes'
import { statusSignal, type Signal } from './tone'
import type { ApprovalRequest, Issue, Task, WorkOrder } from './types'

export type TrailKind = 'approval' | 'workOrder' | 'task'

export interface TrailStep {
  kind: TrailKind
  key: string
  number: string
  title: string | null
  status: string
  signal: Signal
  /** Person working on it (tasks, work orders). */
  owner: string | null
  /** Approvals: whose turn it is, and which step. */
  ownerRole: string | null
  step: number | null
  steps: number | null
  done: boolean
  /** Record to open; null when it has no page of its own (tasks live on the issue). */
  to: string | null
}

const DONE = new Set(['resolved', 'closed', 'cancelled', 'completed', 'approved', 'rejected'])
const KIND_ORDER: Record<TrailKind, number> = { approval: 0, workOrder: 1, task: 2 }

export function issueTrail(issue: Issue, children: {
  tasks: Task[]
  /** null = the role cannot read work orders: fall back to the issue's summary. */
  workOrders: WorkOrder[] | null
  approval?: ApprovalRequest | null
}): TrailStep[] {
  const steps: TrailStep[] = []
  const base = { owner: null, ownerRole: null, step: null, steps: null }

  const a = issue.approval
  if (a) {
    const active = children.approval?.steps.find((s) => s.stepOrder === a.currentStepOrder)
    steps.push({ ...base, kind: 'approval', key: `approval:${a.id}`, number: a.number, title: null, status: a.status,
      signal: a.escalated && a.status === 'pending' ? 'action' : statusSignal(a.status),
      ownerRole: a.status === 'pending' ? active?.approverRole ?? null : null,
      step: a.currentStepOrder, steps: a.stepCount, done: DONE.has(a.status), to: recordPath('approvals', a.id) })
  }

  const wos = children.workOrders
    ?? (issue.workOrder ? [{ ...issue.workOrder, title: null, assignee: null } as unknown as WorkOrder] : [])
  for (const w of wos) {
    steps.push({ ...base, kind: 'workOrder', key: `workOrder:${w.id}`, number: w.number, title: w.title ?? null,
      status: w.status, signal: statusSignal(w.status), owner: w.assignee || null,
      done: DONE.has(w.status), to: recordPath('cmms', w.id) })
  }

  for (const t of children.tasks) {
    steps.push({ ...base, kind: 'task', key: `task:${t.id}`, number: t.number, title: t.title, status: t.status,
      signal: statusSignal(t.status), owner: t.assignee || null, done: DONE.has(t.status), to: null })
  }

  return steps.sort((x, y) => Number(x.done) - Number(y.done) || KIND_ORDER[x.kind] - KIND_ORDER[y.kind]
    || x.number.localeCompare(y.number))
}
