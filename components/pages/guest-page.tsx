'use client'

import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { MessageSquareWarning, ThumbsDown, CheckCircle2, Clock } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { complaints, complaintTrendData, sentimentData, complaintCategoryData } from '@/lib/data'
import { cn } from '@/lib/utils'

export function GuestPage() {
  const [selectedComplaint, setSelectedComplaint] = useState<typeof complaints[0] | null>(null)

  return (
    <div className="p-5 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Complaints" value="31" subtitle="This month" icon={MessageSquareWarning} variant="warning" />
        <StatCard title="Unresolved" value="8" subtitle="3 escalated" icon={Clock} variant="critical" />
        <StatCard title="Resolution Rate" value="74%" subtitle="Target: 90%" icon={CheckCircle2} variant="warning" />
        <StatCard title="Negative Sentiment" value="58%" subtitle="-5% vs last month" icon={ThumbsDown} variant="critical" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Complaint feed */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold">Complaint Feed</h3>
          <div className="space-y-2">
            {complaints.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedComplaint(selectedComplaint?.id === c.id ? null : c)}
                className={cn(
                  'w-full text-left p-3.5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all',
                  selectedComplaint?.id === c.id ? 'border-primary ring-1 ring-primary/20' : 'border-border'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                      {c.customer.split(' ').map((w) => w[0]).join('')}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{c.customer}</p>
                      <p className="text-[11px] text-muted-foreground">{c.outlet} · {c.date.split(' ')[0]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <PriorityBadge priority={c.severity as 'critical' | 'high' | 'medium' | 'low'} />
                    <StatusBadge status={c.status as 'open' | 'in_progress' | 'resolved' | 'escalated'} />
                  </div>
                </div>
                <p className="text-xs text-foreground leading-relaxed mb-2">{c.message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{c.category}</span>
                  {c.recovery && (
                    <span className="text-[11px] text-success flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> {c.recovery}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Analytics */}
        <div className="space-y-4">
          {/* Sentiment */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Sentiment Analysis</h3>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                  {sentimentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {sentimentData.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="size-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-muted-foreground flex-1">{s.name}</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                  </div>
                  <span className="font-semibold w-7 text-right">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Complaint categories */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">By Category</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={complaintCategoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">Complaint Trend</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Complaints received vs resolved — May 2024</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={complaintTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} />
            <Line type="monotone" dataKey="complaints" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Complaints" />
            <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} name="Resolved" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Complaint detail */}
      {selectedComplaint && (
        <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-sm ring-1 ring-primary/10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono text-muted-foreground">{selectedComplaint.id}</span>
                <PriorityBadge priority={selectedComplaint.severity as 'critical' | 'high' | 'medium' | 'low'} />
                <StatusBadge status={selectedComplaint.status as 'open' | 'in_progress' | 'resolved' | 'escalated'} />
              </div>
              <h3 className="text-sm font-semibold">{selectedComplaint.customer} — {selectedComplaint.category}</h3>
            </div>
            <button onClick={() => setSelectedComplaint(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
            <div><p className="text-muted-foreground">Outlet</p><p className="font-semibold mt-1">{selectedComplaint.outlet}</p></div>
            <div><p className="text-muted-foreground">Date & Time</p><p className="font-semibold mt-1">{selectedComplaint.date}</p></div>
            <div><p className="text-muted-foreground">Sentiment</p><p className={cn('font-semibold mt-1 capitalize', selectedComplaint.sentiment === 'negative' ? 'text-destructive' : selectedComplaint.sentiment === 'neutral' ? 'text-warning' : 'text-success')}>{selectedComplaint.sentiment}</p></div>
            <div><p className="text-muted-foreground">Recovery Action</p><p className="font-semibold mt-1">{selectedComplaint.recovery ?? 'Not applied yet'}</p></div>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 border border-border">
            <p className="text-xs text-foreground leading-relaxed">&ldquo;{selectedComplaint.message}&rdquo;</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              Assign Recovery
            </button>
            <button className="px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors">
              Escalate
            </button>
            <button className="px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors">
              Mark Resolved
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
