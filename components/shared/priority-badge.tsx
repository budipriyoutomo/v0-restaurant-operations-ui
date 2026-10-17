import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { priorityTone, statusTone } from '@/lib/tone'

const badge = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap'

export function PriorityBadge({ priority }: { priority: string }) {
  const { label } = useT()
  return <span className={cn(badge, priorityTone(priority))}>{label('priority', priority)}</span>
}

/** Any status: Issue/Task, Work Order, Approval or extra (statusLabel looks in each). */
export function StatusBadge({ status }: { status: string }) {
  const { status: statusLabel } = useT()
  return <span className={cn(badge, statusTone(status))}>{statusLabel(status)}</span>
}
