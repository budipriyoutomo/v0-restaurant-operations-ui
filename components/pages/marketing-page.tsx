'use client'

import { useState } from 'react'
import { Megaphone, Plus, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'

export function MarketingPage() {
  const { issues, approvals, outlets, pics, createIssue } = useIssueStore()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'campaigns' | 'approvals'>('campaigns')

  const campaigns   = issues.filter(i => i.category === 'Marketing')
  const approvalsM  = approvals.filter(a => a.type === 'marketing')

  const stats = {
    total:    campaigns.length,
    pending:  approvalsM.filter(a => a.status === 'pending').length,
    active:   campaigns.filter(c => c.status === 'in-progress' || c.status === 'assigned').length,
    approved: approvalsM.filter(a => a.status === 'approved').length,
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing</h1>
          <p className="text-sm text-muted-foreground mt-1">Campaign management, promotions, and marketing initiative approvals</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> New Campaign Request
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Campaigns"  value={stats.total}    color="text-foreground" />
        <StatCard label="Pending Approval" value={stats.pending}  color="text-amber-600"  />
        <StatCard label="Active"           value={stats.active}   color="text-blue-600"   />
        <StatCard label="Approved"         value={stats.approved} color="text-success"     />
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['campaigns', 'approvals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'campaigns' ? `Campaigns (${campaigns.length})` : `Approvals (${approvalsM.length})`}
          </button>
        ))}
      </div>

      {tab === 'campaigns' && (
        campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
            <Megaphone className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No campaigns yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a new campaign request to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => (
              <div key={c.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-muted-foreground">{c.number}</span>
                    <PriorityBadge priority={c.priority} />
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <TrendingUp className="size-3" /> Marketing
                    </span>
                  </div>
                  <p className="text-sm font-semibold">{c.title}</p>
                  {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>{c.outlet}</span>
                    <span>·</span>
                    <span>{c.assignee || 'Unassigned'}</span>
                    {c.dueDate && <><span>·</span><span>By: {c.dueDate}</span></>}
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'approvals' && (
        approvalsM.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
            <CheckCircle2 className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No marketing approvals</p>
            <p className="text-xs text-muted-foreground mt-1">Approvals appear when a campaign is submitted with approval enabled.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {approvalsM.map(a => (
              <div key={a.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-muted-foreground">{a.number}</span>
                  </div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span>{a.outlet}</span>
                    <span>·</span>
                    <span>By: {a.requester}</span>
                    {a.amount && <><span>·</span><span className="font-semibold text-foreground">{a.amount}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {a.status === 'pending'  && <Clock className="size-4 text-amber-500" />}
                  {a.status === 'approved' && <CheckCircle2 className="size-4 text-success" />}
                  {a.status === 'rejected' && <XCircle className="size-4 text-destructive" />}
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultCategory="Marketing"
        outlets={outlets.map(o => o.name)}
        assignees={['Unassigned', ...pics.map(p => p.name)]}
        onSubmit={async (input) => { await createIssue(input) }}
      />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}
