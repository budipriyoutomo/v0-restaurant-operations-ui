'use client'

import { useState } from 'react'
import { Package, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { useMyOutlets } from '@/lib/permissions'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'

type Tab = 'requests' | 'approvals'

const rp = (n: number) => 'Rp ' + (n ?? 0).toLocaleString('id-ID')

// ---------------------------------------------------------------------------
// Asset Purchase — requests to buy/replace an asset and their approvals.
// Physical assets live in CMMS (Todo-Pilot §6); this page is the purchasing
// side only.
// ---------------------------------------------------------------------------
export function AssetsPage() {
  const { issues, approvals, pics, createIssue } = useIssueStore()
  // Outlet pickers must only offer outlets this user may write to (Tier 4).
  const myOutlets = useMyOutlets()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<Tab>('requests')

  const requests   = issues.filter((i) => i.category === 'Asset Purchase')
  const approvalsA = approvals.filter((a) => a.type === 'asset-purchase')

  const purchaseStats = {
    total:    requests.length,
    pending:  approvalsA.filter((a) => a.status === 'pending').length,
    approved: approvalsA.filter((a) => a.status === 'approved').length,
    rejected: approvalsA.filter((a) => a.status === 'rejected').length,
  }

  const tabDefs: { id: Tab; label: string; count: number }[] = [
    { id: 'requests',        label: 'Asset Requests',  count: requests.length },
    { id: 'approvals',       label: 'Approvals',        count: approvalsA.length },
  ]

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Purchase</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Requests to buy or replace an asset, and their approvals. Registered equipment, work orders and PM are in CMMS.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> New Asset Request
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Requests"   value={purchaseStats.total}    color="text-foreground" />
        <StatCard label="Pending Approval" value={purchaseStats.pending}  color="text-amber-600"  />
        <StatCard label="Approved"         value={purchaseStats.approved} color="text-success"    />
        <StatCard label="Rejected"         value={purchaseStats.rejected} color="text-destructive" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabDefs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Tab: Asset Requests */}
      {tab === 'requests' && (
        requests.length === 0 ? (
          <EmptyState icon={Package} message="No asset requests" hint="Submit a request to purchase or replace an asset." />
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-muted-foreground">{r.number}</span>
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <p className="text-sm font-semibold">{r.title}</p>
                  {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>{r.outlet}</span>
                    <span>·</span>
                    <span>{r.assignee || 'Unassigned'}</span>
                    {r.dueDate && <><span>·</span><span>Needed by: {r.dueDate}</span></>}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab: Approvals */}
      {tab === 'approvals' && (
        approvalsA.length === 0 ? (
          <EmptyState icon={CheckCircle2} message="No asset purchase approvals" hint="Approvals appear when an asset request is submitted with approval enabled." />
        ) : (
          <div className="space-y-2">
            {approvalsA.map((a) => (
              <div key={a.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-muted-foreground">{a.number}</span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-semibold text-muted-foreground">asset</span>
                  </div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span>{a.outlet}</span>
                    <span>·</span>
                    <span>By: {a.requester}</span>
                    {a.amount != null && <><span>·</span><span className="font-semibold text-foreground">{rp(a.amount)}</span></>}
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
        defaultCategory="Asset Purchase"
        outlets={myOutlets.map((o) => o.name)}
        assignees={['Unassigned', ...pics.map((p) => p.name)]}
        onSubmit={async (input) => { await createIssue(input) }}
      />

    </div>
  )
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, message, hint }: { icon: React.ElementType; message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
      <Icon className="size-8 text-muted-foreground mb-3" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{hint}</p>
    </div>
  )
}
