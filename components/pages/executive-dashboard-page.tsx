'use client'

import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ExecutiveDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Operational health and performance overview</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard
          title="Operational Health"
          value="94%"
          change="+2%"
          trend="up"
          subtitle="System wide"
          color="bg-blue-100 text-blue-700"
        />
        <KPICard
          title="Open Issues"
          value="127"
          change="+8"
          trend="down"
          subtitle="Last 24h"
          color="bg-amber-100 text-amber-700"
        />
        <KPICard
          title="Overdue Issues"
          value="12"
          change="-3"
          trend="up"
          subtitle="Attention needed"
          color="bg-red-100 text-red-700"
        />
        <KPICard
          title="SLA Compliance"
          value="96.5%"
          change="+1.2%"
          trend="up"
          subtitle="This month"
          color="bg-green-100 text-green-700"
        />
        <KPICard
          title="Active Tasks"
          value="284"
          change="+24"
          trend="down"
          subtitle="In progress"
          color="bg-purple-100 text-purple-700"
        />
        <KPICard
          title="Critical Incidents"
          value="2"
          change="0"
          trend="neutral"
          subtitle="Escalated"
          color="bg-destructive/10 text-destructive"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Issue Trend Chart */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Issue Trend (30 Days)</h3>
            <select className="text-xs px-2 py-1 rounded border border-border bg-background">
              <option>Last 30 days</option>
              <option>Last 60 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-48 rounded bg-gradient-to-br from-blue-50 to-transparent flex items-end justify-between gap-1 p-4">
            {[45, 52, 48, 65, 58, 72, 68, 75, 82, 78, 85, 88, 92, 89, 95].map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                style={{ height: `${(height / 100) * 100}%` }}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
            <div className="p-2 rounded bg-background/50">
              <p className="text-muted-foreground">Total Issues</p>
              <p className="font-bold text-lg">1,240</p>
            </div>
            <div className="p-2 rounded bg-background/50">
              <p className="text-muted-foreground">Avg/Day</p>
              <p className="font-bold text-lg">41</p>
            </div>
            <div className="p-2 rounded bg-background/50">
              <p className="text-muted-foreground">Peak Day</p>
              <p className="font-bold text-lg">95</p>
            </div>
          </div>
        </div>

        {/* SLA Performance */}
        <div className="p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">SLA Performance</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1 text-xs">
                <span>Critical</span>
                <span className="font-semibold">98%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '98%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-xs">
                <span>High</span>
                <span className="font-semibold">94%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '94%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-xs">
                <span>Medium</span>
                <span className="font-semibold">91%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '91%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-xs">
                <span>Low</span>
                <span className="font-semibold">87%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '87%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Issues by Category & Outlet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">Issues by Category</h3>
          <div className="space-y-2">
            {[
              { label: 'Maintenance', count: 287, color: 'bg-blue-500', percent: 28 },
              { label: 'Procurement', count: 156, color: 'bg-purple-500', percent: 15 },
              { label: 'Training', count: 142, color: 'bg-green-500', percent: 14 },
              { label: 'Compliance', count: 198, color: 'bg-amber-500', percent: 19 },
              { label: 'Other', count: 257, color: 'bg-gray-500', percent: 24 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-1 text-xs">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.percent * 3.33}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">Outlet Performance</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[
              { outlet: 'KL Central', health: 96, issues: 28 },
              { outlet: 'Bangsar', health: 92, issues: 34 },
              { outlet: 'KLCC', health: 88, issues: 45 },
              { outlet: 'Damansara', health: 94, issues: 31 },
              { outlet: 'Subang', health: 85, issues: 52 },
            ].map((item) => (
              <div key={item.outlet} className="flex items-center justify-between p-2 rounded bg-background/50 text-sm">
                <div className="flex-1">
                  <p className="font-medium">{item.outlet}</p>
                  <p className="text-xs text-muted-foreground">{item.issues} open issues</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-background rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        item.health >= 90 ? 'bg-green-500' : item.health >= 80 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${item.health}%` }}
                    />
                  </div>
                  <span className="font-semibold text-xs w-8 text-right">{item.health}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Critical Issues */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">Critical Issues</h3>
          <div className="space-y-2">
            {[
              { id: 'ISS-2026-00145', title: 'Kitchen AC System Breakdown', outlet: 'KL Central', due: '2 hours', priority: 'critical' },
              { id: 'ISS-2026-00142', title: 'POS System Network Issue', outlet: 'KLCC', due: '4 hours', priority: 'critical' },
              { id: 'ISS-2026-00138', title: 'Food Safety Compliance Finding', outlet: 'Subang', due: '1 day', priority: 'high' },
            ].map((issue) => (
              <div key={issue.id} className="p-3 rounded bg-background/50 border border-border hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-primary font-semibold mb-1">{issue.id}</p>
                    <p className="text-sm font-medium truncate">{issue.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{issue.outlet}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-1 rounded-full',
                      issue.priority === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {issue.priority === 'critical' ? 'Critical' : 'High'}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{issue.due}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approvals Waiting */}
        <div className="p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">Approvals Pending</h3>
          <div className="space-y-3">
            {[
              { type: 'Procurement', count: 2, icon: '🛒' },
              { type: 'Marketing', count: 1, icon: '📢' },
              { type: 'Training', count: 0, icon: '📚' },
              { type: 'Asset Purchase', count: 1, icon: '📦' },
            ].map((approval) => (
              <div key={approval.type} className="p-2.5 rounded bg-background/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{approval.icon}</span>
                  <div>
                    <p className="text-xs font-medium">{approval.type}</p>
                  </div>
                </div>
                <span className={cn(
                  'text-lg font-bold',
                  approval.count > 0 ? 'text-amber-600' : 'text-muted-foreground'
                )}>
                  {approval.count}
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
  title,
  value,
  change,
  trend,
  subtitle,
  color,
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  subtitle: string
  color: string
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20 hover:shadow-sm transition-shadow">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold">{value}</p>
        <div className={cn('flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded', color)}>
          {trend === 'up' ? (
            <TrendingUp className="size-3" />
          ) : trend === 'down' ? (
            <TrendingDown className="size-3" />
          ) : null}
          {change}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
    </div>
  )
}
