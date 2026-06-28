'use client'

import { useState } from 'react'
import { ShoppingCart, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { ApprovalRequest, Issue } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'

export function ProcurementPage() {
  const { issues, approvals, outlets, pics, createIssue } = useIssueStore()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'requests' | 'approvals'>('requests')

  const requests   = issues.filter(i => i.category === 'Procurement')
  const approvalsP = approvals.filter(a => a.type === 'procurement')

  const stats = {
    total:    requests.length,
    pending:  approvalsP.filter(a => a.status === 'pending').length,
    approved: approvalsP.filter(a => a.status === 'approved').length,
    rejected: approvalsP.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Procurement</h1>
          <p className="text-sm text-muted-foreground mt-1">Purchase requests, vendor management, and approval tracking</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> New Purchase Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Requests"    value={stats.total}    color="text-foreground"  />
        <StatCard label="Pending Approval"  value={stats.pending}  color="text-amber-600"   />
        <StatCard label="Approved"          value={stats.approved} color="text-success"      />
        <StatCard label="Rejected"          value={stats.rejected} color="text-destructive"  />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['requests', 'approvals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'requests' ? `Purchase Requests (${requests.length})` : `Approvals (${approvalsP.length})`}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <IssueList issues={requests} emptyLabel="No purchase requests" emptyHint='Create a new request to get started.' />
      )}

      {tab === 'approvals' && (
        <ApprovalList approvals={approvalsP} />
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultCategory="Procurement"
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

function IssueList({ issues, emptyLabel, emptyHint }: {
  issues: Issue[]
  emptyLabel: string
  emptyHint: string
}) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
        <ShoppingCart className="size-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">{emptyLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">{emptyHint}</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {issues.map((issue: Issue) => (
        <div key={issue.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-muted-foreground">{issue.number}</span>
              <PriorityBadge priority={issue.priority} />
            </div>
            <p className="text-sm font-semibold">{issue.title}</p>
            {issue.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{issue.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span>{issue.outlet}</span>
              <span>·</span>
              <span>{issue.assignee || 'Unassigned'}</span>
              {issue.dueDate && <><span>·</span><span>Due: {issue.dueDate}</span></>}
            </div>
          </div>
          <StatusBadge status={issue.status} />
        </div>
      ))}
    </div>
  )
}

function ApprovalList({ approvals }: { approvals: ApprovalRequest[] }) {
  if (approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
        <CheckCircle2 className="size-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">No procurement approvals</p>
        <p className="text-xs text-muted-foreground mt-1">Approvals appear here when a procurement issue is created with approval enabled.</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {approvals.map((a: ApprovalRequest) => (
        <div key={a.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-muted-foreground">{a.number}</span>
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-semibold capitalize text-muted-foreground">{a.type}</span>
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
}
