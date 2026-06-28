'use client'

import { useState } from 'react'
import { Monitor, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { Issue, IssueStatus } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'

const COLUMNS: { status: IssueStatus; label: string; color: string }[] = [
  { status: 'open',        label: 'Open',        color: 'border-t-blue-500' },
  { status: 'in-progress', label: 'In Progress',  color: 'border-t-amber-500' },
  { status: 'waiting',     label: 'Waiting',      color: 'border-t-cyan-500' },
  { status: 'resolved',    label: 'Resolved',     color: 'border-t-emerald-500' },
]

export function ITSupportPage() {
  const { issues, outlets, pics, createIssue, updateIssueStatus } = useIssueStore()
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Issue | null>(null)

  const tickets = issues.filter(i => i.category === 'IT Support')

  const stats = {
    total:    tickets.length,
    open:     tickets.filter(t => t.status === 'open').length,
    critical: tickets.filter(t => t.priority === 'critical').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">IT Support</h1>
          <p className="text-sm text-muted-foreground mt-1">POS systems, network issues, device management, and IT ticket tracking</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> New IT Ticket
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Tickets', value: stats.total,    color: 'text-foreground'   },
          { label: 'Open',          value: stats.open,     color: 'text-blue-600'     },
          { label: 'Critical',      value: stats.critical, color: 'text-destructive'  },
          { label: 'Resolved',      value: stats.resolved, color: 'text-success'      },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-lg border border-border bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
          <Monitor className="size-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No IT tickets</p>
          <p className="text-xs text-muted-foreground mt-1">Create a new ticket to report an IT issue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto">
          {COLUMNS.map(col => {
            const colTickets = tickets.filter(t =>
              t.status === col.status
            )
            return (
              <div key={col.status} className="min-w-[200px]">
                <div className={cn('rounded-t-lg border-t-2 bg-muted/20 px-3 py-2 border-x border-border', col.color)}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{col.label}</span>
                    <span className="text-xs font-bold text-muted-foreground">{colTickets.length}</span>
                  </div>
                </div>
                <div className="border border-t-0 border-border rounded-b-lg p-2 space-y-2 min-h-[120px] bg-background">
                  {colTickets.map(ticket => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelected(ticket)}
                      className="w-full text-left p-2.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{ticket.number}</span>
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      <p className="text-xs font-semibold line-clamp-2">{ticket.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{ticket.outlet}</p>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-background rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono text-muted-foreground mb-1">{selected.number}</p>
                <h2 className="text-base font-bold">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none mt-1">×</button>
            </div>
            {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Outlet</p><p className="font-medium">{selected.outlet}</p></div>
              <div><p className="text-xs text-muted-foreground">Assignee</p><p className="font-medium">{selected.assignee || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Priority</p><PriorityBadge priority={selected.priority} /></div>
              <div><p className="text-xs text-muted-foreground">Due</p><p className="font-medium">{selected.dueDate || '—'}</p></div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Update Status</label>
              <select
                value={selected.status}
                onChange={e => {
                  const s = e.target.value as IssueStatus
                  updateIssueStatus(selected.id, s)
                  setSelected({ ...selected, status: s })
                }}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <StatusBadge status={selected.status} />
              <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-md bg-muted text-sm font-medium hover:bg-accent transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultCategory="IT Support"
        outlets={outlets.map(o => o.name)}
        assignees={['Unassigned', ...pics.map(p => p.name)]}
        onSubmit={async (input) => { await createIssue(input) }}
      />
    </div>
  )
}
