'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Calendar, GripVertical, AlertTriangle, ListChecks, Loader2, CircleCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { unlinkedAssigneeWarning } from '@/lib/assignee'
import { useT } from '@/lib/i18n'
import { Task, TaskStatus, Priority } from '@/lib/types'
import { taskMoveBlock, type Reason } from '@/lib/action-reasons'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { useDebounced, usePagedList } from '@/lib/use-paged-list'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar, FilterSelect } from '@/components/shared/filter-menu'
import { StatusBoard, type CardDrag } from '@/components/shared/status-board'
import { useUrlState } from '@/lib/use-route'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { useOutletFilter } from '@/lib/permissions'
import { outletQuery } from '@/lib/outlet-filter'
import { SIGNAL_DOT, SIGNAL_EDGE, SIGNAL_RING, statusSignal } from '@/lib/tone'
import { Select } from '@/components/shared/select'
import { KpiStrip } from '@/components/shared/kpi-strip'

// Cards per column; the rest is counted (Todo-Pilot §22).
const COLUMN_LIMIT = 50

// ---------------------------------------------------------------------------
// Status + priority presentation metadata (theme-aware — no hardcoded white)
// ---------------------------------------------------------------------------
// Labels: label('status', id).
// Column look follows the three signals (Todo-Modern-UI Fase 1).
const STATUS_META = Object.fromEntries(
  (['open', 'assigned', 'in-progress', 'waiting', 'resolved', 'closed', 'cancelled'] as TaskStatus[]).map((s) => {
    const signal = statusSignal(s)
    return [s, { dot: SIGNAL_DOT[signal], accent: SIGNAL_EDGE[signal], ring: SIGNAL_RING[signal] }]
  }),
) as Record<TaskStatus, { dot: string; accent: string; ring: string }>

// 'cancelled' (parent Issue cancelled) is kept off the board.
const COLUMN_ORDER: TaskStatus[] = ['open', 'assigned', 'in-progress', 'waiting', 'resolved', 'closed']

// Labels: label('priority', p).
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

const TODAY = new Date().toISOString().slice(0, 10)

function isOverdue(task: Task): boolean {
  return !!task.dueDate && task.dueDate < TODAY && task.status !== 'resolved' && task.status !== 'closed'
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('') || '?'
}

