'use client'

import { BarChart3, PieChart, TrendingUp, AlertTriangle, CheckCircle2, Clock, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { IssueStatus, Priority } from '@/lib/types'
import { QAScoresPanel } from '@/components/qa/qa-scores-panel'
import { useT } from '@/lib/i18n'
import { issueWorkState } from '@/lib/issue-work-state'
import { GuestKpiPanel } from '@/components/guest/guest-kpi-panel'
import { OpsKpiPanel } from '@/components/ops/kpi-panel'
import { navigate } from '@/lib/use-route'
import { hasPermission } from '@/lib/access'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'

const STATUS_ORDER: IssueStatus[] = ['open', 'assigned', 'in-progress', 'waiting', 'resolved', 'closed', 'cancelled']
const STATUS_COLORS: Record<IssueStatus, string> = {
  open: 'bg-blue-500', assigned: 'bg-purple-500', 'in-progress': 'bg-amber-500',
  waiting: 'bg-cyan-500', resolved: 'bg-green-500', closed: 'bg-gray-400', cancelled: 'bg-rose-400',
}

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']
const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-green-500',
}
const PRIORITY_TEXT: Record<Priority, string> = {
  critical: 'text-red-700', high: 'text-orange-700', medium: 'text-amber-700', low: 'text-green-700',
}

export function AnalyticsDashboardPage() {
  // Aggregates every issue/task/approval: loads them all when opened (Todo-Pilot §22)
  useEnsureLoaded('core')
  const currentUser = useIssueStore((s) => s.currentUser)
  const { issues, tasks, approvals } = useIssueStore()
  const { t, label } = useT()

  // ── Issue aggregates ──────────────────────────────────────────────────────
  const totalIssues    = issues.length
  const resolvedClosed = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length
  const slaBreaches    = issues.filter((i) => i.slaBreach).length
  // Still being worked on — cancelled and finished-but-not-closed are not "active" (Todo-Pilot §18).
  const activeIssues   = issues.filter((i) => issueWorkState(i) === 'in-progress').length

  const issueByStatus = STATUS_ORDER.map((s) => ({
    status: s,
    label: label('status', s),
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
    if (issueWorkState(i) === 'in-progress') acc[i.outlet].active++
    return acc
  }, {})
  const outletEntries = Object.entries(outletMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)

  // ── Task aggregates ───────────────────────────────────────────────────────
  const totalTasks      = tasks.length
  const taskByStatus = STATUS_ORDER.map((s) => ({
    status: s,
    label: label('status', s),
    color: STATUS_COLORS[s],
    count: tasks.filter((task) => task.status === s).length,
  }))
  const maxTaskCount = Math.max(1, ...taskByStatus.map((s) => s.count))

  // ── Approval aggregates ───────────────────────────────────────────────────
  const totalApprovals    = approvals.length
  const pendingApprovals  = approvals.filter((a) => a.status === 'pending').length
  const approvedApprovals = approvals.filter((a) => a.status === 'approved').length
  const rejectedApprovals = approvals.filter((a) => a.status === 'rejected').length

  // Maintenance was missing although it is the most common approval type.
  const approvalByType = (['maintenance', 'procurement', 'marketing', 'training', 'asset-purchase'] as const).map((type) => ({
    type,
    label: label('approvalType', type),
    count: approvals.filter((a) => a.type === type).length,
  }))
  const maxTypeCount = Math.max(1, ...approvalByType.map((t) => t.count))

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('analytics.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('analytics.subtitle')}</p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={<ClipboardList className="size-4" />} title={t('analytics.totalIssues')} value={totalIssues}    color="bg-blue-100 text-blue-700"    />
        <MetricCard icon={<TrendingUp    className="size-4" />} title={t('analytics.activeIssues')} value={activeIssues}   color="bg-amber-100 text-amber-800"  />
        <MetricCard icon={<CheckCircle2  className="size-4" />} title={t('analytics.resolvedClosed')} value={resolvedClosed} color="bg-green-100 text-green-800"  />
        <MetricCard icon={<AlertTriangle className="size-4" />} title={t('analytics.slaBreaches')} value={slaBreaches}    color="bg-red-100 text-red-700"      />
        <MetricCard icon={<Clock         className="size-4" />} title={t('analytics.pendingApprovals')} value={pendingApprovals} color="bg-orange-100 text-orange-800" />
        <MetricCard icon={<BarChart3     className="size-4" />} title={t('analytics.totalTasks')} value={totalTasks}     color="bg-purple-100 text-purple-700" />
      </div>

      {/* Issues by Status + Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={t('analytics.byStatus')} icon={<BarChart3 className="size-4" />}>
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

        <ChartCard title={t('analytics.byPriority')} icon={<PieChart className="size-4" />}>
          {totalIssues === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {issueByPriority.map(({ priority, color, textColor, count }) => (
                <div key={priority} className="flex items-center gap-3">
                  <div className={cn('size-3 rounded-full flex-shrink-0', color)} />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1 text-xs">
                      <span className="font-medium">{label('priority', priority)}</span>
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
        <ChartCard title={t('analytics.byCategory')} icon={<PieChart className="size-4" />}>
          {categoryEntries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2.5">
              {categoryEntries.map(([category, count]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-medium">{label('category', category)}</span>
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

        <ChartCard title={t('analytics.byOutlet')} icon={<BarChart3 className="size-4" />}>
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
                        resolvedPct >= 80 ? 'bg-green-100 text-green-800' :
                        resolvedPct >= 50 ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-700'
                      )}>
                        {t('analytics.resolvedPct', { pct: resolvedPct })}
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
                      <span>{t('analytics.resolvedOf', { done: total - active, total })}</span>
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
        <ChartCard title={t('analytics.tasksByStatus')} icon={<BarChart3 className="size-4" />}>
          {totalTasks === 0 ? (
            <EmptyState label={t('analytics.noTasks')} />
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

        <ChartCard title={t('analytics.approvalsSummary')} icon={<TrendingUp className="size-4" />}>
          {totalApprovals === 0 ? (
            <EmptyState label={t('analytics.noApprovals')} />
          ) : (
            <div className="space-y-4">
              {/* Status summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { text: label('approvalStatus', 'pending'),  count: pendingApprovals,  color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                  { text: label('approvalStatus', 'approved'), count: approvedApprovals, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
                  { text: label('approvalStatus', 'rejected'), count: rejectedApprovals, color: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
                ].map(({ text, count, color, bg }) => (
                  <div key={text} className={cn('p-3 rounded-md border text-center', bg)}>
                    <p className={cn('text-xl font-bold', color)}>{count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{text}</p>
                  </div>
                ))}
              </div>
              {/* By type */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('analytics.byType')}</p>
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

      {/* Daily checklist compliance per outlet, worst first (Todo-Ops-Checklist Fase 3) */}
      {hasPermission(currentUser, 'ops') && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">{t('analytics.opsCompliance')}</h2>
          <OpsKpiPanel compact onOutlet={(o) => navigate(`/ops?tab=history&outlet=${encodeURIComponent(o)}`)} />
        </div>
      )}

      {/* QA audit scores per outlet + monthly trend (Todo-Pilot §7) */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">{t('analytics.qaScores')}</h2>
        <QAScoresPanel />
      </div>

      {/* Guest complaint response KPIs (Todo-Pilot §8) */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">{t('analytics.guestKpis')}</h2>
        <GuestKpiPanel compact />
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

function EmptyState({ label }: { label?: string }) {
  const { t } = useT()
  return (
    <p className="text-sm text-muted-foreground text-center py-8">{label ?? t('analytics.noIssues')}</p>
  )
}
