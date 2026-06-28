'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { MessageSquareWarning, ThumbsDown, CheckCircle2, Clock, HeartHandshake } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'

const SENTIMENT_COLORS = {
  negative: '#ef4444',
  neutral:  '#f59e0b',
  positive: '#10b981',
}

function getSentiment(priority: string): 'negative' | 'neutral' | 'positive' {
  if (priority === 'critical' || priority === 'high') return 'negative'
  if (priority === 'medium') return 'neutral'
  return 'positive'
}

export function GuestPage() {
  const { issues, updateIssueStatus } = useIssueStore()

  const guestIssues = issues.filter(i => i.category === 'Guest Service')
  const now = new Date()

  const unresolved = guestIssues.filter(i => i.status !== 'resolved' && i.status !== 'closed')
  const escalated  = guestIssues.filter(i => i.slaBreach)
  const resolved   = guestIssues.filter(i => i.status === 'resolved' || i.status === 'closed')
  const resolutionRate = guestIssues.length
    ? Math.round((resolved.length / guestIssues.length) * 100) : 0

  // Sentiment breakdown
  const neg = guestIssues.filter(i => getSentiment(i.priority) === 'negative').length
  const neu = guestIssues.filter(i => getSentiment(i.priority) === 'neutral').length
  const pos = guestIssues.filter(i => getSentiment(i.priority) === 'positive').length
  const total = guestIssues.length || 1
  const sentimentData = [
    { name: 'Negative', value: Math.round((neg / total) * 100), color: SENTIMENT_COLORS.negative },
    { name: 'Neutral',  value: Math.round((neu / total) * 100), color: SENTIMENT_COLORS.neutral  },
    { name: 'Positive', value: Math.round((pos / total) * 100), color: SENTIMENT_COLORS.positive },
  ].filter(s => s.value > 0)

  const negPct = guestIssues.length ? Math.round((neg / guestIssues.length) * 100) : 0

  return (
    <div className="p-5 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Complaints" value={String(guestIssues.length)} subtitle="Guest service issues" icon={MessageSquareWarning} variant="warning" />
        <StatCard title="Unresolved" value={String(unresolved.length)} subtitle={`${escalated.length} SLA breached`} icon={Clock} variant={unresolved.length > 0 ? 'critical' : 'success'} />
        <StatCard title="Resolution Rate" value={`${resolutionRate}%`} subtitle="Target: 90%" icon={CheckCircle2} variant={resolutionRate >= 90 ? 'success' : 'warning'} />
        <StatCard title="Negative Sentiment" value={`${negPct}%`} subtitle="High/Critical priority" icon={ThumbsDown} variant={negPct > 50 ? 'critical' : 'warning'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Complaint feed */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold">Guest Complaint Feed</h3>
          {guestIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
              <HeartHandshake className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No guest complaints</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create an issue with category &ldquo;Guest Service&rdquo; to see complaints here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {guestIssues.map((issue) => {
                const sentiment = getSentiment(issue.priority)
                const initials = issue.assignee
                  ? issue.assignee.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  : '?'
                return (
                  <div
                    key={issue.id}
                    className="w-full text-left p-3.5 rounded-xl border bg-card shadow-sm border-border"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{issue.assignee || 'Unassigned'}</p>
                          <p className="text-[11px] text-muted-foreground">{issue.outlet} · {issue.createdDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <PriorityBadge priority={issue.priority} />
                        <StatusBadge status={issue.status} />
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-1">{issue.title}</p>
                    {issue.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                        {issue.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded font-semibold"
                        style={{
                          background: `${SENTIMENT_COLORS[sentiment]}20`,
                          color: SENTIMENT_COLORS[sentiment],
                        }}
                      >
                        {sentiment}
                      </span>
                      {issue.dueDate && (
                        <span className={cn('text-[11px]', new Date(issue.dueDate) < now ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                          Due: {issue.dueDate}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        disabled={issue.status === 'resolved'}
                        onClick={() => updateIssueStatus(issue.id, 'resolved')}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                          issue.status === 'resolved'
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        )}
                      >
                        Mark Resolved
                      </button>
                      <button
                        disabled={issue.status === 'waiting'}
                        onClick={() => updateIssueStatus(issue.id, 'waiting')}
                        className="px-3 py-1.5 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        Escalate
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sentiment & stats */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Sentiment Analysis</h3>
            {sentimentData.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">By Outlet</h3>
            {guestIssues.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(
                  guestIssues.reduce<Record<string, number>>((acc, i) => {
                    acc[i.outlet] = (acc[i.outlet] ?? 0) + 1
                    return acc
                  }, {})
                ).sort((a, b) => b[1] - a[1]).map(([outlet, count]) => (
                  <div key={outlet} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground flex-1 truncate">{outlet}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
