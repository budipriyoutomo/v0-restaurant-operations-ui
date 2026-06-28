'use client'

import { useState } from 'react'
import { Search, Filter, AlertCircle, Wrench, Calendar, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { Issue, IssueStatus } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateWorkOrderDialog } from '@/components/dialogs/create-work-order-dialog'

const columns: { id: IssueStatus; label: string; color: string }[] = [
  { id: 'open',        label: 'Open',        color: 'border-blue-200 bg-blue-50'     },
  { id: 'assigned',    label: 'Assigned',    color: 'border-purple-200 bg-purple-50' },
  { id: 'in-progress', label: 'In Progress', color: 'border-amber-200 bg-amber-50'  },
  { id: 'waiting',     label: 'Waiting',     color: 'border-cyan-200 bg-cyan-50'    },
  { id: 'resolved',    label: 'Resolved',    color: 'border-green-200 bg-green-50'  },
]

export function MaintenanceModulePage() {
  const { issues, updateIssueStatus, workOrders, assets, pics, createWorkOrder } = useIssueStore()
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [showCreateWO, setShowCreateWO] = useState(false)

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

  const byStatus = columns.map((col) => ({
    ...col,
    items: filtered.filter((i) => i.status === col.id),
    count: filtered.filter((i) => i.status === col.id).length,
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
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by number, title, outlet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors font-medium text-sm">
          <Filter className="size-4" />
          Filter
        </button>
      </div>

      <div className="flex gap-1 items-center flex-wrap">
        <span className="text-xs font-medium text-muted-foreground mr-2">Priority:</span>
        {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFilterPriority(filterPriority === p ? null : p)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors capitalize',
              filterPriority === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            {p}
          </button>
        ))}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {byStatus.map((col) => (
            <div key={col.id} className="flex flex-col min-w-64">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded-full">
                  {col.count}
                </span>
              </div>
              <div className={cn('flex-1 space-y-2 p-3 rounded-lg border-2 min-h-64', col.color)}>
                {col.items.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">No issues</p>
                  </div>
                ) : (
                  col.items.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      woCount={workOrders.filter((wo) => wo.issueId === issue.id).length}
                      isSelected={selectedIssue?.id === issue.id}
                      onSelect={() => setSelectedIssue(issue)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
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
                  className="text-xs border border-border rounded px-2 py-1 bg-background"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
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
            <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs">
              <p className="text-blue-700 font-medium">Issue</p>
              <p className="text-blue-700 font-mono font-bold mt-0.5">{selectedIssue.number}</p>
              <p className="text-blue-600 mt-0.5">{selectedIssue.outlet}</p>
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
  onSelect,
}: {
  issue: Issue
  woCount: number
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'p-3 rounded-md border cursor-pointer transition-all',
        isSelected ? 'bg-white border-primary shadow-md' : 'bg-white border-border hover:shadow-sm'
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <Wrench className={cn(
          'size-4 mt-0.5 flex-shrink-0',
          issue.priority === 'critical' ? 'text-red-600' : 'text-blue-600'
        )} />
        <h4 className="font-medium text-xs line-clamp-2 flex-1">{issue.title}</h4>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-primary font-semibold">{issue.number}</span>
          <PriorityBadge priority={issue.priority} />
        </div>
        <div className="text-muted-foreground truncate">{issue.assignee || 'Unassigned'}</div>
        <div className="text-muted-foreground truncate">{issue.outlet}</div>
        {woCount > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground pt-0.5">
            <Wrench className="size-2.5" />
            <span>{woCount} WO{woCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
