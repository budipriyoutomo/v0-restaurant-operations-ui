'use client'

import { useState } from 'react'
import { Search, Filter, Plus, AlertTriangle, X, CheckSquare, CheckCircle2, Sparkles, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { Issue, IssueStatus } from '@/lib/types'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'

const PAGE_SIZE = 12

export function IssuesListPage() {
  const { issues, tasks, approvals, outlets, pics, createIssue, updateIssueStatus } = useIssueStore()

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.outlet.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = !filterPriority || issue.priority === filterPriority
    return matchesSearch && matchesPriority
  })

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedIssues = filteredIssues.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const priorities = ['critical', 'high', 'medium', 'low']

  const linkedTasks = selectedIssue ? tasks.filter((t) => t.issueId === selectedIssue.id) : []
  const linkedApproval = selectedIssue ? approvals.find((a) => a.issueId === selectedIssue.id) : undefined

  const handleCreate = async (input: Parameters<typeof createIssue>[0]) => {
    const created = await createIssue(input)
    const parts: string[] = ['Issue created.']
    if (created.taskIds.length > 0) parts.push('Task added to Task Center.')
    if (created.approvalId) parts.push('Approval request sent to Approval Center.')
    toast.success(parts.join(' '))
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPage(1)
  }

  const handlePriorityFilter = (p: string) => {
    setFilterPriority(filterPriority === p ? null : p)
    setPage(1)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Issues</h1>
          <p className="text-sm text-muted-foreground mt-1">Central issue management hub - all operational issues in one place</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> New Issue
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search issues by number, title, outlet..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors font-medium text-sm">
            <Filter className="size-4" />
            Filters
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 items-center">
            <span className="text-xs font-medium text-muted-foreground">Priority:</span>
            {priorities.map((p) => (
              <button
                key={p}
                onClick={() => handlePriorityFilter(p)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors capitalize',
                  filterPriority === p ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Issues count + pagination info */}
      {filteredIssues.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredIssues.length)} of {filteredIssues.length} issues
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-2 font-medium">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pagedIssues.length === 0 ? (
          <div className="lg:col-span-2 p-12 rounded-lg border border-border text-center">
            <p className="text-muted-foreground">No issues found</p>
          </div>
        ) : (
          pagedIssues.map((issue) => {
            const taskCount = tasks.filter((t) => t.issueId === issue.id).length
            const hasApproval = approvals.some((a) => a.issueId === issue.id)
            return (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                className={cn(
                  'p-5 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                  selectedIssue?.id === issue.id ? 'bg-primary/10 border-primary shadow-md' : 'bg-muted/20 border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-primary font-bold mb-1">{issue.number}</p>
                    <h3 className="font-semibold text-sm line-clamp-2">{issue.title}</h3>
                  </div>
                  <PriorityBadge priority={issue.priority} />
                </div>

                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mb-3">
                  <span className="bg-muted px-2 py-0.5 rounded">{issue.category}</span>
                  <span>{issue.outlet}</span>
                  {issue.slaBreach && (
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <AlertTriangle className="size-3" /> SLA Breach
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <StatusBadge status={issue.status} />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {taskCount > 0 && (
                      <span className="flex items-center gap-1"><CheckSquare className="size-3" /> {taskCount}</span>
                    )}
                    {hasApproval && (
                      <span className="flex items-center gap-1"><CheckCircle2 className="size-3" /></span>
                    )}
                    <span>{issue.createdDate}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="size-4" /> Prev
          </button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* Issue Detail Side Drawer */}
      {selectedIssue && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setSelectedIssue(null); setStatusDropdownOpen(false) }} />
          <div className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs text-primary font-bold mb-2">{selectedIssue.number}</p>
                  <h2 className="font-bold text-xl leading-snug pr-4">{selectedIssue.title}</h2>
                </div>
                <button onClick={() => { setSelectedIssue(null); setStatusDropdownOpen(false) }} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <StatusBadge status={selectedIssue.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Priority</span>
                  <PriorityBadge priority={selectedIssue.priority} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{selectedIssue.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Outlet</p>
                  <p className="text-sm font-semibold text-foreground">{selectedIssue.outlet}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Category</p>
                  <p className="text-sm font-semibold text-foreground">{selectedIssue.category}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Assigned To</p>
                  <p className="text-sm font-semibold text-foreground">{selectedIssue.assignee}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Status</p>
                  <p className="text-sm font-semibold text-foreground capitalize">{selectedIssue.status}</p>
                </div>
              </div>

              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Created Date</span>
                  <span className="text-sm font-mono">{selectedIssue.createdDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Due Date</span>
                  <span className="text-sm font-mono">{selectedIssue.dueDate}</span>
                </div>
              </div>

              {(linkedTasks.length > 0 || linkedApproval) && (
                <div className="space-y-3 pb-6 border-b border-border">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" /> Linked Records
                  </p>
                  {linkedTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 border border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckSquare className="size-3.5 text-primary flex-shrink-0" />
                        <span className="text-xs font-mono font-bold text-primary truncate">{task.number}</span>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))}
                  {linkedApproval && (
                    <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 border border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="size-3.5 text-amber-600 flex-shrink-0" />
                        <span className="text-xs font-mono font-bold text-primary truncate">{linkedApproval.number}</span>
                      </div>
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                        linkedApproval.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        linkedApproval.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {linkedApproval.status}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedIssue.slaBreach && (
                <div className="p-4 rounded-md bg-red-100/50 border border-red-200 space-y-2">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="size-4" /> SLA Breached
                  </p>
                  <p className="text-xs text-red-700">Immediate action required. This issue has exceeded its SLA target.</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-6 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Update Status</p>
                <div className="relative">
                  <button
                    onClick={() => setStatusDropdownOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-md border border-border text-sm font-semibold bg-background hover:bg-muted/50 transition-colors"
                  >
                    <StatusBadge status={selectedIssue.status} />
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                  {statusDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-md border border-border bg-popover shadow-md overflow-hidden">
                      {((['open', 'assigned', 'in-progress', 'waiting', 'resolved', 'closed'] as IssueStatus[])).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            updateIssueStatus(selectedIssue.id, s)
                            setSelectedIssue((prev) => prev ? { ...prev, status: s } : null)
                            setStatusDropdownOpen(false)
                            toast.success('Status updated.')
                          }}
                          className={cn(
                            'w-full flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors',
                            selectedIssue.status === s && 'bg-muted'
                          )}
                        >
                          <StatusBadge status={s} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <CreateIssueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        outlets={outlets.map((o) => o.name)}
        assignees={['Unassigned', ...pics.map((p) => p.name)]}
        onSubmit={handleCreate}
      />
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn(
      'text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap',
      priority === 'critical' ? 'bg-red-100 text-red-700' :
      priority === 'high' ? 'bg-orange-100 text-orange-700' :
      priority === 'medium' ? 'bg-amber-100 text-amber-700' :
      'bg-green-100 text-green-700'
    )}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', assigned: 'Assigned', 'in-progress': 'In Progress',
  waiting: 'Waiting', resolved: 'Resolved', closed: 'Closed',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-xs font-semibold px-2 py-1 rounded-full',
      status === 'open' ? 'bg-blue-100 text-blue-700' :
      status === 'assigned' ? 'bg-purple-100 text-purple-700' :
      status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
      status === 'waiting' ? 'bg-cyan-100 text-cyan-700' :
      status === 'resolved' ? 'bg-green-100 text-green-700' :
      'bg-gray-100 text-gray-700'
    )}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
