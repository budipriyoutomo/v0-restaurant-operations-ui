'use client'

import { useState } from 'react'
import { Search, Filter, Plus, Clock, Paperclip, MessageSquare, MoreHorizontal } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { tickets } from '@/lib/data'
import { cn } from '@/lib/utils'

const columns = [
  { id: 'open', label: 'Open', color: 'bg-blue-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-warning' },
  { id: 'resolved', label: 'Resolved', color: 'bg-success' },
]

export function TicketsPage() {
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [selectedTicket, setSelectedTicket] = useState<typeof tickets[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.outlet.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-border bg-background flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="relative flex-1 max-w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="w-full pl-8 pr-3 h-7 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors">
            <Filter className="size-3" /> Filter
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={cn('px-3 h-7 text-xs transition-colors', view === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent')}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('table')}
              className={cn('px-3 h-7 text-xs transition-colors', view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent')}
            >
              Table
            </button>
          </div>
          <button className="flex items-center gap-1.5 px-3 h-7 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            <Plus className="size-3.5" /> New Ticket
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <div className="flex-1 overflow-auto p-4">
          {view === 'kanban' ? (
            <div className="flex gap-4 h-full">
              {columns.map((col) => {
                const colTickets = filtered.filter((t) => t.status === col.id)
                return (
                  <div key={col.id} className="w-72 flex-shrink-0 flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('size-2 rounded-full', col.color)} />
                      <span className="text-xs font-semibold">{col.label}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{colTickets.length}</span>
                    </div>
                    {colTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border bg-card shadow-sm hover:shadow-md transition-all',
                          selectedTicket?.id === ticket.id ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                        )}
                      >
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <span className="text-[11px] font-mono text-muted-foreground">{ticket.id}</span>
                          <PriorityBadge priority={ticket.priority as 'critical' | 'high' | 'medium' | 'low'} />
                        </div>
                        <p className="text-xs font-medium text-foreground leading-relaxed mb-2">{ticket.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">{ticket.outlet}</span>
                          <span>·</span>
                          <span>{ticket.category}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="size-3" />
                            <span className={cn(ticket.slaHours <= 2 ? 'text-destructive font-medium' : ticket.slaHours <= 4 ? 'text-warning' : '')}>
                              {ticket.slaHours}h SLA
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="size-3 text-muted-foreground" />
                            <div className="size-5 rounded-full bg-muted text-[9px] font-bold flex items-center justify-center">
                              {ticket.assignee === 'Unassigned' ? '?' : ticket.assignee.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                    {colTickets.length === 0 && (
                      <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                        No tickets
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Title</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Outlet</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Priority</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Assignee</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">SLA</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                    >
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{ticket.id}</td>
                      <td className="px-4 py-2.5 font-medium max-w-48">
                        <p className="truncate">{ticket.title}</p>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{ticket.outlet}</td>
                      <td className="px-4 py-2.5">
                        <PriorityBadge priority={ticket.priority as 'critical' | 'high' | 'medium' | 'low'} />
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={ticket.status as 'open' | 'in_progress' | 'resolved'} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{ticket.assignee}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('font-medium', ticket.slaHours <= 2 ? 'text-destructive' : ticket.slaHours <= 4 ? 'text-warning' : 'text-muted-foreground')}>
                          {ticket.slaHours}h
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button className="size-6 rounded flex items-center justify-center hover:bg-accent text-muted-foreground">
                          <MoreHorizontal className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ticket detail panel */}
        {selectedTicket && (
          <div className="w-80 border-l border-border bg-card flex-shrink-0 overflow-y-auto p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] font-mono text-muted-foreground">{selectedTicket.id}</p>
                <h3 className="text-sm font-semibold mt-0.5 leading-snug">{selectedTicket.title}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none ml-2">×</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Priority</span>
                <PriorityBadge priority={selectedTicket.priority as 'critical' | 'high' | 'medium' | 'low'} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selectedTicket.status as 'open' | 'in_progress' | 'resolved'} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Outlet</span>
                <span className="font-medium">{selectedTicket.outlet}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{selectedTicket.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assignee</span>
                <span className="font-medium">{selectedTicket.assignee}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">SLA Remaining</span>
                <span className={cn('font-semibold', selectedTicket.slaHours <= 2 ? 'text-destructive' : selectedTicket.slaHours <= 4 ? 'text-warning' : 'text-success')}>
                  {selectedTicket.slaHours}h
                </span>
              </div>

              <div className="border-t border-border pt-3 mt-3">
                <p className="font-semibold mb-1.5">Description</p>
                <p className="text-muted-foreground leading-relaxed">{selectedTicket.description}</p>
              </div>

              <div className="border-t border-border pt-3">
                <p className="font-semibold mb-2">Activity Timeline</p>
                <div className="space-y-2">
                  {[
                    { event: 'Ticket created', time: selectedTicket.created, user: 'System' },
                    { event: 'Assigned to technician', time: '30 mins ago', user: selectedTicket.assignee !== 'Unassigned' ? selectedTicket.assignee : '—' },
                    { event: 'Status updated', time: '15 mins ago', user: selectedTicket.assignee !== 'Unassigned' ? selectedTicket.assignee : '—' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <div className="size-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                        {i < 2 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-2">
                        <p className="font-medium">{item.event}</p>
                        <p className="text-muted-foreground">{item.time} · {item.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="font-semibold mb-2">Attachments</p>
                <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/40">
                  <Paperclip className="size-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">photo_evidence_1.jpg</span>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="font-semibold mb-2">Comments (2)</p>
                <div className="space-y-2">
                  <div className="p-2 rounded-md bg-muted/40">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">AR</div>
                      <span className="font-medium">Ahmad Razif</span>
                      <span className="text-muted-foreground ml-auto">1h ago</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">On my way to inspect. ETA 15 mins.</p>
                  </div>
                </div>
                <textarea
                  placeholder="Add a comment..."
                  className="w-full mt-2 p-2 rounded-md border border-border bg-background text-xs resize-none h-16 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
