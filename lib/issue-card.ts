// What an Issue card shows at a glance (Todo-Pilot §21 / UX-8): how long until
// the SLA (due date) runs out, where its approval stands, and its work order.
// Pure — the list page renders these.
import type { ApprovalRequest, Issue, WorkOrder } from './types'

const OVER = new Set<Issue['status']>(['resolved', 'closed', 'cancelled'])
const DAY = 86_400_000

export type SlaState =
  | { kind: 'none' }
  | { kind: 'left'; days: number }
  | { kind: 'today' }
  | { kind: 'breached'; days: number }

/** Calendar days between today (local) and the due date — same rule as the server's slaBreach. */
export function slaState(issue: Pick<Issue, 'dueDate' | 'status'>, today: Date = new Date()): SlaState {
  if (!issue.dueDate || OVER.has(issue.status)) return { kind: 'none' }
  const [y, m, d] = issue.dueDate.split('-').map(Number)
  if (!y || !m || !d) return { kind: 'none' }
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / DAY)
  if (days === 0) return { kind: 'today' }
  return days > 0 ? { kind: 'left', days } : { kind: 'breached', days: -days }
}

export type ApprovalBadge =
  | { kind: 'pending'; step: number; total: number; escalated: boolean }
  | { kind: 'rejected' }
  | { kind: 'approved' }
  | null

type ApprovalLike = Pick<ApprovalRequest, 'status' | 'currentStepOrder' | 'escalated'> & { steps?: unknown[]; stepCount?: number }

/** From a full approval or the issue's server summary (`issue.approval`, Todo-Pilot §22). */
export function approvalBadge(approval: ApprovalLike | null | undefined): ApprovalBadge {
  if (!approval) return null
  if (approval.status === 'rejected') return { kind: 'rejected' }
  if (approval.status === 'approved') return { kind: 'approved' }
  const total = Math.max(approval.stepCount ?? approval.steps?.length ?? 0, 1)
  return { kind: 'pending', step: Math.min(approval.currentStepOrder || 1, total), total, escalated: approval.escalated }
}

/** The Issue's corrective WO when named, else the first WO raised from it. */
export function linkedWorkOrder(issue: Pick<Issue, 'id' | 'workOrderId'> & { workOrder?: Issue['workOrder'] }, workOrders: WorkOrder[]): Pick<WorkOrder, 'id' | 'number' | 'status'> | undefined {
  return (issue.workOrderId ? workOrders.find((w) => w.id === issue.workOrderId) : undefined)
    ?? workOrders.find((w) => w.issueId === issue.id)
    ?? issue.workOrder ?? undefined
}
