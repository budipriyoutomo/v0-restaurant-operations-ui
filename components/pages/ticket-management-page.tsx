'use client'

import { useState } from 'react'
import { Search, Filter, Plus, Clock, Eye, AlertCircle, CheckCircle2, Loader2, Archive, MessageSquare, Pin } from 'lucide-react'
import { CreateTicketDialog } from '@/components/dialogs/create-ticket-dialog'
import { operationalTickets } from '@/lib/data'
import { cn } from '@/lib/utils'

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn(
      'px-2 py-0.5 rounded-full text-[10px] font-semibold',
      priority === 'critical' && 'bg-destructive/20 text-destructive',
      priority === 'high' && 'bg-orange-500/20 text-orange-600',
      priority === 'medium' && 'bg-yellow-500/20 text-yellow-700',
      priority === 'low' && 'bg-blue-500/20 text-blue-600',
    )}>
      {priority.toUpperCase()}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {status === 'open' && <AlertCircle className="size-3.5 text-muted-foreground" />}
      {status === 'in_progress' && <Loader2 className="size-3.5 text-blue-500 animate-spin" />}
      {status === 'resolved' && <CheckCircle2 className="size-3.5 text-success" />}
      <span className={cn(
        'text-[11px] font-semibold',
        status === 'open' && 'text-muted-foreground',
        status === 'in_progress' && 'text-blue-600',
        status === 'resolved' && 'text-success',
      )}>
        {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  )
}

export function TicketManagementPage() {
  const [selectedTicket, setSelectedTicket] = useState<typeof operationalTickets[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const filteredTickets = operationalTickets.filter(ticket => {
    const matchSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchPriority = !filterPriority || ticket.priority === filterPriority
    const matchStatus = !filterStatus || ticket.status === filterStatus
    return matchSearch && matchPriority && matchStatus
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ticket Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Operational and service tickets</p>
        </div>
        <button 
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> New Ticket
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wide">Open Tickets</p>
          <p className="text-2xl font-bold">12</p>
          <p className="text-xs text-muted-foreground mt-2">+2 this week</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wide">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">3</p>
          <p className="text-xs text-muted-foreground mt-2">-1 from yesterday</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wide">Resolved</p>
          <p className="text-2xl font-bold text-success">28</p>
          <p className="text-xs text-muted-foreground mt-2">this month</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wide">Avg Resolution</p>
          <p className="text-2xl font-bold">2.3d</p>
          <p className="text-xs text-muted-foreground mt-2">↓ 12% vs last month</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wide">Critical</p>
          <p className="text-2xl font-bold text-destructive">1</p>
          <p className="text-xs text-muted-foreground mt-2">requires attention</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors font-medium text-sm">
          <Filter className="size-4" />
          Filter
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-2 space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="p-12 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  'p-4 rounded-lg border cursor-pointer transition-all',
                  selectedTicket?.id === ticket.id
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-muted/20 border-border hover:bg-muted/40 hover:shadow-sm'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-primary">{ticket.id}</span>
                      <PriorityBadge priority={ticket.priority} />
                      {ticket.priority === 'critical' && <Pin className="size-3.5 text-destructive" />}
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2">{ticket.title}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{ticket.outlet}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{ticket.category}</span>
                      {ticket.attachments > 0 && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="size-3.5" />
                            {ticket.attachments}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status={ticket.status} />
                    <p className="text-xs text-muted-foreground mt-2">{ticket.created}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedTicket && (
          <div className="lg:col-span-1 p-5 rounded-lg border border-border bg-muted/30 max-h-[700px] overflow-y-auto">
            <div className="space-y-5">
              {/* Header */}
              <div className="pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-primary">{selectedTicket.id}</span>
                  <button className="p-1.5 hover:bg-muted rounded transition-colors">
                    <Eye className="size-4 text-muted-foreground" />
                  </button>
                </div>
                <h2 className="font-bold text-base">{selectedTicket.title}</h2>
              </div>

              {/* Status and Priority */}
              <div className="p-3 rounded-md bg-muted/50 border border-border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-medium">Status</span>
                  <StatusBadge status={selectedTicket.status} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-medium">Priority</span>
                  <PriorityBadge priority={selectedTicket.priority} />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3.5 text-xs">
                <div>
                  <p className="text-muted-foreground font-medium mb-1.5">Description</p>
                  <p className="text-foreground leading-relaxed text-xs">{selectedTicket.description}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1.5">Outlet</p>
                  <p className="text-foreground font-semibold">{selectedTicket.outlet}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1.5">Category</p>
                  <p className="text-foreground font-semibold">{selectedTicket.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1.5">Assigned To</p>
                  <p className="text-foreground font-semibold">{selectedTicket.assignee}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Created</p>
                    <p className="text-foreground text-[10px] font-mono">{selectedTicket.created}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Due</p>
                    <p className="text-foreground text-[10px] font-mono">{selectedTicket.dueDate}</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedTicket.tags.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-muted-foreground font-medium mb-2.5 text-xs">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTicket.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-semibold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedTicket.attachments > 0 && (
                <div className="p-3 rounded-md bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground font-medium">
                    📎 {selectedTicket.attachments} attachment{selectedTicket.attachments > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 pt-4 border-t border-border">
                <button className="flex-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                  Update
                </button>
                <button className="flex-1 px-3 py-2 rounded-md bg-muted border border-border text-muted-foreground text-xs font-semibold hover:bg-muted/80 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(data) => {
          console.log('[v0] New ticket created:', data)
        }}
      />
    </div>
  )
}
