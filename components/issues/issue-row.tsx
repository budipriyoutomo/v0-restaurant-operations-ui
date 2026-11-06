'use client'

// One issue as a dense list row (Todo-Modern-UI Fase 3). Desktop: columns
// Issue | Outlet | Due | Status | Priority | Linked. Phone: two lines, title and
// status, then number · outlet · due · linked. One DOM for both: the meta group
// is `md:contents`, so its children become grid cells on desktop. Text and
// colour together, never a pill.
import { AlertTriangle, Camera, CheckSquare, Clock, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { approvalBadge, slaState } from '@/lib/issue-card'
import { prioritySignal, SIGNAL_TEXT, statusSignal } from '@/lib/tone'
import type { ApprovalRequest, Issue, WorkOrder } from '@/lib/types'
import { StatusLabel } from '@/components/shared/status-label'
import { RecordId } from '@/components/shared/record-id'

export type IssueSort = 'urgent' | 'newest'

export const ROW_COLS = 'md:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1.4fr)]'



export function IssueRow({ issue, approval, workOrder, selected, onOpen }: {
  issue: Issue
  approval: Issue['approval'] | ApprovalRequest | undefined
  workOrder: Pick<WorkOrder, 'id' | 'number' | 'status'> | undefined
  selected: boolean
  onOpen: () => void
}) {
  const { t, label, status: statusLabel, date, relative } = useT()
  const sla = slaState(issue)
  const appr = approvalBadge(approval ?? undefined)
  const taskCount = issue.taskIds.length
  const photos = issue.photoCount ?? 0
  const prio = prioritySignal(issue.priority)
  const id = `row-${issue.id}`

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        // Named by number + title; the columns are its description (Todo-Pilot §26).
        aria-labelledby={`${id}-number ${id}-title`}
        aria-describedby={`${id}-status ${id}-meta`}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
        className={cn(
          'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 md:gap-x-4 md:py-2.5 md:items-center cursor-pointer transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
          ROW_COLS,
          selected ? 'bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]' : 'hover:bg-muted/50',
        )}
      >
        <p id={`${id}-title`} className="col-start-1 row-start-1 min-w-0 text-sm font-medium truncate">{issue.title}</p>

        <div id={`${id}-status`} className="col-start-2 row-start-1 justify-self-end md:col-start-4 md:row-span-2 md:justify-self-start">
          {issue.readyToClose
            ? <StatusLabel signal="done">{t('issues.readyBadge')}</StatusLabel>
            : <StatusLabel signal={statusSignal(issue.status)}>{statusLabel(issue.status)}</StatusLabel>}
        </div>

        <div id={`${id}-meta`}
          className="col-span-2 row-start-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground md:contents">
          <span className={cn('md:col-start-1 md:row-start-2 flex items-center gap-1 min-w-0')}>
            <span id={`${id}-number`}><RecordId id={issue.number} /></span>
            <span className="max-md:hidden truncate">· {label('category', issue.category)}</span>
            <span className="max-md:hidden" title={date(issue.createdDate)}>
              · {issue.createdAt ? relative(issue.createdAt) : date(issue.createdDate)}
            </span>
          </span>

          <span className={cn('md:col-start-2 md:row-start-1 md:row-span-2 md:text-sm md:text-foreground truncate')}>{issue.outlet}</span>

          <span className={cn('md:col-start-3 md:row-start-1 md:row-span-2', sla.kind === 'none' && 'max-md:hidden')}>
            {sla.kind === 'breached' && (
              <span className={cn('inline-flex items-center gap-1 font-medium', SIGNAL_TEXT.action)}>
                <AlertTriangle className="size-3" aria-hidden="true" />
                {sla.days === 1 ? t('issues.slaOverdueOne') : t('issues.slaOverdue', { n: sla.days })}
              </span>
            )}
            {sla.kind === 'today' && (
              <span className={cn('inline-flex items-center gap-1 font-medium', SIGNAL_TEXT.waiting)}>
                <Clock className="size-3" aria-hidden="true" /> {t('issues.slaToday')}
              </span>
            )}
            {sla.kind === 'left' && (
              <span className={cn('inline-flex items-center gap-1', sla.days === 1 && cn('font-medium', SIGNAL_TEXT.waiting))}>
                <Clock className="size-3" aria-hidden="true" />
                {sla.days === 1 ? t('issues.slaLeftOne') : t('issues.slaLeft', { n: sla.days })}
              </span>
            )}
            {sla.kind === 'none' && <span aria-hidden="true">—</span>}
          </span>

          {/* Medium/low need no attention: on the phone only high and critical show. */}
          <span className={cn('md:col-start-5 md:row-start-1 md:row-span-2', prio === 'neutral' && 'max-md:hidden')}>
            <span className={cn('font-medium', prio === 'neutral' ? 'text-muted-foreground' : SIGNAL_TEXT[prio])}>
              {label('priority', issue.priority)}
            </span>
          </span>

          <span className={cn('md:col-start-6 md:row-start-1 md:row-span-2 flex flex-wrap items-center gap-x-2.5 gap-y-0.5',
            !appr && !workOrder && taskCount === 0 && photos === 0 && 'hidden md:flex')}>
            {appr?.kind === 'pending' && (
              <span className={cn('font-medium', SIGNAL_TEXT[appr.escalated ? 'action' : 'waiting'])}>
                {t('issues.approvalStep', { step: appr.step, total: appr.total })}
              </span>
            )}
            {appr?.kind === 'rejected' && <span className={cn('font-medium', SIGNAL_TEXT.action)}>{t('issues.approvalRejected')}</span>}
            {appr?.kind === 'approved' && <span className={SIGNAL_TEXT.done}>{t('issues.approvalApproved')}</span>}
            {workOrder && (
              <span className="inline-flex items-center gap-1">
                <Wrench className="size-3" aria-hidden="true" />
                <span className="tabular-nums">{workOrder.number}</span> · {label('woStatus', workOrder.status)}
              </span>
            )}
            {taskCount > 0 && (
              <span className="inline-flex items-center gap-1 tabular-nums"
                aria-label={taskCount === 1 ? t('issues.taskCountOne') : t('issues.taskCount', { count: taskCount })}>
                <CheckSquare className="size-3" aria-hidden="true" /> {taskCount}
              </span>
            )}
            {photos > 0 && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Camera className="size-3" aria-hidden="true" /> {photos}
              </span>
            )}
            {!appr && !workOrder && taskCount === 0 && photos === 0 && <span aria-hidden="true">—</span>}
          </span>
        </div>
      </div>
    </li>
  )
}
