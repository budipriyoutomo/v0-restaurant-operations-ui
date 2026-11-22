import { useT } from '@/lib/i18n'
import { prioritySignal, statusSignal } from '@/lib/tone'
import { StatusLabel } from './status-label'

export function PriorityBadge({ priority }: { priority: string }) {
  const { label } = useT()
  return <StatusLabel signal={prioritySignal(priority)}>{label('priority', priority)}</StatusLabel>
}

/** Any status: Issue/Task, Work Order, Approval or extra (statusLabel looks in each). */
export function StatusBadge({ status }: { status: string }) {
  const { status: statusLabel } = useT()
  return <StatusLabel signal={statusSignal(status)}>{statusLabel(status)}</StatusLabel>
}