export function TaskCenterPage() {
  const { tasks, issues, updateTaskStatus, upsertTasks } = useIssueStore()
  const listVersion = useIssueStore((s) => s.listVersion)
  const { t, label } = useT()
  // A task of a closed/cancelled Issue stays put — same rule as the API (Todo-Pilot §23).
  const blockOf = (task: Task) => taskMoveBlock(
    task.issueStatus ? { number: task.issueNumber, status: task.issueStatus } : issues.find((i) => i.id === task.issueId))
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | null>(null)
  // Phones: the status tab, in the URL so refresh and Back keep it
  const [shownStatus, setShownStatus] = useUrlState('status', null)

  // Each column is a page from the server (Todo-Pilot §22): filters run there,
  // and a column shows at most COLUMN_LIMIT cards with the rest counted.
  const debouncedSearch = useDebounced(searchQuery)
  const { outlet } = useOutletFilter()            // top bar outlet filter
  const params = { q: debouncedSearch.trim(), priority: filterPriority, outlet }
  const pages = {} as Record<TaskStatus, ReturnType<typeof usePagedList<Task>>>
  for (const status of COLUMN_ORDER) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed list of columns
    pages[status] = usePagedList<Task>('/api/tasks', { ...params, status }, { page: 1, pageSize: COLUMN_LIMIT, onItems: upsertTasks })
  }
  // Cards go by their status in the cache, so a moved card changes column at once.
  const shownIds = new Set(COLUMN_ORDER.flatMap((st) => pages[st].ids ?? []))
  const filteredTasks = tasks.filter((task) => shownIds.has(task.id))
  const loading = COLUMN_ORDER.some((st) => pages[st].ids === null)

  // Overview — counted by the server over all tasks, not only the cards shown.
  const [overdue, setOverdue] = useState<number | null>(null)
  useEffect(() => {
    let live = true
    const o = outletQuery(outlet)
    api.getPage<Task>(`/api/tasks?late=true&limit=1${o ? `&${o}` : ''}`).then((r) => { if (live) setOverdue(r.total) }).catch(() => {})
    return () => { live = false }
  }, [listVersion, outlet])
  const stats = useMemo(() => {
    const total = COLUMN_ORDER.reduce((n, st) => n + pages[st].total, 0)
    const done = pages.resolved.total + pages.closed.total
    return { total, active: total - done, overdue: overdue ?? 0, done }
  }, [pages, overdue]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns = COLUMN_ORDER.map((id) => ({
    id,
    ...STATUS_META[id],
    label: label('status', id),
    items: filteredTasks.filter((t) => t.status === id),
    count: pages[id].total,
    footer: pages[id].total > (pages[id].ids?.length ?? 0)
      ? <p className="text-center text-xs text-muted-foreground py-1">{t('tasks.more', { count: pages[id].total - (pages[id].ids?.length ?? 0) })}</p>
      : null,
  }))

  function handleDrop(taskId: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId)
    const block = task ? blockOf(task) : null
    if (block) toast.error(t(block.key, block.params))
    else if (task && task.status !== status) updateTaskStatus(taskId, status)
  }

  const hasFilters = !!searchQuery || !!filterPriority

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 gap-5">
      <PageHeader title={t('tasks.title')} description={t('tasks.subtitle')} />

      {/* Overview stats */}
      <KpiStrip label={t('tasks.kpiLabel')} loading={loading} items={[
        { label: t('tasks.total'),     value: stats.total },
        { label: t('tasks.active'),    value: stats.active },
        { label: t('tasks.overdue'),   value: stats.overdue, signal: 'action' },
        { label: t('tasks.completed'), value: stats.done },
      ]} />

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('tasks.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-transparent bg-muted/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-colors"
          />
        </div>

        <FilterBar>
          <FilterSelect label={t('issues.priorityFilter')} allLabel={t('common.all')} value={filterPriority}
            options={PRIORITIES.map((p) => ({ value: p, label: label('priority', p) }))}
            onChange={setFilterPriority} />
          {hasFilters && (
            <button
              onClick={() => { setSearchQuery(''); setFilterPriority(null) }}
              className="flex items-center gap-1 h-10 sm:h-9 px-3 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="size-3" /> {t('tasks.clear')}
            </button>
          )}
        </FilterBar>
      </div>

      {/* Kanban board on a wide screen; status tabs + one list on a phone */}
      <StatusBoard
        label={t('tasks.title')}
        columns={columns}
        getId={(task) => task.id}
        value={COLUMN_ORDER.includes(shownStatus as TaskStatus) ? shownStatus as TaskStatus : null}
        onValueChange={setShownStatus}
        onDrop={handleDrop}
        emptyText={t('tasks.noTasks')}
        dropHereText={t('tasks.dropHere')}
        loading={loading}
        fill
        renderCard={(task, drag) => (
          <TaskCard task={task} block={blockOf(task)} drag={drag} onMove={updateTaskStatus} />
        )}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Task card
// ---------------------------------------------------------------------------
function TaskCard({
  task,
  block,
  drag,
  onMove,
}: {
  task: Task
  block: Reason | null
  drag: CardDrag
  onMove: (taskId: string, status: TaskStatus) => void
}) {
  const overdue = isOverdue(task)
  const { t, label, date, locale } = useT()

  return (
    <div
      draggable={drag.draggable && !block}
      onDragStart={drag.onDragStart}
      onDragEnd={drag.onDragEnd}
      className={cn(
        'group rounded-lg bg-card border border-border p-3 hover:shadow-md hover:border-primary/40 transition-all',
        drag.draggable && !block ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        drag.dragging && 'opacity-50 ring-2 ring-primary rotate-1',
      )}
    >
      {/* Top row: priority + task number + drag handle */}
      <div className="flex items-center gap-2 mb-2">
        <PriorityBadge priority={task.priority} />
        <span className="font-mono text-xs text-muted-foreground">{task.number}</span>
        {drag.draggable && <GripVertical className="size-3.5 text-muted-foreground/40 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>

      {/* Title + description */}
      <h4 className="font-medium text-sm leading-snug line-clamp-2">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-3 text-xs">
        <span
          title={unlinkedAssigneeWarning(task, locale) ?? task.assignee}
          className={cn(
            'flex items-center justify-center size-6 rounded-full text-xs font-bold shrink-0',
            // amber = a name that is not a user: nobody gets notified (Todo-Pilot §17)
            unlinkedAssigneeWarning(task, locale) ? 'bg-warning-mark/10 text-warning ring-1 ring-warning-mark' : 'bg-primary/10 text-primary',
          )}
        >
          {initials(task.assignee)}
        </span>
        <span className="text-muted-foreground truncate">{task.outlet}</span>
        <span
          className={cn(
            'flex items-center gap-1 ml-auto shrink-0',
            overdue ? 'text-destructive font-medium' : 'text-muted-foreground',
          )}
        >
          <Calendar className="size-3" />
          {date(task.dueDate)}
        </span>
      </div>

      {/* Footer: issue link + accessible status move (keyboard / touch fallback) */}
      <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-primary font-semibold">{task.issueNumber}</span>
        <Select
          value={task.status}
          onChange={(e) => onMove(task.id, e.target.value as TaskStatus)}
          onClick={(e) => e.stopPropagation()}
          aria-label={t('tasks.moveTo')}
          disabled={!!block}
          aria-describedby={block ? `${task.id}-block` : undefined}
          size="sm">
          {COLUMN_ORDER.map((id) => (
            <option key={id} value={id}>{label('status', id)}</option>
          ))}
        </Select>
      </div>
      {block && (
        <p id={`${task.id}-block`} className="mt-1.5 text-xs text-muted-foreground">{t(block.key, block.params)}</p>
      )}
    </div>
  )
}
