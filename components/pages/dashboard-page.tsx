'use client'

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Activity, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  TrendingDown, Wrench, Users, Zap
} from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import {
  ticketTrendData, issueCategoryData, maintenanceCostData,
  outletRankings, realtimeAlerts, technicians
} from '@/lib/data'
import { cn } from '@/lib/utils'

const heatmapData = [
  { outlet: 'KL Central', mon: 1, tue: 3, wed: 2, thu: 1, fri: 4, sat: 2, sun: 1 },
  { outlet: 'Bangsar', mon: 2, tue: 1, wed: 3, thu: 2, fri: 3, sat: 5, sun: 2 },
  { outlet: 'KLCC', mon: 4, tue: 5, wed: 3, thu: 4, fri: 6, sat: 4, sun: 3 },
  { outlet: 'Damansara', mon: 1, tue: 2, wed: 1, thu: 2, fri: 2, sat: 3, sun: 1 },
  { outlet: 'Subang', mon: 5, tue: 4, wed: 6, thu: 7, fri: 5, sat: 8, sun: 4 },
]
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function heatColor(val: number) {
  if (val <= 1) return 'bg-success/20'
  if (val <= 2) return 'bg-success/40'
  if (val <= 3) return 'bg-warning/30'
  if (val <= 5) return 'bg-warning/60'
  return 'bg-destructive/60'
}

export function DashboardPage() {
  return (
    <div className="p-5 space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard
          title="Operational Health"
          value="82"
          subtitle="Out of 100 — Good"
          icon={Activity}
          variant="success"
          trend={{ value: '+3 from last week', positive: true }}
        />
        <StatCard
          title="Open Tickets"
          value="14"
          subtitle="3 critical, 5 high"
          icon={AlertTriangle}
          variant="warning"
          trend={{ value: '+2 since yesterday', positive: false }}
        />
        <StatCard
          title="SLA Compliance"
          value="87%"
          subtitle="Target: 95%"
          icon={CheckCircle2}
          variant="warning"
          trend={{ value: '-4% this week', positive: false }}
        />
        <StatCard
          title="PM Completion"
          value="94%"
          subtitle="48 of 51 due"
          icon={Wrench}
          variant="success"
          trend={{ value: '+6% vs last month', positive: true }}
        />
        <StatCard
          title="Active Technicians"
          value="4"
          subtitle="8 jobs in progress"
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Downtime (hrs)"
          value="6.2"
          subtitle="This week across all outlets"
          icon={Zap}
          variant="critical"
          trend={{ value: '-1.4h vs last week', positive: true }}
        />
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ticket trend */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Ticket Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Open vs Resolved vs Escalated</p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={ticketTrendData}>
              <defs>
                <linearGradient id="gradOpen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }}
              />
              <Area type="monotone" dataKey="open" stroke="#3b82f6" strokeWidth={2} fill="url(#gradOpen)" name="Open" />
              <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} fill="url(#gradResolved)" name="Resolved" />
              <Area type="monotone" dataKey="escalated" stroke="#ef4444" strokeWidth={1.5} fill="none" strokeDasharray="4 2" name="Escalated" />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Issue category pie */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Issue Categories</h3>
            <p className="text-xs text-muted-foreground mt-0.5">By ticket volume</p>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={issueCategoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                {issueCategoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {issueCategoryData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-[11px]">
                <span className="size-2 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                <span className="text-muted-foreground truncate">{item.name}</span>
                <span className="ml-auto font-semibold text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Maintenance cost */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Maintenance Cost</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Actual vs Budget (RM)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={maintenanceCostData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [`RM ${v.toLocaleString()}`, '']}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }}
              />
              <Bar dataKey="cost" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Actual" />
              <Bar dataKey="budget" fill="#e2e8f0" radius={[3, 3, 0, 0]} name="Budget" />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Realtime alerts */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Realtime Alerts</h3>
            <span className="flex items-center gap-1 text-[11px] text-success">
              <span className="relative flex size-1.5">
                <span className="animate-ping absolute size-full rounded-full bg-success opacity-75" />
                <span className="relative size-1.5 rounded-full bg-success" />
              </span>
              Live
            </span>
          </div>
          <div className="space-y-2">
            {realtimeAlerts.map((alert) => (
              <div key={alert.id} className={cn(
                'p-2.5 rounded-lg border text-xs',
                alert.type === 'critical' ? 'border-destructive/30 bg-destructive/5' :
                alert.type === 'warning' ? 'border-warning/30 bg-warning/5' :
                'border-border bg-muted/40'
              )}>
                <div className="flex items-start gap-2">
                  <span className={cn(
                    'mt-0.5 size-1.5 rounded-full flex-shrink-0',
                    alert.type === 'critical' ? 'bg-destructive' :
                    alert.type === 'warning' ? 'bg-warning' : 'bg-info'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground leading-relaxed">{alert.message}</p>
                    <p className="text-muted-foreground mt-0.5">{alert.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Third row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Outlet ranking */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Outlet Performance Ranking</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Overall operational score</p>
          </div>
          <div className="space-y-2.5">
            {outletRankings.map((outlet, i) => (
              <div key={outlet.outlet} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{outlet.outlet}</span>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="text-destructive">{outlet.tickets} tickets</span>
                      <span className={cn('font-semibold', outlet.score >= 85 ? 'text-success' : outlet.score >= 70 ? 'text-warning' : 'text-destructive')}>
                        {outlet.score}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', outlet.score >= 85 ? 'bg-success' : outlet.score >= 70 ? 'bg-warning' : 'bg-destructive')}
                      style={{ width: `${outlet.score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recurring issue heatmap */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Recurring Issue Heatmap</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tickets by outlet & weekday</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr>
                  <th className="text-left font-medium text-muted-foreground pb-2 pr-3 w-24">Outlet</th>
                  {days.map((d) => (
                    <th key={d} className="text-center font-medium text-muted-foreground pb-2 w-8">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row) => (
                  <tr key={row.outlet}>
                    <td className="pr-3 py-1 text-xs text-muted-foreground">{row.outlet.replace('KL ', '')}</td>
                    {days.map((d) => {
                      const val = row[d.toLowerCase() as keyof typeof row] as number
                      return (
                        <td key={d} className="py-1">
                          <div className={cn('size-5 mx-auto rounded', heatColor(val))} title={`${val} tickets`} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-muted-foreground">Low</span>
            {[1, 2, 3, 5, 7].map((v) => (
              <div key={v} className={cn('size-3 rounded', heatColor(v))} />
            ))}
            <span className="text-[10px] text-muted-foreground">High</span>
          </div>
        </div>
      </div>

      {/* Technician activity */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Technician Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Today&apos;s workload overview</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {technicians.map((tech) => (
            <div key={tech.name} className="p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                  {tech.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{tech.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{tech.role}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Active</span>
                  <span className="font-medium">{tech.activeJobs} jobs</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Done today</span>
                  <span className="font-medium text-success">{tech.completedToday}</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className={cn('font-medium', tech.utilization > 80 ? 'text-destructive' : tech.utilization > 60 ? 'text-warning' : 'text-success')}>
                      {tech.utilization}%
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', tech.utilization > 80 ? 'bg-destructive' : tech.utilization > 60 ? 'bg-warning' : 'bg-success')}
                      style={{ width: `${tech.utilization}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
