'use client'

import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Zap, ShoppingCart, Megaphone, BookOpen, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { ApprovalType } from '@/lib/types'

export function ExecutiveDashboardPage() {
  const { issues, tasks, approvals } = useIssueStore()

  // Derived KPIs from live data
  const activeIssues    = issues.filter((i) => !['resolved', 'closed'].includes(i.status))
  const openIssues      = issues.filter((i) => i.status === 'open')
  const slaBreaches     = issues.filter((i) => i.slaBreach)
  const criticalIssues  = issues.filter((i) => i.priority === 'critical')
  const activeTasks     = tasks.filter((t) => t.status !== 'resolved' && t.status !== 'closed')
  const pendingApprovals = approvals.filter((a) => a.status === 'pending')

  // Issues by category
  const byCategory = issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + 1
    return acc
  }, {})
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const maxCat = categoryEntries[0]?.[1] ?? 1

  // Issues by outlet
  const byOutlet = issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.outlet] = (acc[i.outlet] ?? 0) + 1
    return acc
  }, {})
  const outletEntries = Object.entries(byOutlet).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Pending approvals by type
  const pendingByType: Record<ApprovalType, number> = {
    procurement: 0, marketing: 0, training: 0, 'asset-purchase': 0,
  }
  pendingApprovals.forEach((a) => { pendingByType[a.type] = (pendingByType[a.type] ?? 0) + 1 })

  const typeConfig: { type: ApprovalType; label: string; icon: React.ReactNode }[] = [
    { type: 'procurement',    label: 'Procurement',    icon: <ShoppingCart className="size-4" /> },
    { type: 'marketing',      label: 'Marketing',      icon: <Megaphone    className="size-4" /> },
    { type: 'training',       label: 'Training',       icon: <BookOpen     className="size-4" /> },
    { type: 'asset-purchase', label: 'Asset Purchase', icon: <Package      className="size-4" /> },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Operational health and performance overview</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard title="Total Issues"      value={String(issues.length)}        subtitle="All time"         color="bg-blue-100 text-blue-700"    />
        <KPICard title="Active Issues"     value={String(activeIssues.length)}   subtitle="Not resolved"     color="bg-amber-100 text-amber-700"  />
        <KPICard title="Open Issues"       value={String(openIssues.length)}     subtitle="Awaiting action"  color="bg-orange-100 text-orange-700"/>
        <KPICard title="SLA Breaches"      value={String(slaBreaches.length)}    subtitle="Overdue"          color="bg-red-100 text-red-700"      />
        <KPICard title="Active Tasks"      value={String(activeTasks.length)}    subtitle="In progress"      color="bg-purple-100 text-purple-700"/>
        <KPICard title="Pending Approvals" value={String(pendingApprovals.length)} subtitle="Awaiting review" color="bg-green-100 text-green-700"  />
      </div>

      {/* Issues by Category & Outlet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">Issues by Category</h3>
          {categoryEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No issues yet</p>
          ) : (
            <div className="space-y-2">
              {categoryEntries.map(([label, count]) => (
                <div key={label}>
                  <div className="flex justify-between mb-1 text-xs">
                    <span>{label}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(count / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">Issues by Outlet</h3>
          {outletEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No issues yet</p>
          ) : (
            <div className="space-y-2">
              {outletEntries.map(([outlet, count]) => (
                <div key={outlet} className="flex items-center justify-between p-2 rounded bg-background/50 text-sm">
                  <p className="font-medium">{outlet}</p>
                  <span className="font-semibold text-xs text-muted-foreground">{count} issue{count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Critical Issues & Approvals Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">Critical &amp; High Issues</h3>
          {criticalIssues.length === 0 && issues.filter((i) => i.priority === 'high').length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
              <CheckCircle2 className="size-4 flex-shrink-0" />
              No critical or high-priority issues
            </div>
          ) : (
            <div className="space-y-2">
              {issues
                .filter((i) => i.priority === 'critical' || i.priority === 'high')
                .filter((i) => !['resolved', 'closed'].includes(i.status))
                .slice(0, 5)
                .map((issue) => (
                  <div key={issue.id} className="p-3 rounded bg-background/50 border border-border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-primary font-semibold mb-1">{issue.number}</p>
                        <p className="text-sm font-medium truncate">{issue.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{issue.outlet}</p>
                      </div>
                      <span className={cn(
                        'text-xs font-semibold px-2 py-1 rounded-full ml-2 whitespace-nowrap',
                        issue.priority === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
                      </span>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">Approvals Pending</h3>
          <div className="space-y-3">
            {typeConfig.map(({ type, label, icon }) => (
              <div key={type} className="p-2.5 rounded bg-background/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{icon}</span>
                  <p className="text-xs font-medium">{label}</p>
                </div>
                <span className={cn(
                  'text-lg font-bold',
                  (pendingByType[type] ?? 0) > 0 ? 'text-amber-600' : 'text-muted-foreground'
                )}>
                  {pendingByType[type] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({
  title, value, subtitle, color,
}: {
  title: string; value: string; subtitle: string; color: string
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20 hover:shadow-sm transition-shadow">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
    </div>
  )
}
