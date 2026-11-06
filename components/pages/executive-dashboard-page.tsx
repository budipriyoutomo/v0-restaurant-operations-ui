'use client'

// GM dashboard (Todo-Modern-UI Fase 3): the title says how today is going, then
// the outlet rail (most urgent first), the decisions waiting for me and what
// goes past due today. The numbers and charts follow under "Details".
import { CheckCircle2, ChevronRight, ShoppingCart, Megaphone, BookOpen, Package, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { ApprovalType } from '@/lib/types'
import { useEffect, useState } from 'react'
import { overviewApi, type Overview } from '@/lib/overview-api'
import { outletsApi, type OutletComparison as CompareData } from '@/lib/outlets-api'
import { myWorkApi, type MyWork } from '@/lib/my-work-api'
import { api } from '@/lib/api-client'
import { headlineParts } from '@/lib/dashboard'
import { formatMoney } from '@/lib/money'
import type { Issue } from '@/lib/types'
import { recordPath } from '@/lib/routes'
import { ListSkeleton } from '@/components/shared/skeleton'
import { useOutletFilter, usePermissions } from '@/lib/permissions'
import { useT } from '@/lib/i18n'
import { navigate } from '@/lib/use-route'
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist'
import { StatCard } from '@/components/shared/stat-card'
import { toneIfAny } from '@/lib/tone'
import { OutletComparison } from '@/components/dashboard/outlet-comparison'
import { OutletRail } from '@/components/dashboard/outlet-rail'
import { RecordId } from '@/components/shared/record-id'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { PageHeader } from '@/components/shared/page-header'

export function ExecutiveDashboardPage() {
  const listVersion = useIssueStore((st) => st.listVersion)
  const { canViewPage } = usePermissions()
  const { t, label, relative } = useT()

  // Counted by the server (Todo-Pilot §22) — the browser no longer holds every
  // issue. "In progress" vs "awaiting close" as in Todo-Pilot §18.
  const [data, setData] = useState<Overview | null>(null)
  const { outlet } = useOutletFilter()            // top bar outlet filter
  useEffect(() => {
    let live = true
    overviewApi.get(outlet).then((d) => { if (live) setData(d) }).catch(() => {})
    return () => { live = false }
  }, [listVersion, outlet])

  // Today's three questions: which outlet, which decision, what goes late.
  const [compare, setCompare] = useState<CompareData | null>(null)
  const [decisions, setDecisions] = useState<MyWork['approvals']>(null)
  const [dueToday, setDueToday] = useState<{ items: Issue[]; total: number } | null>(null)
  const canIssues = canViewPage('issues')
  useEffect(() => {
    let live = true
    outletsApi.compare(30).then((d) => { if (live) setCompare(d) }).catch(() => {})
    myWorkApi.get(5, outlet).then((w) => { if (live) setDecisions(w.approvals) }).catch(() => {})
    if (canIssues) {
      api.getPage<Issue>(`/api/issues?due=today&limit=5${outlet ? `&outlet=${encodeURIComponent(outlet)}` : ''}`)
        .then((d) => { if (live) setDueToday(d) }).catch(() => {})
    }
    return () => { live = false }
  }, [listVersion, outlet, canIssues])

  if (!data) return <ListSkeleton rows={6} />

  const flagged = compare?.outlets.filter((r) => r.flags.length > 0).length ?? 0
  const headline = headlineParts(flagged, data.issues.slaBreached)
    .map((p) => t(p.key, p.count === undefined ? undefined : { count: p.count })).join(' · ')
  const showTable = () => document.getElementById('outlet-cmp-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const categoryEntries = Object.entries(data.issues.byCategory).sort((a, b) => b[1] - a[1])
  const maxCat = categoryEntries[0]?.[1] ?? 1
  const outletEntries = Object.entries(data.issues.byOutlet).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const pendingByType = (data.approvals?.pendingByType ?? {}) as Partial<Record<ApprovalType, number>>

  const typeConfig: { type: ApprovalType; icon: React.ReactNode }[] = [
    { type: 'procurement', icon: <ShoppingCart className="size-4" /> },
    { type: 'marketing', icon: <Megaphone    className="size-4" /> },
    { type: 'training', icon: <BookOpen     className="size-4" /> },
    { type: 'asset-purchase', icon: <Package      className="size-4" /> },
    { type: 'maintenance', icon: <Wrench       className="size-4" /> },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <PageHeader title={headline} description={t('dashboard.subtitle')} />
      <OnboardingChecklist />

      {compare && <OutletRail rows={compare.outlets} onShowTable={showTable} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {decisions && (
          <section aria-labelledby="dash-decisions" className="rounded-md border border-border bg-card">
            <h2 id="dash-decisions" className="px-4 py-3 border-b border-border font-semibold">{t('dashboard.decisions')}</h2>
            {decisions.items.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">{t('dashboard.decisionsEmpty')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {decisions.items.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => navigate(recordPath('approvals', a.id))}
                      className="w-full min-h-14 text-left px-4 py-2.5 hover:bg-muted/40 flex items-center gap-3">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{a.title}</span>
                        <span className="block text-xs text-muted-foreground truncate mt-0.5">
                          <RecordId id={a.number} />{a.outlet && ` · ${a.outlet}`}{a.amount != null && ` · ${formatMoney(a.amount)}`}
                          {a.waitingSince && ` · ${t('myWork.waitingSince', { time: relative(a.waitingSince) })}`}
                        </span>
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground/50 flex-shrink-0" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {decisions.count > decisions.items.length && (
              <button type="button" onClick={() => navigate('/approvals')}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-primary border-t border-border hover:bg-muted/40">
                {t('dashboard.seeAll')} ({decisions.count})
              </button>
            )}
          </section>
        )}

        {canIssues && dueToday && (
          <section aria-labelledby="dash-due-today" className="rounded-md border border-border bg-card">
            <h2 id="dash-due-today" className="px-4 py-3 border-b border-border font-semibold">{t('dashboard.dueToday')}</h2>
            {dueToday.items.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">{t('dashboard.dueTodayEmpty')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {dueToday.items.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => navigate(recordPath('issues', i.id))}
                      className="w-full min-h-14 text-left px-4 py-2.5 hover:bg-muted/40 flex items-center gap-3">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{i.title}</span>
                        <span className="block text-xs text-muted-foreground truncate mt-0.5"><RecordId id={i.number} />{i.outlet && ` · ${i.outlet}`}</span>
                      </span>
                      <PriorityBadge priority={i.priority} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {dueToday.total > 0 && (
              <button type="button" onClick={() => navigate('/issues?due=today')}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-primary border-t border-border hover:bg-muted/40">
                {t('dashboard.seeAll')} ({dueToday.total})
              </button>
            )}
          </section>
        )}
      </div>

      <h2 className="pt-2 text-sm font-semibold text-muted-foreground">{t('dashboard.more')}</h2>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard title={t('dashboard.totalIssues')} value={String(data.issues.total)} subtitle={t('dashboard.allTime')} />
        <StatCard title={t('dashboard.inProgress')} value={String(data.issues.inProgress)} subtitle={t('dashboard.inProgressSub')} />
        <StatCard
          title={t('dashboard.awaitingClose')}
          value={String(data.issues.awaitingClose)}
          subtitle={t('dashboard.awaitingCloseSub')}
          onClick={canViewPage('issues') ? () => navigate('/issues?ready=1') : undefined}
        />
        <StatCard
          title={t('dashboard.slaBreaches')}
          value={String(data.issues.slaBreached)}
          subtitle={t('dashboard.overdue')}
          variant={toneIfAny(data.issues.slaBreached, 'critical' as const)}
          onClick={canViewPage('issues') ? () => navigate('/issues?late=1') : undefined}
        />
        <StatCard title={t('dashboard.activeTasks')} value={data.tasks ? String(data.tasks.active) : '—'} subtitle={t('dashboard.activeTasksSub')} />
        <StatCard title={t('dashboard.pendingApprovals')} value={data.approvals ? String(data.approvals.pending) : '—'} subtitle={t('dashboard.pendingApprovalsSub')}
          variant={toneIfAny(data.approvals?.pending, 'warning' as const)} />
      </div>

      {/* Issues by Category & Outlet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card">
          <h3 className="font-semibold mb-4">{t('dashboard.byCategory')}</h3>
          {categoryEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noIssues')}</p>
          ) : (
            <div className="space-y-2">
              {categoryEntries.map(([category, count]) => (
                <div key={category}>
                  <div className="flex justify-between mb-1 text-xs">
                    <span>{label('category', category)}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-[var(--chart-1)] h-2 rounded-full"
                      style={{ width: `${(count / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card">
          <h3 className="font-semibold mb-4">{t('dashboard.byOutlet')}</h3>
          {outletEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noIssues')}</p>
          ) : (
            <div className="space-y-2">
              {outletEntries.map(([outlet, count]) => (
                <div key={outlet} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40 text-sm">
                  <p className="font-medium">{outlet}</p>
                  <span className="font-semibold text-xs text-muted-foreground">{t('dashboard.issueCount', { count })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Critical Issues & Approvals Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card">
          <h3 className="font-semibold mb-4">{t('dashboard.criticalHigh')}</h3>
          {data.issues.urgent.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/40 rounded-xl p-3">
              <CheckCircle2 className="size-4 flex-shrink-0" />
              {t('dashboard.noCriticalHigh')}
            </div>
          ) : (
            <div className="space-y-2">
              {data.issues.urgent.map((issue) => (
                <button key={issue.id} type="button" onClick={() => navigate(recordPath('issues', issue.id))}
                  className="w-full text-left p-3 rounded-xl border border-border hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-primary font-semibold mb-1">{issue.number}</p>
                      <p className="text-sm font-medium truncate">{issue.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{issue.outlet}</p>
                    </div>
                    <span className={cn(
                      'text-xs font-semibold px-2 py-1 rounded-full ml-2 whitespace-nowrap',
                      issue.priority === 'critical' ? 'bg-destructive-soft text-destructive' : 'bg-warning-mark/10 text-warning'
                    )}>
                      {label('priority', issue.priority)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card">
          <h3 className="font-semibold mb-4">{t('dashboard.approvalsPending')}</h3>
          <div className="space-y-3">
            {typeConfig.map(({ type, icon }) => (
              <div key={type} className="px-3 py-2.5 rounded-lg bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{icon}</span>
                  <p className="text-xs font-medium">{label('approvalType', type)}</p>
                </div>
                <span className={cn(
                  'text-lg font-bold',
                  (pendingByType[type] ?? 0) > 0 ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {pendingByType[type] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outlets side by side, every number (Todo-Pilot §25) */}
      <OutletComparison />
    </div>
  )
}
