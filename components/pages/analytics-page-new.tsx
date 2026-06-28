'use client'

import { BarChart3, PieChart, TrendingUp, AlertTriangle, CheckCircle2, Clock, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { IssueStatus, Priority } from '@/lib/types'

const STATUS_ORDER: IssueStatus[] = ['open', 'assigned', 'in-progress', 'waiting', 'resolved', 'closed']
const STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'Open', assigned: 'Assigned', 'in-progress': 'In Progress',
  waiting: 'Waiting', resolved: 'Resolved', closed: 'Closed',
}
const STATUS_COLORS: Record<IssueStatus, string> = {
  open: 'bg-blue-500', assigned: 'bg-purple-500', 'in-progress': 'bg-amber-500',
  waiting: 'bg-cyan-500', resolved: 'bg-green-500', closed: 'bg-gray-400',
}

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']
const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-green-500',
}
const PRIORITY_TEXT: Record<Priority, string> = {
  critical: 'text-red-700', high: 'text-orange-700', medium: 'text-amber-700', low: 'text-green-700',
}

export function AnalyticsDashboardPage() {
  const { issues, tasks, approvals } = useIssueStore()

  // ── Issue aggregates ──────────────────────────────────────────────────────
  const totalIssues    = issues.length
  const resolvedClosed = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length
  const slaBreaches    = issues.filter((i) => i.slaBreach).length
  const activeIssues   = issues.filter((i) => !['resolved', 'closed'].includes(i.status)).length

  const issueByStatus = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    color: STATUS_COLORS[s],
    count: issues.filter((i) => i.status === s).length,
  }))
  const maxStatusCount = Math.max(1, ...issueByStatus.map((s) => s.count))

  const issueByPriority = PRIORITY_ORDER.map((p) => ({
    priority: p,
    color: PRIORITY_COLORS[p],
    textColor: PRIORITY_TEXT[p],
    count: issues.filter((i) => i.priority === p).length,
  }))
  const maxPriorityCount = Math.max(1, ...issueByPriority.map((p) => p.count))

  const categoryMap = issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + 1
    return acc
  }, {})
  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])
  const maxCategoryCount = Math.max(1, categoryEntries[0]?.[1] ?? 1)

  const outletMap = issues.reduce<Record<string, { total: number; active: number }>>((acc, i) => {
    if (!acc[i.outlet]) acc[i.outlet] = { total: 0, active: 0 }
    acc[i.outlet].total++
    if (!['resolved', 'closed'].includes(i.status)) acc[i.outlet].active++
    return acc
  }, {})
  const outletEntries = Object.entries(outletMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)

  // ── Task aggregates ───────────────────────────────────────────────────────
  const totalTasks      = tasks.length
  const taskByStatus = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    color: STATUS_COLORS[s],
    count: tasks.filter((t) => t.status === s).length,
  }))
  const maxTaskCount = Math.max(1, ...taskByStatus.map((s) => s.count))

  // ── Approval aggregates ───────────────────────────────────────────────────
  const totalApprovals    = approvals.length
  const pendingApprovals  = approvals.filter((a) => a.status === 'pending').length
  const approvedApprovals = approvals.filter((a) => a.status === 'approved').length
  const rejectedApprovals = approvals.filter((a) => a.status === 'rejected').length

  const approvalByType = ['procurement', 'marketing', 'training', 'asset-purchase'].map((type) => ({
    type,
    label: type === 'asset-purchase' ? 'Asset Purchase' : type.charAt(0).toUpperCase() + type.slice(1),
    count: approvals.filter((a) => a.type === type).length,
  }))
  const maxTypeCount = Math.max(1, ...approvalByType.map((t) => t.count))

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Live metrics computed from all operational data</p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={<ClipboardList className="size-4" />} title="Total Issues"    value={totalIssues}    color="bg-blue-100 text-blue-700"    />
        <MetricCard icon={<TrendingUp    className="size-4" />} title="Active Issues"   value={activeIssues}   color="bg-amber-100 text-amber-700"  />
        <MetricCard icon={<CheckCircle2  className="size-4" />} title="Resolved/Closed" value={resolvedClosed} color="bg-green-100 text-green-700"  />
        <MetricCard icon={<AlertTriangle className="size-4" />} title="SLA Breaches"    value={slaBreaches}    color="bg-red-100 text-red-700"      />
        <MetricCard icon={<Clock         className="size-4" />} title="Pending Approvals" value={pendingApprovals} color="bg-orange-100 text-orange-700" />
        <MetricCard icon={<BarChart3     className="size-4" />} title="Total Tasks"     value={totalTasks}     color="bg-purple-100 text-purple-700" />
      </div>

      {/* Issues by Status + Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Issues by Status" icon={<BarChart3 className="size-4" />}>
          {totalIssues === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2.5">
              {issueByStatus.map(({ status, label, color, count }) => (
                <div key={status}>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={cn(color, 'h-2 rounded-full transition-all')} style={{ width: `${(count / maxStatusCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Issues by Priority" icon={<PieChart className="size-4" />}>
          {totalIssues === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {issueByPriority.map(({ priority, color, textColor, count }) => (
                <div key={priority} className="flex items-center gap-3">
                  <div className={cn('size-3 rounded-full flex-shrink-0', color)} />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1 text-xs">
                      <span className="font-medium capitalize">{priority}</span>
                      <span className={cn('font-bold', textColor)}>{count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className={cn(color, 'h-2 rounded-full transition-all')} style={{ width: `${(count / maxPriorityCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Issues by Category + Outlet Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Issues by Category" icon={<PieChart className="size-4" />}>
          {categoryEntries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2.5">
              {categoryEntries.map(([label, count]) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${(count / maxCategoryCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Issues by Outlet" icon={<BarChart3 className="size-4" />}>
          {outletEntries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {outletEntries.map(([outlet, { total, active }]) => {
                const resolvedPct = total > 0 ? Math.round(((total - active) / total) * 100) : 0
                return (
                  <div key={outlet} className="p-3 rounded-md bg-muted/30 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-xs">{outlet}</span>
                      <span className={cn(
                        'text-xs font-bold px-2 py-0.5 rounded-full',
                        resolvedPct >= 80 ? 'bg-green-100 text-green-700' :
                        resolvedPct >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {resolvedPct}% resolved
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="flex-1">
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className={cn('h-1.5 rounded-full', resolvedPct >= 80 ? 'bg-green-500' : resolvedPct >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                            style={{ width: `${resolvedPct}%` }}
                          />
                        </div>
                      </div>
                      <span>{total - active}/{total} resolved</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tasks by Status + Approvals summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Tasks by Status" icon={<BarChart3 className="size-4" />}>
          {totalTasks === 0 ? (
            <EmptyState label="No tasks yet" />
          ) : (
            <div className="space-y-2.5">
              {taskByStatus.map(({ status, label, color, count }) => (
                <div key={status}>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={cn(color, 'h-2 rounded-full transition-all')} style={{ width: `${(count / maxTaskCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Approvals Summary" icon={<TrendingUp className="size-4" />}>
          {totalApprovals === 0 ? (
            <EmptyState label="No approvals yet" />
          ) : (
            <div className="space-y-4">
              {/* Status summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pending',  count: pendingApprovals,  color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                  { label: 'Approved', count: approvedApprovals, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                  { label: 'Rejected', count: rejectedApprovals, color: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
                ].map(({ label, count, color, bg }) => (
                  <div key={label} className={cn('p-3 rounded-md border text-center', bg)}>
                    <p className={cn('text-xl font-bold', color)}>{count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {/* By type */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">By Type</p>
                {approvalByType.map(({ type, label, count }) => (
                  <div key={type}>
                    <div className="flex justify-between mb-1 text-xs">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground font-semibold">{count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(count / maxTypeCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function MetricCard({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20 hover:shadow-sm transition-shadow">
      <div className={cn('inline-flex p-1.5 rounded-md mb-3', color)}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 font-medium">{title}</p>
    </div>
  )
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ label = 'No issues yet' }: { label?: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-8">{label}</p>
  )
}
