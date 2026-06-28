'use client'

import { ClipboardCheck, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { StatCard } from '@/components/shared/stat-card'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'

export function QAPage() {
  const { issues, outlets, updateIssueStatus } = useIssueStore()

  const complianceIssues = issues.filter(i => i.category === 'Compliance')
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  const openCAPAs     = complianceIssues.filter(i => i.status !== 'resolved' && i.status !== 'closed')
  const resolvedMonth = complianceIssues.filter(i => {
    if (i.status !== 'resolved' && i.status !== 'closed') return false
    const d = new Date(i.createdDate)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const criticalCount = complianceIssues.filter(i => i.priority === 'critical').length
  const closureRate   = complianceIssues.length
    ? Math.round((complianceIssues.filter(i => i.status === 'resolved' || i.status === 'closed').length / complianceIssues.length) * 100)
    : 0

  // QA score per outlet: resolved/total * 100, min 50 if any issues
  const qaScoreData = outlets.map(o => {
    const outletIssues = complianceIssues.filter(i => i.outlet === o.name)
    if (outletIssues.length === 0) return null
    const resolved = outletIssues.filter(i => i.status === 'resolved' || i.status === 'closed').length
    const score = Math.max(50, Math.round((resolved / outletIssues.length) * 100))
    return { outlet: o.code || o.name.slice(0, 8), score }
  }).filter(Boolean) as { outlet: string; score: number }[]

  const rootCauseSummary = [
    { cause: 'Staff Training Gap',  count: complianceIssues.filter(i => /train/i.test(i.description)).length   || 0 },
    { cause: 'SOP Non-Compliance',  count: complianceIssues.filter(i => /sop|procedure/i.test(i.description)).length || 0 },
    { cause: 'Equipment Failure',   count: complianceIssues.filter(i => /equip|machine/i.test(i.description)).length || 0 },
    { cause: 'Other',               count: complianceIssues.length },
  ]
  const maxRc = Math.max(1, ...rootCauseSummary.map(r => r.count))

  return (
    <div className="p-5 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Open CAPAs"
          value={String(openCAPAs.length)}
          subtitle={`${openCAPAs.filter(i => i.slaBreach).length} approaching SLA`}
          icon={AlertTriangle}
          variant={openCAPAs.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="Resolved This Month"
          value={String(resolvedMonth.length)}
          subtitle={`Closure rate ${closureRate}%`}
          icon={CheckCircle2}
          variant={closureRate >= 70 ? 'success' : 'warning'}
        />
        <StatCard
          title="Total Compliance Issues"
          value={String(complianceIssues.length)}
          subtitle={`${closureRate}% resolved`}
          icon={ClipboardCheck}
          variant={closureRate >= 85 ? 'success' : 'warning'}
        />
        <StatCard
          title="Critical Issues"
          value={String(criticalCount)}
          subtitle="Requiring immediate action"
          icon={TrendingUp}
          variant={criticalCount > 0 ? 'critical' : 'success'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CAPA workflow */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold">CAPA Workflow Board</h3>
          {complianceIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
              <ClipboardCheck className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No compliance issues</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create an issue with category &ldquo;Compliance&rdquo; to see CAPA items here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {complianceIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="w-full text-left p-3.5 rounded-xl border bg-card shadow-sm border-border"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground">{issue.number}</span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                        {issue.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <PriorityBadge priority={issue.priority} />
                      <StatusBadge status={issue.status} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-foreground mb-1.5">{issue.title}</p>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span>{issue.outlet}</span>
                    <span>·</span>
                    <span>
                      Due:{' '}
                      <span className={cn('font-medium', issue.dueDate && new Date(issue.dueDate) < now ? 'text-destructive' : '')}>
                        {issue.dueDate ?? '—'}
                      </span>
                    </span>
                    <span>·</span>
                    <span>Assignee: {issue.assignee.split(' ')[0] || '—'}</span>
                  </div>
                  {issue.description && (
                    <div className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {issue.description}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    {(['resolved', 'closed'] as const).map(s => (
                      <button
                        key={s}
                        disabled={issue.status === s}
                        onClick={() => updateIssueStatus(issue.id, s)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                          issue.status === s
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        )}
                      >
                        {s === 'resolved' ? 'Mark Resolved' : 'Close CAPA'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QA Score + Root Cause */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">QA Score by Outlet</h3>
            {qaScoreData.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No outlet data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={qaScoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="outlet" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} />
                  <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Target', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
                  <Bar dataKey="score" radius={[3, 3, 0, 0]} fill="#3b82f6" label={{ position: 'top', fontSize: 9, fill: 'var(--color-muted-foreground)' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Root Cause Analysis</h3>
            <div className="space-y-2">
              {rootCauseSummary.map((rc) => (
                <div key={rc.cause}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-muted-foreground">{rc.cause}</span>
                    <span className="font-medium">{rc.count} issues</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((rc.count / maxRc) * 100)}%` }} />
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
