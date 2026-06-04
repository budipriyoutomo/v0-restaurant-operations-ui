'use client'

import { useState } from 'react'
import { Search, Filter, Plus, AlertCircle, Clock, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Issue {
  id: string
  number: string
  title: string
  description: string
  outlet: string
  category: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'assigned' | 'in-progress' | 'waiting' | 'resolved' | 'closed'
  assignee: string
  dueDate: string
  createdDate: string
  slaBreach: boolean
  linkedModule?: string
}

const mockIssues: Issue[] = [
  {
    id: 'iss-1',
    number: 'ISS-2026-00145',
    title: 'Kitchen AC System Breakdown',
    description: 'Main air conditioning unit in kitchen area not functioning',
    outlet: 'KL Central',
    category: 'Maintenance',
    priority: 'critical',
    status: 'in-progress',
    assignee: 'Ahmad Razif',
    dueDate: '2026-06-04',
    createdDate: '2026-06-03',
    slaBreach: false,
    linkedModule: 'WO-0041'
  },
  {
    id: 'iss-2',
    number: 'ISS-2026-00142',
    title: 'POS System Network Issue',
    description: 'POS terminals losing network connectivity intermittently',
    outlet: 'KLCC',
    category: 'IT Support',
    priority: 'critical',
    status: 'assigned',
    assignee: 'Raj Kumar',
    dueDate: '2026-06-04',
    createdDate: '2026-06-03',
    slaBreach: true,
    linkedModule: 'IT-0089'
  },
  {
    id: 'iss-3',
    number: 'ISS-2026-00138',
    title: 'Food Safety Compliance Finding',
    description: 'Cold storage temperature deviation during last audit',
    outlet: 'Subang',
    category: 'Compliance',
    priority: 'high',
    status: 'open',
    assignee: 'Unassigned',
    dueDate: '2026-06-05',
    createdDate: '2026-06-02',
    slaBreach: false,
    linkedModule: 'TR-0021'
  },
  {
    id: 'iss-4',
    number: 'ISS-2026-00135',
    title: 'Staff Training Program - New Menu',
    description: 'Training required for 5 new menu items launching next week',
    outlet: 'Bangsar',
    category: 'Training',
    priority: 'high',
    status: 'assigned',
    assignee: 'Sarah Johnson',
    dueDate: '2026-06-07',
    createdDate: '2026-06-01',
    slaBreach: false,
    linkedModule: 'TRN-0156'
  },
  {
    id: 'iss-5',
    number: 'ISS-2026-00132',
    title: 'Procurement - Kitchen Equipment',
    description: 'Replace aging food prep station and order new utensils',
    outlet: 'KL Central',
    category: 'Procurement',
    priority: 'medium',
    status: 'waiting',
    assignee: 'Priya Sharma',
    dueDate: '2026-06-15',
    createdDate: '2026-05-28',
    slaBreach: false,
    linkedModule: 'PR-0019'
  },
  {
    id: 'iss-6',
    number: 'ISS-2026-00128',
    title: 'Marketing Campaign Launch',
    description: 'Approve and launch mid-year promotional campaign',
    outlet: 'All Outlets',
    category: 'Marketing',
    priority: 'medium',
    status: 'open',
    assignee: 'Unassigned',
    dueDate: '2026-06-10',
    createdDate: '2026-05-25',
    slaBreach: false,
    linkedModule: 'MKT-0067'
  },
]

export function IssuesListPage() {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const filteredIssues = mockIssues.filter((issue) => {
    const matchesSearch = issue.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.outlet.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = !filterPriority || issue.priority === filterPriority
    const matchesStatus = !filterStatus || issue.status === filterStatus
    const matchesCategory = !filterCategory || issue.category === filterCategory
    return matchesSearch && matchesPriority && matchesStatus && matchesCategory
  })

  const categories = ['Maintenance', 'IT Support', 'Compliance', 'Training', 'Procurement', 'Marketing', 'QA & Compliance']
  const statuses = ['open', 'assigned', 'in-progress', 'waiting', 'resolved', 'closed']
  const priorities = ['critical', 'high', 'medium', 'low']

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Issues</h1>
          <p className="text-sm text-muted-foreground mt-1">Central issue management hub - all operational issues in one place</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors font-medium text-sm">
            <Filter className="size-4" />
            Filters
          </button>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 items-center">
            <span className="text-xs font-medium text-muted-foreground">Priority:</span>
            {priorities.map((p) => (
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
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues List */}
        <div className="lg:col-span-2 space-y-2">
          {filteredIssues.length === 0 ? (
            <div className="p-12 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">No issues found</p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                className={cn(
                  'p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
                  selectedIssue?.id === issue.id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted/20 border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-primary font-bold mb-1">{issue.number}</p>
                    <h3 className="font-semibold text-sm line-clamp-2">{issue.title}</h3>
                  </div>
                  <PriorityBadge priority={issue.priority} />
                </div>

                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mb-2">
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
                  <span className="text-muted-foreground">{issue.createdDate}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Issue Detail Panel */}
        {selectedIssue && (
          <div className="lg:col-span-1 p-5 rounded-lg border border-border bg-muted/30 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="space-y-5">
              {/* Header */}
              <div className="pb-4 border-b border-border">
                <p className="font-mono text-xs text-primary font-bold mb-1">{selectedIssue.number}</p>
                <h2 className="font-bold text-base leading-snug">{selectedIssue.title}</h2>
              </div>

              {/* Status & Priority */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <StatusBadge status={selectedIssue.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Priority</span>
                  <PriorityBadge priority={selectedIssue.priority} />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Description</p>
                  <p className="text-foreground leading-relaxed">{selectedIssue.description}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Outlet</p>
                  <p className="text-foreground font-semibold">{selectedIssue.outlet}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Category</p>
                  <p className="text-foreground font-semibold">{selectedIssue.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Assigned To</p>
                  <p className="text-foreground font-semibold">{selectedIssue.assignee}</p>
                </div>
                {selectedIssue.linkedModule && (
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Linked Module</p>
                    <p className="text-foreground font-mono font-semibold text-primary">{selectedIssue.linkedModule}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Created</p>
                    <p className="text-foreground text-[10px] font-mono">{selectedIssue.createdDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Due</p>
                    <p className="text-foreground text-[10px] font-mono">{selectedIssue.dueDate}</p>
                  </div>
                </div>
              </div>

              {/* SLA Timer */}
              {selectedIssue.slaBreach && (
                <div className="p-3 rounded-md bg-red-100/50 border border-red-200">
                  <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="size-3" /> SLA Breached - Immediate Action Required
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <button className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                  Update Status
                </button>
                <button className="w-full px-3 py-2 rounded-md border border-border text-muted-foreground text-xs font-semibold hover:bg-muted/50 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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

function StatusBadge({ status }: { status: string }) {
  const statusLabels: Record<string, string> = {
    open: 'Open',
    assigned: 'Assigned',
    'in-progress': 'In Progress',
    waiting: 'Waiting',
    resolved: 'Resolved',
    closed: 'Closed'
  }
  
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
      {statusLabels[status] || status}
    </span>
  )
}
