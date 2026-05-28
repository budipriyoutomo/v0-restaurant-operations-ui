'use client'

import { useState } from 'react'
import { QrCode, Calendar, Wrench, Package, Clock, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { StatCard } from '@/components/shared/stat-card'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { assets, workOrders, technicians } from '@/lib/data'
import { cn } from '@/lib/utils'

const downtimeData = [
  { outlet: 'KLC', hours: 1.2 },
  { outlet: 'BSR', hours: 0.8 },
  { outlet: 'KCC', hours: 2.4 },
  { outlet: 'DMS', hours: 0.5 },
  { outlet: 'SBJ', hours: 3.8 },
]

const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1)
const pmDays: Record<number, 'pm' | 'completed' | 'overdue'> = {
  3: 'completed', 7: 'completed', 10: 'pm', 14: 'pm', 18: 'overdue', 22: 'pm', 25: 'pm', 29: 'pm',
}

function assetStatusColor(status: string) {
  switch (status) {
    case 'operational': return 'bg-success/15 text-success border-success/30'
    case 'warning': return 'bg-warning/15 text-warning border-warning/30'
    case 'maintenance': return 'bg-primary/15 text-primary border-primary/30'
    case 'critical': return 'bg-destructive/15 text-destructive border-destructive/30'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

export function CMMSPage() {
  const [selectedAsset, setSelectedAsset] = useState<typeof assets[0] | null>(null)

  return (
    <div className="p-5 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Assets" value="124" subtitle="Across 5 outlets" icon={Package} />
        <StatCard title="Open Work Orders" value="8" subtitle="2 overdue" icon={Wrench} variant="warning" />
        <StatCard title="PM Compliance" value="94%" subtitle="This month" icon={Calendar} variant="success" />
        <StatCard title="Total Downtime" value="8.7h" subtitle="This week" icon={Clock} variant="critical" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asset status cards */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Asset Status</h3>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors">
                <QrCode className="size-3" /> Scan QR
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Asset</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Outlet</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Last PM</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Next PM</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={cn('hover:bg-muted/30 transition-colors cursor-pointer', selectedAsset?.id === asset.id && 'bg-accent/50')}
                    onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-muted-foreground font-mono">{asset.id}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{asset.outlet}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold border', assetStatusColor(asset.status))}>
                        {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{asset.lastPM}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'font-mono',
                        new Date(asset.nextPM) < new Date() ? 'text-destructive font-semibold' : 'text-muted-foreground'
                      )}>
                        {asset.nextPM}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{asset.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PM Calendar */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">PM Schedule — June 2024</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Preventive maintenance calendar</p>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
            {/* Offset for June 2024 (starts Saturday = 6) */}
            {Array.from({ length: 6 }).map((_, i) => <div key={`empty-${i}`} />)}
            {calendarDays.map((day) => {
              const pmType = pmDays[day]
              return (
                <div
                  key={day}
                  className={cn(
                    'text-[11px] rounded aspect-square flex items-center justify-center cursor-pointer hover:ring-1 hover:ring-primary transition-all',
                    pmType === 'completed' && 'bg-success/20 text-success font-semibold',
                    pmType === 'pm' && 'bg-primary/20 text-primary font-semibold',
                    pmType === 'overdue' && 'bg-destructive/20 text-destructive font-semibold',
                    !pmType && 'text-muted-foreground',
                  )}
                >
                  {day}
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary/60" />Scheduled</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success/60" />Completed</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-destructive/60" />Overdue</span>
          </div>
        </div>
      </div>

      {/* Work Orders + Downtime */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Work Orders</h3>
          <div className="space-y-2">
            {workOrders.map((wo) => (
              <div key={wo.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-accent/50 transition-colors">
                <div className="flex-shrink-0">
                  <p className="text-[11px] font-mono text-muted-foreground">{wo.id}</p>
                  <p className="text-xs font-semibold mt-0.5">{wo.asset}</p>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">{wo.outlet}</span>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] bg-muted rounded px-1.5 py-0.5">{wo.type}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={wo.priority as 'critical' | 'high' | 'medium' | 'low'} />
                  <StatusBadge status={wo.status as 'scheduled' | 'in_progress' | 'completed' | 'overdue'} />
                </div>
                <div className="text-[11px] text-muted-foreground flex-shrink-0">{wo.technician.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Downtime by Outlet</h3>
          <p className="text-xs text-muted-foreground mb-4">This week (hours)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={downtimeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="outlet" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }}
                formatter={(v: number) => [`${v}h`, 'Downtime']}
              />
              <Bar dataKey="hours" radius={[0, 3, 3, 0]} fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>

          {/* Technician workload */}
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold mb-2.5">Technician Workload</h4>
            <div className="space-y-2">
              {technicians.map((tech) => (
                <div key={tech.name} className="flex items-center gap-2">
                  <div className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                    {tech.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="truncate">{tech.name.split(' ')[0]}</span>
                      <span className="text-muted-foreground">{tech.activeJobs} jobs</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${tech.utilization}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Asset detail panel */}
      {selectedAsset && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">{selectedAsset.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedAsset.id} · {selectedAsset.category} · {selectedAsset.outlet}</p>
            </div>
            <button onClick={() => setSelectedAsset(null)} className="text-muted-foreground hover:text-foreground">
              <AlertCircle className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div><p className="text-muted-foreground">Status</p><span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold border mt-1 inline-block', assetStatusColor(selectedAsset.status))}>{selectedAsset.status}</span></div>
            <div><p className="text-muted-foreground">Last PM</p><p className="font-semibold mt-1 font-mono">{selectedAsset.lastPM}</p></div>
            <div><p className="text-muted-foreground">Next PM</p><p className="font-semibold mt-1 font-mono">{selectedAsset.nextPM}</p></div>
            <div><p className="text-muted-foreground">Asset Age</p><p className="font-semibold mt-1">{selectedAsset.age}</p></div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold mb-2">Maintenance History</p>
            <div className="space-y-1.5">
              {['PM completed — all checks passed', 'Minor repair — belt tension adjusted', 'PM completed — filter replaced'].map((h, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <div className="flex flex-col items-center">
                    <div className="size-1.5 rounded-full bg-success mt-1 flex-shrink-0" />
                    {i < 2 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-1.5">
                    <p className="text-foreground">{h}</p>
                    <p className="text-muted-foreground">{['Apr 15, 2024', 'Feb 10, 2024', 'Oct 22, 2023'][i]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
