'use client'

import { useMemo, useState } from 'react'
import { Search, Calendar, GripVertical, AlertTriangle, ListChecks, Loader2, CircleCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { Task, TaskStatus, Priority } from '@/lib/types'

// ---------------------------------------------------------------------------
// Status + priority presentation metadata (theme-aware — no hardcoded white)
// ---------------------------------------------------------------------------
const STATUS_META: Record<TaskStatus, { label: string; dot: string; accent: string; ring: string }> = {
  open:          { label: 'Open',        dot: 'bg-blue-500',    accent: 'border-t-blue-500',    ring: 'ring-blue-500/40' },
  assigned:      { label: 'Assigned',    dot: 'bg-violet-500',  accent: 'border-t-violet-500',  ring: 'ring-violet-500/40' },
  'in-progress': { label: 'In Progress', dot: 'bg-amber-500',   accent: 'border-t-amber-500',   ring: 'ring-amber-500/40' },
  waiting:       { label: 'Waiting',     dot: 'bg-cyan-500',    accent: 'border-t-cyan-500',    ring: 'ring-cyan-500/40' },
  resolved:      { label: 'Resolved',    dot: 'bg-emerald-500', accent: 'border-t-emerald-500', ring: 'ring-emerald-500/40' },
  closed:        { label: 'Closed',      dot: 'bg-slate-400',   accent: 'border-t-slate-400',   ring: 'ring-slate-400/40' },
}

const COLUMN_ORDER: TaskStatus[] = ['open', 'assigned', 'in-progress', 'waiting', 'resolved', 'closed']

const PRIORITY_META: Record<Priority, { label: string; badge: string }> = {
  critical: { label: 'Critical', badge: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' },
  high:     { label: 'High',     badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' },
  medium:   { label: 'Medium',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  low:      { label: 'Low',      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
}

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

const TODAY = new Date().toISOString().slice(0, 10)

function isOverdue(task: Task): boolean {
  return !!task.dueDate && task.dueDate < TODAY && task.status !== 'resolved' && task.status !== 'closed'
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('') || '?'
}

export function TaskCenterPage() {
  const { tasks, updateTaskStatus } = useIssueStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(q) ||
        task.issueNumber.toLowerCase().includes(q) ||
        task.number.toLowerCase().includes(q) ||
        task.assignee.toLowerCase().includes(q)
      const matchesPriority = !filterPriority || task.priority === filterPriority
      return matchesSearch && matchesPriority
    })
  }, [tasks, searchQuery, filterPriority])

  // Overview stats — computed over the full task set, not the filtered view.
  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length
    const done = tasks.length - active
    const overdue = tasks.filter(isOverdue).length
    return { total: tasks.length, active, overdue, done }
  }, [tasks])

  const columns = COLUMN_ORDER.map((id) => ({
    id,
    ...STATUS_META[id],
    tasks: filteredTasks.filter((t) => t.status === id),
  }))

  function handleDrop(status: TaskStatus) {
    if (draggingId) {
      const task = tasks.find((t) => t.id === draggingId)
      if (task && task.status !== status) updateTaskStatus(draggingId, status)
    }
    setDraggingId(null)
    setDragOverCol(null)
  }

  const hasFilters = !!searchQuery || !!filterPriority

  return (
    <div className="flex flex-col h-full p-6 gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Task Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag cards across the pipeline · tasks are auto-generated from Issues
          </p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ListChecks}  label="Total tasks" value={stats.total}   tone="neutral" />
        <StatCard icon={Loader2}     label="Active"      value={stats.active}  tone="blue" />
        <StatCard icon={AlertTriangle} label="Overdue"   value={stats.overdue} tone="red" />
        <StatCard icon={CircleCheck} label="Completed"   value={stats.done}    tone="green" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, task/issue no., or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex gap-1.5 items-center">
          <span className="text-xs font-medium text-muted-foreground mr-1">Priority:</span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(filterPriority === p ? null : p)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors capitalize',
                filterPriority === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted',
              )}
            >
              {p}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={() => { setSearchQuery(''); setFilterPriority(null) }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="size-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="flex gap-4 h-full pb-2">
          {columns.map((column) => {
            const isDropTarget = dragOverCol === column.id
            return (
              <div
                key={column.id}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(column.id) }}
                onDragLeave={(e) => {
                  // Only clear when leaving the column entirely, not its children
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null)
                }}
                onDrop={() => handleDrop(column.id)}
                className={cn(
                  'flex flex-col w-[17rem] shrink-0 rounded-xl border border-t-4 bg-muted/30 transition-colors',
                  column.accent,
                  isDropTarget && cn('ring-2 bg-muted/60', column.ring),
                )}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', column.dot)} />
                    <h3 className="font-semibold text-sm">{column.label}</h3>
                  </div>
                  <span className="bg-background text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full border border-border">
                    {column.tasks.length}
                  </span>
                </div>

                {/* Column body */}
                <div className="flex-1 min-h-24 space-y-2 px-2 pb-2 overflow-y-auto">
                  {column.tasks.length === 0 ? (
                    <div className={cn(
                      'flex items-center justify-center h-24 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors',
                      isDropTarget && 'border-primary/50 text-foreground',
                    )}>
                      {isDropTarget ? 'Drop here' : 'No tasks'}
                    </div>
                  ) : (
                    column.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        dragging={draggingId === task.id}
                        onDragStart={() => setDraggingId(task.id)}
                        onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                        onMove={updateTaskStatus}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tone: 'neutral' | 'blue' | 'red' | 'green'
}) {
  const toneCls = {
    neutral: 'text-muted-foreground bg-muted',
    blue:    'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/50',
    red:     'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/50',
    green:   'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50',
  }[tone]

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className={cn('flex items-center justify-center size-9 rounded-lg shrink-0', toneCls)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Task card
// ---------------------------------------------------------------------------
function TaskCard({
  task,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  task: Task
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onMove: (taskId: string, status: TaskStatus) => void
}) {
  const overdue = isOverdue(task)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group rounded-lg bg-card border border-border p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/40 transition-all',
        dragging && 'opacity-50 ring-2 ring-primary rotate-1',
      )}
    >
      {/* Top row: priority + task number + drag handle */}
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', PRIORITY_META[task.priority].badge)}>
          {PRIORITY_META[task.priority].label}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{task.number}</span>
        <GripVertical className="size-3.5 text-muted-foreground/40 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Title + description */}
      <h4 className="font-medium text-sm leading-snug line-clamp-2">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-3 text-xs">
        <span
          title={task.assignee}
          className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0"
        >
          {initials(task.assignee)}
        </span>
        <span className="text-muted-foreground truncate">{task.outlet}</span>
        <span
          className={cn(
            'flex items-center gap-1 ml-auto shrink-0',
            overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground',
          )}
        >
          <Calendar className="size-3" />
          {task.dueDate ?? '—'}
        </span>
      </div>

      {/* Footer: issue link + accessible status move (keyboard / touch fallback) */}
      <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-primary font-semibold">{task.issueNumber}</span>
        <select
          value={task.status}
          onChange={(e) => onMove(task.id, e.target.value as TaskStatus)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Move task to status"
          className="text-[11px] border border-border rounded-md px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
        >
          {COLUMN_ORDER.map((id) => (
            <option key={id} value={id}>{STATUS_META[id].label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
