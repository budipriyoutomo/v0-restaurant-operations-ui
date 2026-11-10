'use client'

import { useMemo, useState } from 'react'
import { QrCode, Package, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { KpiStrip } from '@/components/shared/kpi-strip'
import { StatusLabel } from '@/components/shared/status-label'
import { RecordId } from '@/components/shared/record-id'
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
import { assetSignal } from '@/components/cmms/asset-status'
import { PMCalendar } from '@/components/cmms/pm-calendar'
import { AssetDetailPanel } from '@/components/cmms/asset-detail-panel'
import { WorkOrderDetailDrawer } from '@/components/cmms/work-order-drawer'
import { EmptyState as SharedEmptyState } from '@/components/shared/empty-state'
import { FilterSelect } from '@/components/shared/filter-menu'

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
    if (pmWOs.length === 0) return null
    const done = pmWOs.filter((wo) => wo.status === 'completed').length
    return Math.round((done / pmWOs.length) * 100)
  })()

  const correctiveCount = workOrders.filter((wo) => wo.type === 'corrective').length

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
        title={t('nav.cmms')}
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

      {/* One status bar, only once there is something to count (Todo-Modern-UI Fase 4) */}
      <KpiStrip label={t('cmms.kpiLabel')} items={[
        { label: t('cmms.totalAssets'), value: assets.length },
        { label: t('cmms.openWos'), value: openWOs.length, signal: overdueWOs.length > 0 ? 'waiting' : undefined,
          hint: overdueWOs.length > 0 ? t('cmms.overdueCount', { count: overdueWOs.length }) : undefined },
        { label: t('cmms.pmCompliance'), value: pmCompliance === null ? null : `${pmCompliance}%` },
        { label: t('cmms.correctiveWos'), value: correctiveCount, hint: t('cmms.allTime') },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asset table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{t('cmms.assetStatus')}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* The top bar outlet filter already narrows to one outlet */}
              {assetOutlets.length > 1 && (
                <FilterSelect label={t('common.outlet')} allLabel={t('cmms.allOutlets')} value={filterOutlet || null}
                  options={assetOutlets.map((o) => ({ value: o, label: o }))} onChange={(v) => setFilterOutlet(v ?? '')} />
              )}
              <FilterSelect label={t('common.status')} allLabel={t('common.all')} value={filterAssetStatus || null}
                options={(['operational', 'warning', 'maintenance', 'critical'] as AssetStatus[]).map((st) => ({ value: st, label: label('assetStatus', st) }))}
                onChange={(v) => setFilterAssetStatus(v ?? '')} />
              <button
                onClick={() => setShowQr(true)}
                className="flex items-center gap-1.5 px-3 h-10 sm:h-9 rounded-full border border-border text-sm text-muted-foreground hover:bg-accent transition-colors">
                <QrCode className="size-4" /> {t('cmms.scanQr')}
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
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground max-sm:hidden">{t('asset.lastPm')}</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground">{t('asset.nextPm')}</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground max-sm:hidden">{t('cmms.wos')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAssets.map((asset) => {
                    const woCount = workOrders.filter((wo) => wo.assetId === asset.id).length
                    const pmOverdue = asset.nextPM && new Date(asset.nextPM) < new Date()
                    const open = selectedAsset?.id === asset.id
                    const toggle = () => setSelectedAsset(open ? null : asset)
                    return (
                      <tr
                        key={asset.id}
                        className={cn('hover:bg-muted/30 transition-colors cursor-pointer', open && 'bg-accent/50')}
                        onClick={toggle}
                      >
                        <td className="px-4 py-3.5">
                          {/* The keyboard way in; the whole row stays clickable for the mouse. */}
                          <button type="button" aria-expanded={open} onClick={(e) => { e.stopPropagation(); toggle() }}
                            className="text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">
                            {asset.name}
                          </button>
                          <RecordId id={asset.number} className="block" />
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{asset.outlet}</td>
                        <td className="px-4 py-3.5">
                          <StatusLabel signal={assetSignal(asset.status)}>{label('assetStatus', asset.status)}</StatusLabel>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground max-sm:hidden">{date(asset.lastPM)}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn(pmOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                            {date(asset.nextPM)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground tabular-nums max-sm:hidden">{woCount}</td>
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
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <h3 id="cmms-wo-heading" className="text-sm font-semibold">{t('cmms.workOrders')}</h3>
            <FilterSelect label={t('common.status')} value={woScope}
              options={[{ value: 'open', label: t('cmms.openCount', { count: openWOs.length }) }, { value: 'all', label: t('cmms.allCount', { count: workOrders.length }) }]}
              onChange={(v) => { setWoScope(v ?? 'open'); setShowAllWOs(false) }} />
          </div>
          {listedWOs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {workOrders.length === 0 ? t('cmms.noWosYet') : t('cmms.noOpenWos')}
            </p>
          ) : (
            <div className="space-y-2">
              {/* Dense rows, one button each, like the Issues list (Todo-Modern-UI Fase 4) */}
              <ul aria-labelledby="cmms-wo-heading" className="divide-y divide-border rounded-lg border border-border">
              {visibleWOs.map((wo) => (
                <li key={wo.id}>
                  <button type="button" onClick={() => setSelectedWOId(wo.id)}
                    aria-labelledby={`wo-${wo.id}-number wo-${wo.id}-asset`}
                    className="w-full grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-3 py-2.5 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                    <span className="min-w-0">
                      <span id={`wo-${wo.id}-asset`} className="block text-sm font-medium truncate">{wo.assetName}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span id={`wo-${wo.id}-number`}><RecordId id={wo.number} /></span>
                        <span>{wo.outlet}</span>
                        <span>{label('woType', wo.type)}</span>
                        {wo.assignee && wo.assignee !== 'Unassigned' && <span>{wo.assignee}</span>}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <StatusBadge status={wo.status} />
                      <PriorityBadge priority={wo.priority} />
                    </span>
                  </button>
                </li>
              ))}
              </ul>
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
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="outlet" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }}
                  formatter={(v: number) => [`${v}`, t('cmms.wos')]}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} fill="var(--chart-1)" />
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
