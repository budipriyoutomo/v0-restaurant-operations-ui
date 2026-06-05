'use client'

import { TrendingUp, Calendar, BarChart3, PieChart, LineChart, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AnalyticsDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Issue metrics, resolution trends, SLA performance, and operational insights</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors font-medium text-sm">
          <Calendar className="size-4" />
          Jun 1 - Jun 4
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Total Issues" value="1,240" change="+12%" trend="up" />
        <MetricCard title="Resolved Issues" value="1,128" change="+15%" trend="up" />
        <MetricCard title="Avg Resolution Time" value="18.5h" change="-2.3h" trend="up" />
        <MetricCard title="SLA Compliance" value="96.5%" change="+1.2%" trend="up" />
        <MetricCard title="Customer Satisfaction" value="4.2/5" change="+0.1" trend="up" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Trend */}
        <div className="p-6 rounded-lg border border-border bg-muted/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Issue Trend (30 Days)</h3>
            <LineChart className="size-5 text-muted-foreground" />
          </div>
          <div className="h-64 rounded bg-gradient-to-br from-blue-50 to-transparent flex items-end justify-between gap-1 p-4">
            {[30, 35, 32, 45, 40, 52, 48, 60, 58, 65, 62, 70, 68, 75, 72, 80, 78, 85, 82, 90, 88, 95, 92, 98, 100, 105, 102, 110, 108, 115].map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity group relative"
                style={{ height: `${(height / 120) * 100}%` }}
              >
                <div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap transition-opacity">
                  {height}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
            <div className="p-2 rounded bg-background/50">
              <p className="text-muted-foreground">Total</p>
              <p className="font-bold text-lg">1,240</p>
            </div>
            <div className="p-2 rounded bg-background/50">
              <p className="text-muted-foreground">Avg/Day</p>
              <p className="font-bold text-lg">41</p>
            </div>
            <div className="p-2 rounded bg-background/50">
              <p className="text-muted-foreground">Peak</p>
              <p className="font-bold text-lg">115</p>
            </div>
          </div>
        </div>

        {/* Resolution Trend */}
        <div className="p-6 rounded-lg border border-border bg-muted/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Resolution Trend</h3>
            <TrendingUp className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {[
              { label: 'Critical', resolved: 95, total: 98, color: 'bg-red-500' },
              { label: 'High', resolved: 142, total: 156, color: 'bg-orange-500' },
              { label: 'Medium', resolved: 587, total: 640, color: 'bg-amber-500' },
              { label: 'Low', resolved: 304, total: 346, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.resolved}/{item.total}</span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full`}
                    style={{ width: `${(item.resolved / item.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue by Category */}
        <div className="p-6 rounded-lg border border-border bg-muted/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Issues by Category</h3>
            <PieChart className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {[
              { label: 'Maintenance', count: 287, percent: 23, color: 'bg-blue-500' },
              { label: 'IT Support', count: 198, percent: 16, color: 'bg-purple-500' },
              { label: 'QA & Compliance', count: 187, percent: 15, color: 'bg-green-500' },
              { label: 'Training', count: 142, percent: 11, color: 'bg-orange-500' },
              { label: 'Procurement', count: 156, percent: 13, color: 'bg-indigo-500' },
              { label: 'Marketing', count: 89, percent: 7, color: 'bg-pink-500' },
              { label: 'Guest Service', count: 181, percent: 15, color: 'bg-cyan-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`${item.color} size-3 rounded-full`} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">{item.count}</span>
                </div>
                <div className="w-full bg-background rounded-full h-1.5">
                  <div
                    className={`${item.color} h-1.5 rounded-full`}
                    style={{ width: `${item.percent * 3.33}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outlet Performance */}
        <div className="p-6 rounded-lg border border-border bg-muted/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Outlet Performance</h3>
            <BarChart3 className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {[
              { outlet: 'KL Central', health: 96, issues: 28, resolved: 26 },
              { outlet: 'KLCC', health: 94, issues: 35, resolved: 32 },
              { outlet: 'Bangsar', health: 92, issues: 42, resolved: 38 },
              { outlet: 'Damansara', health: 89, issues: 48, resolved: 41 },
              { outlet: 'Subang', health: 85, issues: 52, resolved: 44 },
            ].map((item) => (
              <div key={item.outlet} className="p-3 rounded bg-background/50 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs">{item.outlet}</span>
                  <span className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded-full',
                    item.health >= 90 ? 'bg-green-100 text-green-700' :
                    item.health >= 85 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {item.health}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="flex-1">
                    <div className="w-full bg-background rounded-full h-1.5">
                      <div
                        className={cn(
                          'h-1.5 rounded-full',
                          item.health >= 90 ? 'bg-green-500' :
                          item.health >= 85 ? 'bg-amber-500' :
                          'bg-red-500'
                        )}
                        style={{ width: `${item.health}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap">{item.resolved}/{item.issues}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SLA Performance & Response Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLA Compliance by Priority */}
        <div className="p-6 rounded-lg border border-border bg-muted/20">
          <h3 className="font-semibold text-lg mb-6">SLA Compliance by Priority</h3>
          <div className="space-y-4">
            {[
              { priority: 'Critical', sla: 98, target: 95, color: 'text-red-600' },
              { priority: 'High', sla: 94, target: 90, color: 'text-orange-600' },
              { priority: 'Medium', sla: 91, target: 85, color: 'text-amber-600' },
              { priority: 'Low', sla: 87, target: 80, color: 'text-green-600' },
            ].map((item) => (
              <div key={item.priority}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{item.priority}</span>
                  <div className="flex items-center gap-4">
                    <span className={cn('font-bold text-lg', item.color)}>{item.sla}%</span>
                    <span className="text-xs text-muted-foreground">Target: {item.target}%</span>
                  </div>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full',
                      item.sla >= item.target ? 'bg-green-500' : 'bg-amber-500'
                    )}
                    style={{ width: `${item.sla}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Response Time by Category */}
        <div className="p-6 rounded-lg border border-border bg-muted/20">
          <h3 className="font-semibold text-lg mb-6">Avg Response Time by Category</h3>
          <div className="space-y-3">
            {[
              { category: 'Maintenance', time: '2.5h', trend: '↓ 0.3h' },
              { category: 'IT Support', time: '1.8h', trend: '↓ 0.2h' },
              { category: 'QA & Compliance', time: '4.2h', trend: '→ 0h' },
              { category: 'Training', time: '8.5h', trend: '↑ 0.5h' },
              { category: 'Procurement', time: '12.3h', trend: '↓ 1.2h' },
              { category: 'Marketing', time: '6.1h', trend: '↓ 0.4h' },
              { category: 'Guest Service', time: '3.7h', trend: '↓ 0.1h' },
            ].map((item) => (
              <div key={item.category} className="flex items-center justify-between p-2 rounded bg-background/50">
                <span className="text-sm font-medium">{item.category}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold font-mono">{item.time}</span>
                  <span className="text-xs text-green-600">{item.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  trend,
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20 hover:shadow-sm transition-shadow">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-2xl font-bold">{value}</p>
        <div className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full',
          trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        )}>
          {change}
        </div>
      </div>
    </div>
  )
}
