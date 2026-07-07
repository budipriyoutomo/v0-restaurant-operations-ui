'use client'

import { useState } from 'react'
import { Search, AlertCircle, Wrench, Calendar, User, Plus, GripVertical, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { Issue, IssueStatus, Priority } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateWorkOrderDialog } from '@/components/dialogs/create-work-order-dialog'

// Theme-aware status presentation — matches the Task Center kanban.
const STATUS_META: Record<IssueStatus, { label: string; dot: string; accent: string; ring: string }> = {
  open:          { label: 'Open',        dot: 'bg-blue-500',    accent: 'border-t-blue-500',    ring: 'ring-blue-500/40' },
  assigned:      { label: 'Assigned',    dot: 'bg-violet-500',  accent: 'border-t-violet-500',  ring: 'ring-violet-500/40' },
  'in-progress': { label: 'In Progress', dot: 'bg-amber-500',   accent: 'border-t-amber-500',   ring: 'ring-amber-500/40' },
  waiting:       { label: 'Waiting',     dot: 'bg-cyan-500',    accent: 'border-t-cyan-500',    ring: 'ring-cyan-500/40' },
  resolved:      { label: 'Resolved',    dot: 'bg-emerald-500', accent: 'border-t-emerald-500', ring: 'ring-emerald-500/40' },
  closed:        { label: 'Closed',       dot: 'bg-slate-400',   accent: 'border-t-slate-400',   ring: 'ring-slate-400/40' },
}

// Maintenance board shows the active pipeline only — 'closed' issues drop off the board.
const COLUMN_ORDER: IssueStatus[] = ['open', 'assigned', 'in-progress', 'waiting', 'resolved']
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

