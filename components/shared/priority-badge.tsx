import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

type Priority = 'critical' | 'high' | 'medium' | 'low'
type Status =
  | 'open' | 'assigned' | 'in-progress' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  | 'escalated' | 'scheduled' | 'on-hold' | 'completed' | 'overdue' | 'pending' | 'approved'
  | 'rejected' | 'cancelled'

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label } = useT()
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
      priority === 'critical' && 'bg-destructive/15 text-destructive',
      priority === 'high' && 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
      priority === 'medium' && 'bg-warning/15 text-warning',
      priority === 'low' && 'bg-muted text-muted-foreground',
    )}>
      <span className={cn(
        'size-1 rounded-full',
        priority === 'critical' && 'bg-destructive',
        priority === 'high' && 'bg-orange-500',
        priority === 'medium' && 'bg-warning',
        priority === 'low' && 'bg-muted-foreground',
      )} />
      {label('priority', priority)}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const { status: statusLabel } = useT()
  const config: Record<Status, { className: string }> = {
    open:        { className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
    assigned:    { className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
    'in-progress': { className: 'bg-warning/15 text-warning' },
    in_progress: { className: 'bg-warning/15 text-warning' },
    waiting:     { className: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400' },
    resolved:    { className: 'bg-success/15 text-success' },
    closed:      { className: 'bg-muted text-muted-foreground' },
    escalated:   { className: 'bg-destructive/15 text-destructive' },
    scheduled:   { className: 'bg-primary/15 text-primary' },
    'on-hold':   { className: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400' },
    completed:   { className: 'bg-success/15 text-success' },
    overdue:     { className: 'bg-destructive/15 text-destructive' },
    pending:     { className: 'bg-warning/15 text-warning' },
    approved:    { className: 'bg-success/15 text-success' },
    rejected:    { className: 'bg-destructive/15 text-destructive' },
    cancelled:   { className: 'bg-muted text-muted-foreground' },
  }
  const c = config[status] ?? config.open
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold', c.className)}>
      {statusLabel(status)}
    </span>
  )
}
