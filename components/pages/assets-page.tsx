'use client'

import { useState } from 'react'
import { Package, Plus, Clock, CheckCircle2, XCircle, Wrench, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { Asset, AssetStatus, WorkOrder } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'
import { CreateAssetDialog } from '@/components/dialogs/create-asset-dialog'

type Tab = 'requests' | 'approvals' | 'physical-assets'

// ---------------------------------------------------------------------------
// Asset status badge — colour-coded per CMMS convention
// ---------------------------------------------------------------------------
function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const config: Record<AssetStatus, { label: string; className: string }> = {
    operational: { label: 'Operational', className: 'bg-success/15 text-success' },
    warning:     { label: 'Warning',     className: 'bg-warning/15 text-warning' },
    maintenance: { label: 'Maintenance', className: 'bg-primary/15 text-primary' },
    critical:    { label: 'Critical',    className: 'bg-destructive/15 text-destructive' },
  }
  const c = config[status]
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold', c.className)}>
      {c.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Inline work-order list inside an expanded asset row
// ---------------------------------------------------------------------------
function LinkedWorkOrders({ workOrders }: { workOrders: WorkOrder[] }) {
  if (workOrders.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2 text-center">No work orders for this asset.</p>
    )
  }
  return (
    <div className="space-y-1.5">
      {workOrders.map((wo) => (
        <div key={wo.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border text-xs">
          <span className="font-mono text-muted-foreground w-28 flex-shrink-0">{wo.number}</span>
          <span className="flex-1 font-medium truncate">{wo.title}</span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0',
            wo.type === 'preventive' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            {wo.type}
          </span>
          <PriorityBadge priority={wo.priority} />
          <StatusBadge status={wo.status} />
          <span className="text-muted-foreground flex-shrink-0 w-24 text-right">{wo.assignee}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single asset card
// ---------------------------------------------------------------------------
function AssetCard({ asset, workOrders }: { asset: Asset; workOrders: WorkOrder[] }) {
  const [expanded, setExpanded] = useState(false)
  const woCount = workOrders.length
  const isPMOverdue = asset.nextPM && new Date(asset.nextPM) < new Date()

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Left: identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-[11px] text-muted-foreground">{asset.number}</span>
            <AssetStatusBadge status={asset.status} />
            {isPMOverdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/15 text-destructive">
                <AlertTriangle className="size-2.5" /> PM Overdue
              </span>
            )}
          </div>
          <p className="text-sm font-semibold">{asset.name}</p>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
            <span>{asset.category}</span>
            <span>·</span>
            <span>{asset.outlet}</span>
            {asset.brand && <><span>·</span><span>{asset.brand}{asset.model ? ` ${asset.model}` : ''}</span></>}
            {asset.serialNumber && <><span>·</span><span className="font-mono">S/N: {asset.serialNumber}</span></>}
          </div>
        </div>

        {/* Right: PM dates + WO count + toggle */}
        <div className="flex items-center gap-4 flex-shrink-0 text-[11px]">
          <div className="text-right hidden sm:block">
            <p className="text-muted-foreground">Last PM</p>
            <p className="font-mono font-medium mt-0.5">{asset.lastPM ?? '—'}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-muted-foreground">Next PM</p>
            <p className={cn('font-mono font-medium mt-0.5', isPMOverdue ? 'text-destructive' : '')}>{asset.nextPM ?? '—'}</p>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Wrench className="size-3.5" />
            <span className="font-semibold text-foreground">{woCount}</span>
            <span>WO{woCount !== 1 ? 's' : ''}</span>
          </div>
          {expanded
            ? <ChevronDown className="size-4 text-muted-foreground" />
            : <ChevronRight className="size-4 text-muted-foreground" />
          }
        </div>
      </div>

      {/* Expandable work orders */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Linked Work Orders</p>
          <LinkedWorkOrders workOrders={workOrders} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function AssetsPage() {
  const { issues, approvals, outlets, pics, createIssue, assets, workOrders, cmmsLoading, createAsset } = useIssueStore()
  const { can } = usePermissions()
  const [showCreate, setShowCreate] = useState(false)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [tab, setTab] = useState<Tab>('requests')

  // Purchase requests
  const requests   = issues.filter((i) => i.category === 'Asset Purchase')
  const approvalsA = approvals.filter((a) => a.type === 'asset-purchase')

  // Physical assets filters
  const [filterOutlet, setFilterOutlet] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<AssetStatus | ''>('')

  const filteredAssets = assets.filter((a) => {
    const matchOutlet = !filterOutlet || a.outlet === filterOutlet
    const matchStatus = !filterStatus || a.status === filterStatus
    return matchOutlet && matchStatus
  })

  const assetOutlets = [...new Set(assets.map((a) => a.outlet))].sort()

  // Stats
  const purchaseStats = {
    total:    requests.length,
    pending:  approvalsA.filter((a) => a.status === 'pending').length,
    approved: approvalsA.filter((a) => a.status === 'approved').length,
    rejected: approvalsA.filter((a) => a.status === 'rejected').length,
  }

  const assetStats = {
    total:       assets.length,
    operational: assets.filter((a) => a.status === 'operational').length,
    atRisk:      assets.filter((a) => a.status === 'warning' || a.status === 'critical').length,
    pmOverdue:   assets.filter((a) => a.nextPM && new Date(a.nextPM) < new Date()).length,
  }

  const tabDefs: { id: Tab; label: string; count: number }[] = [
    { id: 'requests',        label: 'Asset Requests',  count: requests.length },
    { id: 'approvals',       label: 'Approvals',        count: approvalsA.length },
    { id: 'physical-assets', label: 'Physical Assets',  count: assets.length },
  ]

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Asset purchase requests, lifecycle tracking, and approval workflows</p>
        </div>
        {tab === 'physical-assets' ? (
          can.manageAssets && (
            <button
              onClick={() => setShowAddAsset(true)}
              className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" /> Add Asset
            </button>
          )
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> New Asset Request
          </button>
        )}
      </div>

      {/* Stats — context-sensitive per tab */}
      {tab !== 'physical-assets' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Requests"   value={purchaseStats.total}    color="text-foreground" />
          <StatCard label="Pending Approval" value={purchaseStats.pending}  color="text-amber-600"  />
          <StatCard label="Approved"         value={purchaseStats.approved} color="text-success"    />
          <StatCard label="Rejected"         value={purchaseStats.rejected} color="text-destructive" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Assets"  value={assetStats.total}       color="text-foreground"  />
          <StatCard label="Operational"   value={assetStats.operational} color="text-success"     />
          <StatCard label="At Risk"       value={assetStats.atRisk}      color="text-amber-600"   />
          <StatCard label="PM Overdue"    value={assetStats.pmOverdue}   color="text-destructive" />
        </div>
      )}

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

      {/* Tab: Physical Assets */}
      {tab === 'physical-assets' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={filterOutlet}
              onChange={(e) => setFilterOutlet(e.target.value)}
              className="h-8 text-xs rounded-md border border-border bg-background px-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Outlets</option>
              {assetOutlets.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
              {(['operational', 'warning', 'maintenance', 'critical'] as AssetStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition-colors',
                    filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {cmmsLoading && (
            <div className="text-center py-16 text-sm text-muted-foreground">Loading assets…</div>
          )}

          {/* Empty state */}
          {!cmmsLoading && assets.length === 0 && (
            <EmptyState
              icon={Package}
              message="No physical assets registered"
              hint="Add assets to track their maintenance schedule and work orders."
            />
          )}

          {/* Filtered empty */}
          {!cmmsLoading && assets.length > 0 && filteredAssets.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No assets match the current filters.
            </div>
          )}

          {/* Asset cards */}
          {!cmmsLoading && filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              workOrders={workOrders.filter((wo) => wo.assetId === asset.id)}
            />
          ))}
        </div>
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultCategory="Asset Purchase"
        outlets={outlets.map((o) => o.name)}
        assignees={['Unassigned', ...pics.map((p) => p.name)]}
        onSubmit={async (input) => { await createIssue(input) }}
      />

      <CreateAssetDialog
        open={showAddAsset}
        onOpenChange={setShowAddAsset}
        outlets={outlets.map((o) => o.name)}
        onSubmit={async (input) => { await createAsset(input) }}
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
