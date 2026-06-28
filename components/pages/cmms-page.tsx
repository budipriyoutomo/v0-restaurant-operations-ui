'use client'

import { useState } from 'react'
import { QrCode, Calendar, Wrench, Package, Clock, AlertCircle, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { StatCard } from '@/components/shared/stat-card'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateAssetDialog } from '@/components/dialogs/create-asset-dialog'
import { CreateWorkOrderDialog } from '@/components/dialogs/create-work-order-dialog'
import { useIssueStore } from '@/lib/store'
import { Asset, AssetStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Asset status badge
// ---------------------------------------------------------------------------
function assetStatusColor(status: AssetStatus) {
  switch (status) {
    case 'operational': return 'bg-success/15 text-success border-success/30'
    case 'warning':     return 'bg-warning/15 text-warning border-warning/30'
    case 'maintenance': return 'bg-primary/15 text-primary border-primary/30'
    case 'critical':    return 'bg-destructive/15 text-destructive border-destructive/30'
  }
}

// ---------------------------------------------------------------------------
// PM Calendar — marks days that have a scheduled next_pm for any asset
// ---------------------------------------------------------------------------
function PMCalendar({ assets }: { assets: Asset[] }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()   // 0-indexed

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Build a set of days that have an asset's nextPM this month
  const pmDayMap: Record<number, 'pm' | 'overdue'> = {}
  assets.forEach((a) => {
    if (!a.nextPM) return
    const d = new Date(a.nextPM)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      const isOverdue = d < now
      pmDayMap[day] = isOverdue ? 'overdue' : 'pm'
    }
  })

  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">PM Schedule — {monthLabel}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Preventive maintenance calendar</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
        {calendarDays.map((day) => {
          const pmType = pmDayMap[day]
          const isToday = day === now.getDate()
          return (
            <div
              key={day}
              className={cn(
                'text-[11px] rounded aspect-square flex items-center justify-center',
                pmType === 'pm'      && 'bg-primary/20 text-primary font-semibold',
                pmType === 'overdue' && 'bg-destructive/20 text-destructive font-semibold',
                !pmType && 'text-muted-foreground',
                isToday && !pmType  && 'ring-1 ring-primary/40 font-semibold text-foreground',
              )}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px]">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary/60" />Scheduled</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-destructive/60" />Overdue</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expandable asset detail panel (inline)
// ---------------------------------------------------------------------------
function AssetDetailPanel({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { workOrders } = useIssueStore()
  const linkedWOs = workOrders.filter((wo) => wo.assetId === asset.id)

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{asset.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {asset.number} · {asset.category} · {asset.outlet}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <AlertCircle className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
        <div>
          <p className="text-muted-foreground">Status</p>
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold border mt-1 inline-block', assetStatusColor(asset.status))}>
            {asset.status}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground">Last PM</p>
          <p className="font-semibold mt-1 font-mono">{asset.lastPM ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Next PM</p>
          <p className={cn('font-semibold mt-1 font-mono', asset.nextPM && new Date(asset.nextPM) < new Date() ? 'text-destructive' : '')}>
            {asset.nextPM ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Install Date</p>
          <p className="font-semibold mt-1 font-mono">{asset.installDate ?? '—'}</p>
        </div>
      </div>

      {asset.brand || asset.model || asset.serialNumber ? (
        <div className="grid grid-cols-3 gap-4 text-xs mb-4 pb-4 border-b border-border">
          {asset.brand     && <div><p className="text-muted-foreground">Brand</p><p className="font-semibold mt-1">{asset.brand}</p></div>}
          {asset.model     && <div><p className="text-muted-foreground">Model</p><p className="font-semibold mt-1">{asset.model}</p></div>}
          {asset.serialNumber && <div><p className="text-muted-foreground">Serial No.</p><p className="font-semibold mt-1 font-mono">{asset.serialNumber}</p></div>}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold mb-2">Work Orders ({linkedWOs.length})</p>
        {linkedWOs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No work orders for this asset.</p>
        ) : (
          <div className="space-y-1.5">
            {linkedWOs.map((wo) => (
              <div key={wo.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border text-xs">
                <span className="font-mono text-muted-foreground w-28 flex-shrink-0">{wo.number}</span>
                <span className="flex-1 font-medium truncate">{wo.title}</span>
                <PriorityBadge priority={wo.priority} />
                <StatusBadge status={wo.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main CMMS page
// ---------------------------------------------------------------------------
export function CMMSPage() {
  const { assets, workOrders, cmmsLoading, outlets, pics, createAsset, createWorkOrder } = useIssueStore()
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showAddWO, setShowAddWO] = useState(false)

  // KPI derivations
  const openWOs      = workOrders.filter((wo) => wo.status !== 'completed' && wo.status !== 'cancelled')
  const overdueWOs   = workOrders.filter((wo) => {
    if (wo.status === 'completed' || wo.status === 'cancelled') return false
    return wo.scheduledDate && new Date(wo.scheduledDate) < new Date()
  })
  const pmCompliance = (() => {
    const pmWOs = workOrders.filter((wo) => wo.type === 'preventive')
    if (pmWOs.length === 0) return 0
    const done = pmWOs.filter((wo) => wo.status === 'completed').length
    return Math.round((done / pmWOs.length) * 100)
  })()

  // Downtime by outlet — hours approximated by count of completed corrective WOs
  const downtimeData = (() => {
    const map: Record<string, number> = {}
    workOrders
      .filter((wo) => wo.type === 'corrective' && wo.status === 'completed')
      .forEach((wo) => { map[wo.outlet] = (map[wo.outlet] ?? 0) + 1 })
    return Object.entries(map)
      .map(([outlet, count]) => ({ outlet: outlet.split(' ')[0], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  })()

  // Technician workload — unique assignees + their open WO count
  const techData = (() => {
    const map: Record<string, number> = {}
    openWOs.forEach((wo) => {
      if (wo.assignee && wo.assignee !== 'Unassigned') {
        map[wo.assignee] = (map[wo.assignee] ?? 0) + 1
      }
    })
    const maxJobs = Math.max(1, ...Object.values(map))
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, jobs]) => ({
        name,
        avatar: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
        jobs,
        utilization: Math.round((jobs / maxJobs) * 100),
      }))
  })()

  if (cmmsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading CMMS data…
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setShowAddWO(true)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors"
        >
          <Plus className="size-3.5" /> New Work Order
        </button>
        <button
          onClick={() => setShowAddAsset(true)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" /> Add Asset
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Assets"    value={String(assets.length)}   subtitle="Registered assets"          icon={Package} />
        <StatCard title="Open Work Orders" value={String(openWOs.length)}  subtitle={`${overdueWOs.length} overdue`} icon={Wrench} variant={overdueWOs.length > 0 ? 'warning' : undefined} />
        <StatCard title="PM Compliance"   value={`${pmCompliance}%`}      subtitle="Preventive WOs completed"   icon={Calendar} variant="success" />
        <StatCard title="Corrective WOs"  value={String(workOrders.filter((wo) => wo.type === 'corrective').length)} subtitle="All time" icon={Clock} variant="critical" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asset table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Asset Status</h3>
            <button className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors">
              <QrCode className="size-3" /> Scan QR
            </button>
          </div>

          {assets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border flex items-center justify-center py-16 text-xs text-muted-foreground">
              No assets registered yet.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Asset</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Outlet</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Last PM</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Next PM</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">WOs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assets.map((asset) => {
                    const woCount = workOrders.filter((wo) => wo.assetId === asset.id).length
                    const pmOverdue = asset.nextPM && new Date(asset.nextPM) < new Date()
                    return (
                      <tr
                        key={asset.id}
                        className={cn('hover:bg-muted/30 transition-colors cursor-pointer', selectedAsset?.id === asset.id && 'bg-accent/50')}
                        onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-muted-foreground font-mono">{asset.number}</p>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{asset.outlet}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold border', assetStatusColor(asset.status))}>
                            {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground font-mono">{asset.lastPM ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('font-mono', pmOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                            {asset.nextPM ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{woCount}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PM Calendar */}
        <PMCalendar assets={assets} />
      </div>

      {/* Work Orders + Downtime chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Work Orders</h3>
          {workOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No work orders yet.</p>
          ) : (
            <div className="space-y-2">
              {workOrders.slice(0, 10).map((wo) => (
                <div key={wo.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-accent/50 transition-colors">
                  <div className="flex-shrink-0">
                    <p className="text-[11px] font-mono text-muted-foreground">{wo.number}</p>
                    <p className="text-xs font-semibold mt-0.5">{wo.assetName}</p>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground truncate">{wo.outlet}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className={cn(
                      'text-[11px] bg-muted rounded px-1.5 py-0.5',
                      wo.type === 'preventive' ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {wo.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={wo.priority} />
                    <StatusBadge status={wo.status} />
                  </div>
                  <div className="text-[11px] text-muted-foreground flex-shrink-0 hidden sm:block">
                    {wo.assignee.split(' ')[0]}
                  </div>
                </div>
              ))}
              {workOrders.length > 10 && (
                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  +{workOrders.length - 10} more — use filters in Asset Management
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">Corrective WOs by Outlet</h3>
          <p className="text-xs text-muted-foreground mb-4">Completed corrective work orders</p>

          {downtimeData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No completed corrective WOs yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={downtimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="outlet" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }}
                  formatter={(v: number) => [`${v}`, 'WOs']}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Technician workload */}
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold mb-2.5">Technician Workload</h4>
            {techData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No open assignments.</p>
            ) : (
              <div className="space-y-2">
                {techData.map((tech) => (
                  <div key={tech.name} className="flex items-center gap-2">
                    <div className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                      {tech.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="truncate">{tech.name.split(' ')[0]}</span>
                        <span className="text-muted-foreground">{tech.jobs} open</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${tech.utilization}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset detail panel */}
      {selectedAsset && (
        <AssetDetailPanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      )}

      <CreateAssetDialog
        open={showAddAsset}
        onOpenChange={setShowAddAsset}
        outlets={outlets.map((o) => o.name)}
        onSubmit={async (input) => { await createAsset(input) }}
      />

      <CreateWorkOrderDialog
        open={showAddWO}
        onOpenChange={setShowAddWO}
        assets={assets}
        assignees={pics.map((p) => p.name)}
        onSubmit={async (input) => { await createWorkOrder(input) }}
      />
    </div>
  )
}
