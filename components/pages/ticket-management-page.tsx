'use client'

import { useState } from 'react'
import { Search, Filter, Plus, Clock, Eye, AlertCircle, CheckCircle2, Loader2, Archive, MessageSquare, Pin } from 'lucide-react'
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

  const filteredTickets = operationalTickets.filter(ticket => {
    const matchSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchPriority = !filterPriority || ticket.priority === filterPriority
    const matchStatus = !filterStatus || ticket.status === filterStatus
    return matchSearch && matchPriority && matchStatus
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ticket Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Operational and service tickets</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="size-3.5" /> New Ticket
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">OPEN TICKETS</p>
          <p className="text-lg font-bold">12</p>
          <p className="text-[10px] text-muted-foreground mt-1">+2 this week</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">IN PROGRESS</p>
          <p className="text-lg font-bold text-blue-600">3</p>
          <p className="text-[10px] text-muted-foreground mt-1">-1 from yesterday</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">RESOLVED</p>
          <p className="text-lg font-bold text-success">28</p>
          <p className="text-[10px] text-muted-foreground mt-1">this month</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">AVG RESOLUTION</p>
          <p className="text-lg font-bold">2.3d</p>
          <p className="text-[10px] text-muted-foreground mt-1">↓ 12% vs last month</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">CRITICAL</p>
          <p className="text-lg font-bold text-destructive">1</p>
          <p className="text-[10px] text-muted-foreground mt-1">requires attention</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors">
          <Filter className="size-4" />
          <span className="text-sm">Filter</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ticket List */}
        <div className="lg:col-span-2 space-y-2">
          {filteredTickets.length === 0 ? (
            <div className="p-8 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                  selectedTicket?.id === ticket.id
                    ? 'bg-primary/10 border-primary shadow-md'
                    : 'bg-muted/20 border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold text-primary">{ticket.id}</span>
                      <PriorityBadge priority={ticket.priority} />
                      {ticket.priority === 'critical' && <Pin className="size-3 text-destructive" />}
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2">{ticket.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground">{ticket.outlet}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{ticket.category}</span>
                      {ticket.attachments > 0 && (
                        <>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <MessageSquare className="size-3" />
                            {ticket.attachments}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status={ticket.status} />
                    <p className="text-[10px] text-muted-foreground mt-2">{ticket.created}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedTicket && (
          <div className="lg:col-span-1 p-4 rounded-lg border border-border bg-muted/30 max-h-[600px] overflow-y-auto">
            <div className="space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold text-primary">{selectedTicket.id}</span>
                  <button className="p-1 hover:bg-muted rounded transition-colors">
                    <Eye className="size-4 text-muted-foreground" />
                  </button>
                </div>
                <h2 className="font-bold text-sm">{selectedTicket.title}</h2>
              </div>

              {/* Status and Priority */}
              <div className="p-2.5 rounded-md bg-muted/50 border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Status</span>
                  <StatusBadge status={selectedTicket.status} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Priority</span>
                  <PriorityBadge priority={selectedTicket.priority} />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2.5 text-[11px]">
                <div>
                  <p className="text-muted-foreground mb-1">Description</p>
                  <p className="text-foreground leading-relaxed">{selectedTicket.description}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Outlet</p>
                  <p className="text-foreground font-semibold">{selectedTicket.outlet}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Category</p>
                  <p className="text-foreground font-semibold">{selectedTicket.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Assigned To</p>
                  <p className="text-foreground font-semibold">{selectedTicket.assignee}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground mb-1">Created</p>
                    <p className="text-foreground text-[10px] font-mono">{selectedTicket.created}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Due</p>
                    <p className="text-foreground text-[10px] font-mono">{selectedTicket.dueDate}</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedTicket.tags.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 text-[10px]">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTicket.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded-full bg-primary/20 text-primary text-[9px] font-semibold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedTicket.attachments > 0 && (
                <div className="p-2 rounded-md bg-muted/50 border border-border">
                  <p className="text-[10px] text-muted-foreground">
                    📎 {selectedTicket.attachments} attachment{selectedTicket.attachments > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <button className="flex-1 px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors">
                  Update
                </button>
                <button className="flex-1 px-2 py-1.5 rounded-md bg-muted border border-border text-muted-foreground text-[11px] font-semibold hover:bg-muted/80 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
