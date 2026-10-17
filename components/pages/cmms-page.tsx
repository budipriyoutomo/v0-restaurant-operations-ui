'use client'

import { useMemo, useState } from 'react'
import { QrCode, Calendar, Wrench, Package, Clock, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { StatCard } from '@/components/shared/stat-card'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateAssetDialog } from '@/components/dialogs/create-asset-dialog'
import { CreateWorkOrderDialog } from '@/components/dialogs/create-work-order-dialog'
import { PMSchedulePanel } from '@/components/cmms/pm-schedule-panel'
import { CMMSAnalyticsPanel } from '@/components/cmms/cmms-analytics-panel'
import { PartsInventoryPanel } from '@/components/cmms/parts-inventory-panel'
import { QrDialog } from '@/components/cmms/qr-dialog'
import { useIssueStore } from '@/lib/store'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { ListSkeleton } from '@/components/shared/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { Asset, AssetStatus } from '@/lib/types'
import { usePermissions, useMyOutlets, useOutletFilter } from '@/lib/permissions'
import { byOutlet } from '@/lib/outlet-filter'
import { useRecordRoute } from '@/lib/use-route'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { assetStatusColor } from '@/components/cmms/asset-status'
import { PMCalendar } from '@/components/cmms/pm-calendar'
import { AssetDetailPanel } from '@/components/cmms/asset-detail-panel'
import { WorkOrderDetailDrawer } from '@/components/cmms/work-order-drawer'
import { EmptyState as SharedEmptyState } from '@/components/shared/empty-state'

// The WO drawer lives in components/cmms; re-exported for existing imports.
export { WorkOrderDetailDrawer }

