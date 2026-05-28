'use client'

import { useState } from 'react'
import { ClipboardCheck, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { StatCard } from '@/components/shared/stat-card'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { capaItems, qaScoreData } from '@/lib/data'
import { cn } from '@/lib/utils'

const evidenceImages = [
  { label: 'Kitchen Station A', desc: 'Oil spillage evidence', color: 'bg-orange-500/20' },
  { label: 'Cold Storage Log', desc: 'Temperature record breach', color: 'bg-blue-500/20' },
  { label: 'Waste Area', desc: 'Segregation non-compliance', color: 'bg-green-500/20' },
  { label: 'Prep Station', desc: 'Missing PPE evidence', color: 'bg-purple-500/20' },
]

export function QAPage() {
  const [selectedCapa, setSelectedCapa] = useState<typeof capaItems[0] | null>(null)

  return (
    <div className="p-5 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Open CAPAs" value="3" subtitle="2 approaching due date" icon={AlertTriangle} variant="warning" />
        <StatCard title="Resolved This Month" value="8" subtitle="CAPA closure rate 73%" icon={CheckCircle2} variant="success" />
        <StatCard title="Avg QA Score" value="81.6" subtitle="Target: 85/100" icon={ClipboardCheck} variant="warning" />
        <StatCard title="Critical Issues" value="2" subtitle="Requiring immediate action" icon={TrendingUp} variant="critical" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CAPA workflow */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold">CAPA Workflow Board</h3>
          <div className="space-y-2">
            {capaItems.map((capa) => (
              <button
                key={capa.id}
                onClick={() => setSelectedCapa(selectedCapa?.id === capa.id ? null : capa)}
                className={cn(
                  'w-full text-left p-3.5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all',
                  selectedCapa?.id === capa.id ? 'border-primary ring-1 ring-primary/20' : 'border-border'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground">{capa.id}</span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">{capa.category}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <PriorityBadge priority={capa.severity as 'critical' | 'high' | 'medium' | 'low'} />
                    <StatusBadge status={capa.status as 'open' | 'in_progress' | 'resolved'} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-foreground mb-1.5">{capa.issue}</p>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span>{capa.outlet}</span>
                  <span>·</span>
                  <span>Due: <span className={cn('font-medium', new Date(capa.dueDate) < new Date() ? 'text-destructive' : '')}>{capa.dueDate}</span></span>
                  <span>·</span>
                  <span>Assignee: {capa.assignee.split(' ')[0]}</span>
                </div>

                {selectedCapa?.id === capa.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Root Cause: </span>
                      <span className="font-medium">{capa.rootCause}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors">
                        Update Status
                      </button>
                      <button className="px-3 py-1.5 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-accent transition-colors">
                        Add Evidence
                      </button>
                      <button className="px-3 py-1.5 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-accent transition-colors">
                        Close CAPA
                      </button>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* QA Score + Evidence */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">QA Score by Outlet</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={qaScoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="outlet" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} />
                <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Target', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
                <Bar dataKey="score" radius={[3, 3, 0, 0]} fill="#3b82f6"
                  label={{ position: 'top', fontSize: 9, fill: 'var(--color-muted-foreground)' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Image evidence gallery */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Evidence Gallery</h3>
            <div className="grid grid-cols-2 gap-2">
              {evidenceImages.map((img, i) => (
                <div key={i} className={cn('rounded-lg p-3 aspect-[4/3] flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity', img.color)}>
                  <div className="size-8 rounded-full bg-white/20 flex items-center justify-center mb-1.5">
                    <ClipboardCheck className="size-4 text-foreground/70" />
                  </div>
                  <p className="text-[11px] font-semibold text-center leading-tight">{img.label}</p>
                  <p className="text-[10px] text-muted-foreground text-center mt-0.5 leading-tight">{img.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Root cause summary */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Root Cause Analysis</h3>
            <div className="space-y-2">
              {[
                { cause: 'Staff Training Gap', count: 4, pct: 40 },
                { cause: 'SOP Non-Compliance', count: 3, pct: 30 },
                { cause: 'Equipment Failure', count: 2, pct: 20 },
                { cause: 'Unclear Labeling', count: 1, pct: 10 },
              ].map((rc) => (
                <div key={rc.cause}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-muted-foreground">{rc.cause}</span>
                    <span className="font-medium">{rc.count} issues</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${rc.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
