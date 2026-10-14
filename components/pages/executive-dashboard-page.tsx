'use client'

import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Zap, ShoppingCart, Megaphone, BookOpen, Package, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { ApprovalType } from '@/lib/types'
import { useEffect, useState } from 'react'
import { overviewApi, type Overview } from '@/lib/overview-api'
import { recordPath } from '@/lib/routes'
import { ListSkeleton } from '@/components/shared/skeleton'
import { usePermissions } from '@/lib/permissions'
import { useT } from '@/lib/i18n'
import { navigate } from '@/lib/use-route'
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist'
import { OutletComparison } from '@/components/dashboard/outlet-comparison'

export function ExecutiveDashboardPage() {
  const listVersion = useIssueStore((st) => st.listVersion)
  const { canViewPage } = usePermissions()
  const { t, label } = useT()

  // Counted by the server (Todo-Pilot §22) — the browser no longer holds every
  // issue. "In progress" vs "awaiting close" as in Todo-Pilot §18.
  const [data, setData] = useState<Overview | null>(null)
  useEffect(() => {
    let live = true
    overviewApi.get().then((d) => { if (live) setData(d) }).catch(() => {})
    return () => { live = false }
  }, [listVersion])

  if (!data) return <ListSkeleton rows={6} />

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
    <div className="space-y-6 p-6">
      <OnboardingChecklist />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Outlets side by side, exceptions first (Todo-Pilot §25) */}
      <OutletComparison />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard title={t('dashboard.totalIssues')} value={String(data.issues.total)} subtitle={t('dashboard.allTime')}         color="bg-blue-100 text-blue-700"    />
        <KPICard title={t('dashboard.inProgress')} value={String(data.issues.inProgress)} subtitle={t('dashboard.inProgressSub')} color="bg-amber-100 text-amber-800"  />
        <KPICard
          title={t('dashboard.awaitingClose')}
          value={String(data.issues.awaitingClose)}
          subtitle={t('dashboard.awaitingCloseSub')}
          color="bg-emerald-100 text-emerald-700"
          onClick={canViewPage('issues') ? () => navigate('/issues?ready=1') : undefined}
        />
        <KPICard
          title={t('dashboard.slaBreaches')}
          value={String(data.issues.slaBreached)}
          subtitle={t('dashboard.overdue')}
          color="bg-red-100 text-red-700"
          onClick={canViewPage('issues') ? () => navigate('/issues?late=1') : undefined}
        />
        <KPICard title={t('dashboard.activeTasks')} value={data.tasks ? String(data.tasks.active) : '—'} subtitle={t('dashboard.activeTasksSub')}      color="bg-purple-100 text-purple-700"/>
        <KPICard title={t('dashboard.pendingApprovals')} value={data.approvals ? String(data.approvals.pending) : '—'} subtitle={t('dashboard.pendingApprovalsSub')} color="bg-green-100 text-green-800"  />
      </div>

      {/* Issues by Category & Outlet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/30">
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
          <h3 className="font-semibold mb-4">{t('dashboard.byOutlet')}</h3>
          {outletEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noIssues')}</p>
          ) : (
            <div className="space-y-2">
              {outletEntries.map(([outlet, count]) => (
                <div key={outlet} className="flex items-center justify-between p-2 rounded bg-background/50 text-sm">
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
        <div className="lg:col-span-2 p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">{t('dashboard.criticalHigh')}</h3>
          {data.issues.urgent.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
              <CheckCircle2 className="size-4 flex-shrink-0" />
              {t('dashboard.noCriticalHigh')}
            </div>
          ) : (
            <div className="space-y-2">
              {data.issues.urgent.map((issue) => (
                <button key={issue.id} type="button" onClick={() => navigate(recordPath('issues', issue.id))}
                  className="w-full text-left p-3 rounded bg-background/50 border border-border hover:bg-background">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-primary font-semibold mb-1">{issue.number}</p>
                      <p className="text-sm font-medium truncate">{issue.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{issue.outlet}</p>
                    </div>
                    <span className={cn(
                      'text-xs font-semibold px-2 py-1 rounded-full ml-2 whitespace-nowrap',
                      issue.priority === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                    )}>
                      {label('priority', issue.priority)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-4">{t('dashboard.approvalsPending')}</h3>
          <div className="space-y-3">
            {typeConfig.map(({ type, icon }) => (
              <div key={type} className="p-2.5 rounded bg-background/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{icon}</span>
                  <p className="text-xs font-medium">{label('approvalType', type)}</p>
                </div>
                <span className={cn(
                  'text-lg font-bold',
                  (pendingByType[type] ?? 0) > 0 ? 'text-amber-700' : 'text-muted-foreground'
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
  title, value, subtitle, color, onClick,
}: {
  title: string; value: string; subtitle: string; color: string; onClick?: () => void
}) {
  const body = (
    <>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
    </>
  )
  const cls = 'p-4 rounded-lg border border-border bg-muted/20 hover:shadow-sm transition-shadow'
  // Clickable cards drill down to the matching filtered list.
  return onClick ? (
    <button type="button" data-kpi onClick={onClick} className={cn(cls, 'text-left w-full hover:bg-muted/40')}>{body}</button>
  ) : (
    <div data-kpi className={cls}>{body}</div>
  )
}