// ---------------------------------------------------------------------------
// Main CMMS page
// ---------------------------------------------------------------------------
export function CMMSPage() {
  useEnsureLoaded('cmms', 'vendors')
  const { assets: allAssets, workOrders: allWorkOrders, cmmsLoading, outlets, pics, createAsset, createWorkOrder } = useIssueStore()
  // Top bar outlet filter: CMMS holds every asset & WO in memory, so narrow here.
  const { outlet } = useOutletFilter()
  const assets = useMemo(() => byOutlet(allAssets, outlet), [allAssets, outlet])
  const workOrders = useMemo(() => byOutlet(allWorkOrders, outlet), [allWorkOrders, outlet])
  const { can } = usePermissions()
  const { t, label, date } = useT()
  // Outlet pickers must only offer outlets this user may write to (Tier 4).
  const myOutlets = useMyOutlets()
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  // The open work order lives in the URL (/work-orders/{id}, Todo-Pilot §14).
  const woRecord = useRecordRoute()
  const selectedWOId = woRecord.recordId
  const setSelectedWOId = (id: string | null) => (id ? woRecord.open(id) : woRecord.close())
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [showAddWO, setShowAddWO] = useState(false)
  // Asset filters (moved here with the old Assets → Physical Assets tab).
  const [filterOutlet, setFilterOutlet] = useState('')
  const [filterAssetStatus, setFilterAssetStatus] = useState<AssetStatus | ''>('')
  // Work order list: open ones by default, everything on demand.
  const [woScope, setWoScope] = useState<'open' | 'all'>('open')
  const [showAllWOs, setShowAllWOs] = useState(false)

  const assetOutlets = [...new Set(assets.map((a) => a.outlet))].sort()
  const filteredAssets = assets.filter((a) =>
    (!filterOutlet || a.outlet === filterOutlet) && (!filterAssetStatus || a.status === filterAssetStatus),
  )

  // KPI derivations
  const openWOs      = workOrders.filter((wo) => wo.status !== 'completed' && wo.status !== 'cancelled')
  const listedWOs    = woScope === 'open' ? openWOs : workOrders
  const visibleWOs   = showAllWOs ? listedWOs : listedWOs.slice(0, 10)
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

  if (cmmsLoading && assets.length === 0 && workOrders.length === 0) return <ListSkeleton rows={5} />

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="CMMS"
        description={t('cmms.subtitle')}
        // Header actions — need assets:manage / cmms:manage on the backend, so
        // roles without them must not be offered a button that 403s.
        actions={(can.manageCMMS || can.manageAssets) && (
          <>
            {can.manageCMMS && <button
              onClick={() => setShowAddWO(true)}
              className="flex items-center gap-1.5 px-4 h-10 rounded-lg border border-border bg-card text-sm font-medium hover:bg-accent transition-colors"
            >
              <Plus className="size-4" /> {t('cmms.newWo')}
            </button>}
            {can.manageAssets && <button
              onClick={() => setShowAddAsset(true)}
              className="flex items-center gap-1.5 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-sm transition-colors"
            >
              <Plus className="size-4" /> {t('cmms.addAsset')}
            </button>}
          </>
        )}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title={t('cmms.totalAssets')} value={String(assets.length)} subtitle={t('cmms.registered')} icon={Package} />
        <StatCard title={t('cmms.openWos')} value={String(openWOs.length)} subtitle={t('cmms.overdueCount', { count: overdueWOs.length })} icon={Wrench} variant={overdueWOs.length > 0 ? 'warning' : undefined} />
        <StatCard title={t('cmms.pmCompliance')} value={`${pmCompliance}%`} subtitle={t('cmms.pmCompleted')} icon={Calendar} variant="success" />
        <StatCard title={t('cmms.correctiveWos')} value={String(workOrders.filter((wo) => wo.type === 'corrective').length)} subtitle={t('cmms.allTime')} icon={Clock} variant="critical" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asset table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{t('cmms.assetStatus')}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* The top bar outlet filter already narrows to one outlet */}
              {assetOutlets.length > 1 && <select
                value={filterOutlet}
                onChange={(e) => setFilterOutlet(e.target.value)}
                className="h-9 text-sm rounded-lg border border-border bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">{t('cmms.allOutlets')}</option>
                {assetOutlets.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>}
              <select
                value={filterAssetStatus}
                onChange={(e) => setFilterAssetStatus(e.target.value as AssetStatus | '')}
                className="h-9 text-sm rounded-lg border border-border bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">{t('cmms.allStatuses')}</option>
                {(['operational', 'warning', 'maintenance', 'critical'] as AssetStatus[]).map((st) => (
                  <option key={st} value={st}>{label('assetStatus', st)}</option>
                ))}
              </select>
              <button
                onClick={() => setShowQr(true)}
                className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent transition-colors">
                <QrCode className="size-3" /> {t('cmms.scanQr')}
              </button>
            </div>
          </div>

          {assets.length === 0 ? (
            <SharedEmptyState icon={Package} title={t('cmms.noAssets')} description={t('cmms.noAssetsHint')} />
          ) : filteredAssets.length === 0 ? (
            <SharedEmptyState title={t('cmms.noAssetsMatch')} className="py-16 text-sm" />
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground">{t('wo.asset')}</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground">{t('common.outlet')}</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground">{t('common.status')}</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground">{t('asset.lastPm')}</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground">{t('asset.nextPm')}</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground">{t('cmms.wos')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAssets.map((asset) => {
                    const woCount = workOrders.filter((wo) => wo.assetId === asset.id).length
                    const pmOverdue = asset.nextPM && new Date(asset.nextPM) < new Date()
                    return (
                      <tr
                        key={asset.id}
                        className={cn('hover:bg-muted/30 transition-colors cursor-pointer', selectedAsset?.id === asset.id && 'bg-accent/50')}
                        onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-muted-foreground font-mono">{asset.number}</p>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{asset.outlet}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold border', assetStatusColor(asset.status))}>
                            {label('assetStatus', asset.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{date(asset.lastPM)}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn(pmOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                            {date(asset.nextPM)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{woCount}</td>
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

      {/* PM Schedules — create/manage recurring preventive maintenance */}
      <PMSchedulePanel />

      {/* Spare parts inventory (Tier 3) */}
      <PartsInventoryPanel />

      {/* CMMS Reliability & Cost Analytics (Tier 3) */}
      <CMMSAnalyticsPanel />

      {/* Work Orders + Downtime chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{t('cmms.workOrders')}</h3>
            <div className="flex rounded-md border border-border overflow-hidden text-xs font-semibold">
              {(['open', 'all'] as const).map((sc) => (
                <button
                  key={sc}
                  onClick={() => { setWoScope(sc); setShowAllWOs(false) }}
                  className={cn('px-2.5 h-6', woScope === sc ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
                >
                  {sc === 'open' ? t('cmms.openCount', { count: openWOs.length }) : t('cmms.allCount', { count: workOrders.length })}
                </button>
              ))}
            </div>
          </div>
          {listedWOs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {workOrders.length === 0 ? t('cmms.noWosYet') : t('cmms.noOpenWos')}
            </p>
          ) : (
            <div className="space-y-2">
              {visibleWOs.map((wo) => (
                <div
                  key={wo.id}
                  onClick={() => setSelectedWOId(wo.id)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <p className="text-xs font-mono text-muted-foreground">{wo.number}</p>
                    <p className="text-xs font-semibold mt-0.5">{wo.assetName}</p>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground truncate">{wo.outlet}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className={cn(
                      'text-xs bg-muted rounded px-1.5 py-0.5',
                      wo.type === 'preventive' ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {label('woType', wo.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={wo.priority} />
                    <StatusBadge status={wo.status} />
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                    {wo.assignee.split(' ')[0]}
                  </div>
                </div>
              ))}
              {listedWOs.length > 10 && (
                <button
                  onClick={() => setShowAllWOs((v) => !v)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground text-center pt-1"
                >
                  {showAllWOs ? t('cmms.showFewer') : t('cmms.showMore', { count: listedWOs.length - 10 })}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">{t('cmms.correctiveByOutlet')}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t('cmms.completedCorrective')}</p>

          {downtimeData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">{t('cmms.noCompletedCorrective')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={downtimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="outlet" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }}
                  formatter={(v: number) => [`${v}`, t('cmms.wos')]}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Technician workload */}
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold mb-2.5">{t('cmms.techWorkload')}</h4>
            {techData.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('cmms.noAssignments')}</p>
            ) : (
              <div className="space-y-2">
                {techData.map((tech) => (
                  <div key={tech.name} className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {tech.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="truncate">{tech.name.split(' ')[0]}</span>
                        <span className="text-muted-foreground">{t('cmms.openJobs', { count: tech.jobs })}</span>
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
        <AssetDetailPanel
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onSelectWO={(woId) => { setSelectedAsset(null); setSelectedWOId(woId) }}
        />
      )}

      {/* Work Order detail drawer */}
      {selectedWOId && (
        <WorkOrderDetailDrawer woId={selectedWOId} onClose={() => setSelectedWOId(null)} />
      )}

      {/* QR scan / print stickers (Tier 5.2) */}
      {showQr && (
        <QrDialog
          onClose={() => setShowQr(false)}
          onResolved={(r) => {
            setShowQr(false)
            // Land straight on the active work order if there is one, else the asset.
            if (r.activeWorkOrderId) {
              setSelectedAsset(null)
              setSelectedWOId(r.activeWorkOrderId)
            } else {
              const a = assets.find((x) => x.id === r.asset.id) ?? r.asset
              setSelectedAsset(a)
            }
            toast.success(t('cmms.assetToast', { name: r.asset.name }))
          }}
        />
      )}

      <CreateAssetDialog
        open={showAddAsset}
        onOpenChange={setShowAddAsset}
        outlets={myOutlets.map((o) => o.name)}
        onSubmit={async (input) => { await createAsset(input) }}
      />

      <CreateWorkOrderDialog
        open={showAddWO}
        onOpenChange={setShowAddWO}
        assets={assets}
        onSubmit={async (input) => { await createWorkOrder(input) }}
      />
    </div>
  )
}
