import { cn } from '@/lib/utils'

type Priority = 'critical' | 'high' | 'medium' | 'low'
type Status = 'open' | 'in_progress' | 'resolved' | 'escalated' | 'scheduled' | 'completed' | 'overdue' | 'pending' | 'approved' | 'rejected'

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
      priority === 'critical' && 'bg-destructive/15 text-destructive',
      priority === 'high' && 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
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
      {priority}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const config: Record<Status, { label: string; className: string }> = {
    open: { label: 'Open', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
    in_progress: { label: 'In Progress', className: 'bg-warning/15 text-warning' },
    resolved: { label: 'Resolved', className: 'bg-success/15 text-success' },
    escalated: { label: 'Escalated', className: 'bg-destructive/15 text-destructive' },
    scheduled: { label: 'Scheduled', className: 'bg-primary/15 text-primary' },
    completed: { label: 'Completed', className: 'bg-success/15 text-success' },
    overdue: { label: 'Overdue', className: 'bg-destructive/15 text-destructive' },
    pending: { label: 'Pending', className: 'bg-warning/15 text-warning' },
    approved: { label: 'Approved', className: 'bg-success/15 text-success' },
    rejected: { label: 'Rejected', className: 'bg-destructive/15 text-destructive' },
  }
  const c = config[status] ?? config.open
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold', c.className)}>
      {c.label}
    </span>
  )
}
