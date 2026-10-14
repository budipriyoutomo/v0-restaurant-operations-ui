// Why an action is not possible — shown *before* the click (Todo-Pilot §23 /
// UX-10). Mirrors the API's refusals (work_order_service, tasks router,
// issue closure); returns message keys so the UI can say it in either language.
import type { MessageKey, Vars } from './i18n/translate'
import type { ApprovalRequest, ClosureBlocker, Issue, WorkOrderStatus } from './types'

export type Reason = { key: MessageKey; params: Vars }

type WoLike = {
  status: WorkOrderStatus
  requiresApproval: boolean
  approvalId: string | null
  checklistItems?: { isDone: boolean }[]
}

export type WoAction = {
  target: 'in-progress' | 'completed'
  kind: 'start' | 'resume' | 'complete'
  reason: Reason | null      // set → the button is disabled and says why
  warning: Reason | null     // set → allowed, but worth knowing first
}

const reason = (key: MessageKey, params: Vars = {}): Reason => ({ key, params })

export function woPrimaryAction(wo: WoLike, approval: ApprovalRequest | undefined, canManage: boolean): WoAction | null {
  const next = wo.status === 'scheduled' ? { target: 'in-progress' as const, kind: 'start' as const }
    : wo.status === 'on-hold' ? { target: 'in-progress' as const, kind: 'resume' as const }
    : wo.status === 'in-progress' ? { target: 'completed' as const, kind: 'complete' as const }
    : null
  if (!next) return null

  let why: Reason | null = null
  // Same rule as the API: work that needs approval waits while it is pending.
  if (wo.requiresApproval && wo.approvalId) {
    if (approval) {
      if (approval.status === 'pending') {
        const total = Math.max(approval.steps?.length ?? 0, 1)
        why = reason('wo.reasonApproval', { number: approval.number, step: Math.min(approval.currentStepOrder || 1, total), total })
      }
    } else if (wo.status === 'on-hold') {
      why = reason('wo.reasonApprovalHidden')
    }
  }
  if (!why && !canManage) why = reason('wo.reasonNoPermission')

  const items = wo.checklistItems ?? []
  const open = items.filter((i) => !i.isDone).length
  const warning = next.kind === 'complete' && open > 0 ? reason('wo.warnChecklist', { open, total: items.length }) : null

  return { ...next, reason: why, warning }
}

/** A Task of a closed or cancelled Issue cannot move until the Issue is reopened. */
export function taskMoveBlock(issue: Pick<Issue, 'number' | 'status'> | undefined): Reason | null {
  if (!issue || (issue.status !== 'closed' && issue.status !== 'cancelled')) return null
  return reason('tasks.reasonIssueFinished', { number: issue.number })
}

/** Resolve / Close are refused while derived records are still open. */
export function closeBlockedReason(blockers: ClosureBlocker[]): Reason | null {
  if (blockers.length === 0) return null
  return reason('issueDrawer.reasonBlocked', { records: blockers.map((b) => b.number).join(', ') })
}

/** What a decision on the current step will do — said before confirming. */
export function approvalConsequence(approval: ApprovalRequest, decision: 'approved' | 'rejected'): Reason {
  if (decision === 'rejected') return reason('approvals.confirmReject')
  const total = Math.max(approval.steps?.length ?? 0, 1)
  const step = approval.currentStepOrder || 1
  return step < total ? reason('approvals.confirmNextStep', { next: step + 1, total }) : reason('approvals.confirmFinal')
}
