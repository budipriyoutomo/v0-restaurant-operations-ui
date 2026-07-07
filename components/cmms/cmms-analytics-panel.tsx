'use client'

import { useEffect } from 'react'
import { Activity, Timer, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { cn } from '@/lib/utils'

function fmtHours(h: number): string {
  if (h <= 0) return '—'
  if (h >= 24) return `${(h / 24).toFixed(1)}d`
  return `${h.toFixed(1)}h`
}

function fmtRp(v: number): string {
  return 'Rp ' + (v ?? 0).toLocaleString('id-ID')
}

export function CMMSAnalyticsPanel() {
  const { cmmsAnalytics, cmmsAnalyticsLoading, loadCMMSAnalytics } = useIssueStore()
  const { can } = usePermissions()

  useEffect(() => {
    if (can.viewAnalytics) loadCMMSAnalytics()
  }, [loadCMMSAnalytics, can.viewAnalytics])

  if (!can.viewAnalytics) return null

  const fleet = cmmsAnalytics?.fleet
  const rows = cmmsAnalytics?.perAsset ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold">Reliability & Cost Analytics</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            MTTR, MTBF, uptime, dan biaya per aset — plus flag repair-vs-replace
          </p>
        </div>
      </div>

      {cmmsAnalyticsLoading && !cmmsAnalytics ? (
        <p className="text-xs text-muted-foreground text-center py-6">Memuat analytics…</p>
      ) : (
        <>
          {/* Fleet roll-up */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <StatCard title="Avg MTTR"  value={fmtHours(fleet?.avgMttrHours ?? 0)} subtitle="Rata-rata waktu perbaikan" icon={Timer} />
            <StatCard title="Avg MTBF"  value={fmtHours(fleet?.avgMtbfHours ?? 0)} subtitle="Antar kegagalan" icon={Activity} />
            <StatCard title="Avg Uptime" value={`${(fleet?.avgUptimePct ?? 100).toFixed(1)}%`} subtitle="Ketersediaan armada" icon={TrendingUp} variant="success" />
            <StatCard title="Total Biaya" value={fmtRp(fleet?.totalCost ?? 0)} subtitle="Maintenance semua aset" icon={DollarSign} />
            <StatCard title="Perlu Diganti" value={String(fleet?.replaceCandidates ?? 0)} subtitle="Repair ≥ 50% nilai aset" icon={AlertTriangle} variant={(fleet?.replaceCandidates ?? 0) > 0 ? 'warning' : undefined} />
          </div>

          {/* Per-asset table */}
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border flex items-center justify-center py-10 text-xs text-muted-foreground">
              Belum ada data aset.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-semibold">Aset</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Outlet</th>
                    <th className="text-right px-4 py-2.5 font-semibold">WO</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Kegagalan</th>
                    <th className="text-right px-4 py-2.5 font-semibold">MTTR</th>
                    <th className="text-right px-4 py-2.5 font-semibold">MTBF</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Uptime</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Biaya</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Repair vs Replace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((a) => (
                    <tr key={a.assetId} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-2.5 font-semibold">{a.assetName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{a.outlet}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{a.workOrders}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{a.failures}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtHours(a.mttrHours)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtHours(a.mtbfHours)}</td>
                      <td className={cn(
                        'px-4 py-2.5 text-right font-medium',
                        a.uptimePct >= 99 ? 'text-success' : a.uptimePct >= 90 ? 'text-warning' : 'text-destructive',
                      )}>
                        {a.uptimePct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtRp(a.totalCost)}</td>
                      <td className="px-4 py-2.5">
                        {a.repairVsReplace === null ? (
                          <span className="text-[11px] text-muted-foreground">nilai aset belum diisi</span>
                        ) : a.repairVsReplace ? (
                          <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold border bg-destructive/15 text-destructive border-destructive/30">
                            Pertimbangkan ganti
                          </span>
                        ) : (
                          <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold border bg-success/15 text-success border-success/30">
                            Layak diperbaiki
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