export function MaintenanceModulePage() {
  const { issues, updateIssueStatus, workOrders, assets, pics, createWorkOrder } = useIssueStore()
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | null>(null)
  const [showCreateWO, setShowCreateWO] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<IssueStatus | null>(null)

  const maintenanceIssues = issues.filter((i) => i.category === 'Maintenance')

  const filtered = maintenanceIssues.filter((i) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      i.number.toLowerCase().includes(q) ||
      i.title.toLowerCase().includes(q) ||
      i.outlet.toLowerCase().includes(q)
    const matchesPriority = !filterPriority || i.priority === filterPriority
    return matchesSearch && matchesPriority
  })

  const byStatus = COLUMN_ORDER.map((id) => ({
    id,
    ...STATUS_META[id],
    items: filtered.filter((i) => i.status === id),
  }))

  const stats = {
    total:    maintenanceIssues.length,
    critical: maintenanceIssues.filter((i) => i.priority === 'critical').length,
    overdue:  maintenanceIssues.filter((i) => i.slaBreach && i.status !== 'resolved' && i.status !== 'closed').length,
  }

  // Work orders linked to the currently selected issue
  const linkedWOs = selectedIssue
    ? workOrders.filter((wo) => wo.issueId === selectedIssue.id)
    : []

  const hasFilters = !!searchQuery || !!filterPriority

  function handleDrop(status: IssueStatus) {
    if (draggingId) {
      const issue = maintenanceIssues.find((i) => i.id === draggingId)
      if (issue && issue.status !== status) {
        updateIssueStatus(draggingId, status)
        setSelectedIssue((prev) => prev && prev.id === draggingId ? { ...prev, status } : prev)
      }
    }
    setDraggingId(null)
    setDragOverCol(null)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Module</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Maintenance issues across all outlets — linked to Issue Core
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Issues</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Critical</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">SLA Breached</p>
          <p className="text-2xl font-bold text-amber-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by number, title, outlet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex gap-1.5 items-center flex-wrap">
          <span className="text-xs font-medium text-muted-foreground mr-1">Priority:</span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(filterPriority === p ? null : p)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors capitalize',
                filterPriority === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
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

      {/* Empty state */}
      {maintenanceIssues.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wrench className="size-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">No maintenance issues</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Create an issue with category &ldquo;Maintenance&rdquo; to see it here.
          </p>
        </div>
      )}

      {/* Kanban */}
      {maintenanceIssues.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4">
            {byStatus.map((col) => {
              const isDropTarget = dragOverCol === col.id
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id) }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null)
                  }}
                  onDrop={() => handleDrop(col.id)}
                  className={cn(
                    'flex flex-col w-[16rem] shrink-0 rounded-xl border border-t-4 bg-muted/30 transition-colors',
                    col.accent,
                    isDropTarget && cn('ring-2 bg-muted/60', col.ring),
                  )}
                >
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('size-2 rounded-full', col.dot)} />
                      <h3 className="font-semibold text-sm">{col.label}</h3>
                    </div>
                    <span className="bg-background text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full border border-border">
                      {col.items.length}
                    </span>
                  </div>

                  <div className="flex-1 min-h-24 space-y-2 px-2 pb-2">
                    {col.items.length === 0 ? (
                      <div className={cn(
                        'flex items-center justify-center h-24 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors',
                        isDropTarget && 'border-primary/50 text-foreground',
                      )}>
                        {isDropTarget ? 'Drop here' : 'No issues'}
                      </div>
                    ) : (
                      col.items.map((issue) => (
                        <IssueCard
                          key={issue.id}
                          issue={issue}
                          woCount={workOrders.filter((wo) => wo.issueId === issue.id).length}
                          isSelected={selectedIssue?.id === issue.id}
                          dragging={draggingId === issue.id}
                          onSelect={() => setSelectedIssue(issue)}
                          onDragStart={() => setDraggingId(issue.id)}
                          onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedIssue && (
        <div className="fixed right-0 top-0 h-screen w-[420px] bg-background border-l border-border shadow-lg overflow-y-auto z-40 flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-primary font-bold">{selectedIssue.number}</p>
              <h2 className="font-bold text-base leading-snug mt-0.5 line-clamp-2">{selectedIssue.title}</h2>
            </div>
            <button
              onClick={() => setSelectedIssue(null)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none flex-shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 px-6 py-4 space-y-5">
            {/* Status + Priority */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Status</span>
                <select
                  value={selectedIssue.status}
                  onChange={(e) => {
                    const s = e.target.value as IssueStatus
                    updateIssueStatus(selectedIssue.id, s)
                    setSelectedIssue((prev) => prev ? { ...prev, status: s } : null)
                  }}
                  className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {COLUMN_ORDER.map((id) => (
                    <option key={id} value={id}>{STATUS_META[id].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Priority</span>
                <PriorityBadge priority={selectedIssue.priority} />
              </div>
            </div>

            {/* Meta */}
            <div className="border-t border-border pt-4 space-y-3 text-xs">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Description</p>
                <p className="text-foreground leading-relaxed">{selectedIssue.description || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <span className="font-semibold">{selectedIssue.assignee || 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due: {selectedIssue.dueDate ?? '—'}</span>
              </div>
              {selectedIssue.slaBreach && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-4" />
                  <span className="font-semibold">SLA Breached</span>
                </div>
              )}
            </div>

            {/* Issue reference */}
            <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs">
              <p className="text-blue-700 dark:text-blue-300 font-medium">Issue</p>
              <p className="text-blue-700 dark:text-blue-300 font-mono font-bold mt-0.5">{selectedIssue.number}</p>
              <p className="text-blue-600 dark:text-blue-400 mt-0.5">{selectedIssue.outlet}</p>
            </div>

            {/* ----------------------------------------------------------------
                Linked Work Orders
            ----------------------------------------------------------------- */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold">
                  Work Orders
                  <span className="ml-1.5 text-muted-foreground font-normal">({linkedWOs.length})</span>
                </p>
                <button
                  onClick={() => setShowCreateWO(true)}
                  className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Plus className="size-3" /> Create WO
                </button>
              </div>

              {linkedWOs.length === 0 ? (
                <div className="text-center py-6 rounded-md border border-dashed border-border">
                  <Wrench className="size-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No work orders linked.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Create one to assign a technician.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedWOs.map((wo) => (
                    <div
                      key={wo.id}
                      className="p-3 rounded-md border border-border bg-muted/20 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-muted-foreground">{wo.number}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                            wo.type === 'preventive' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            {wo.type}
                          </span>
                          <StatusBadge status={wo.status} />
                        </div>
                      </div>
                      <p className="font-medium line-clamp-1">{wo.title}</p>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="truncate">{wo.assetName}</span>
                        <span className="flex-shrink-0 ml-2">{wo.assignee}</span>
                      </div>
                      {wo.scheduledDate && (
                        <p className="text-muted-foreground">Scheduled: <span className="font-mono">{wo.scheduledDate}</span></p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Work Order dialog — pre-linked to selected issue */}
      <CreateWorkOrderDialog
        open={showCreateWO}
        onOpenChange={setShowCreateWO}
        assets={assets}
        assignees={pics.map((p) => p.name)}
        defaultIssueId={selectedIssue?.id}
        defaultIssueNumber={selectedIssue?.number}
        onSubmit={async (input) => { await createWorkOrder(input) }}
      />
    </div>
  )
}

function IssueCard({
  issue,
  woCount,
  isSelected,
  dragging,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  issue: Issue
  woCount: number
  isSelected: boolean
  dragging: boolean
  onSelect: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onClick={onSelect}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md',
        isSelected ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border hover:border-primary/40',
        dragging && 'opacity-50 ring-2 ring-primary rotate-1',
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <Wrench className={cn(
          'size-4 mt-0.5 flex-shrink-0',
          issue.priority === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
        )} />
        <h4 className="font-medium text-sm leading-snug line-clamp-2 flex-1">{issue.title}</h4>
        <GripVertical className="size-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-primary font-semibold">{issue.number}</span>
          <PriorityBadge priority={issue.priority} />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="size-3 flex-shrink-0" />
          <span className="truncate">{issue.assignee || 'Unassigned'}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="truncate">{issue.outlet}</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {issue.slaBreach && issue.status !== 'resolved' && (
              <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 font-medium">
                <AlertCircle className="size-3" /> SLA
              </span>
            )}
            {woCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Wrench className="size-3" />{woCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
