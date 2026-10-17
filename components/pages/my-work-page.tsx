'use client'

// "Pekerjaan Saya" — the home of field users (Todo-Pilot §19 / UX-6): what is
// waiting for *me*, computed by the server (GET /api/my-work), each row one tap
// from its record. Sections the role cannot open come back null and are hidden.
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardCheck, ClipboardList, ListChecks, MessageSquareWarning, RefreshCw, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { myWorkApi, type MyWork, type Section } from '@/lib/my-work-api'
import { recordPath } from '@/lib/routes'
import { navigate } from '@/lib/use-route'
import { useT } from '@/lib/i18n'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist'
import { formatMoney } from '@/lib/money'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { useOutletFilter } from '@/lib/permissions'

type Row = { key: string; to: string; number: string; title: string; meta: string; badge?: React.ReactNode }

export function MyWorkPage() {
  const { t, date, relative } = useT()
  const [work, setWork] = useState<MyWork | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { outlet } = useOutletFilter()            // top bar outlet filter
  const load = useCallback(() => {
    setError(null)
    myWorkApi.get(20, outlet).then(setWork).catch((e) => setError(apiErrorMessage(e, t('myWork.loadFailed'))))
  }, [t, outlet])

  useEffect(() => { load() }, [load])

  const rupiah = (n: number | null) => (n == null ? '' : formatMoney(n))

  const sections: { id: keyof MyWork; title: string; icon: React.ElementType; section: Section<unknown> | null; rows: Row[] }[] = work ? [
    {
      // First: a checklist has a deadline today (Todo-Ops-Checklist Fase 1).
      id: 'opsChecklists', title: t('myWork.opsChecklists'), icon: ClipboardList, section: work.opsChecklists ?? null,
      rows: (work.opsChecklists?.items ?? []).map((c) => {
        const late = c.dueAt !== null && Date.parse(c.dueAt) < Date.now()
        return {
          key: c.id, to: recordPath('ops', c.id), number: c.number, title: c.templateName,
          meta: [c.outlet, c.dueAt ? t('myWork.checklistDue', { time: relative(c.dueAt) }) : '',
            t('myWork.checklistProgress', { answered: c.answered, total: c.itemCount })].filter(Boolean).join(' · '),
          badge: late ? <span className="text-xs px-2 py-0.5 rounded-md bg-warning/15 text-amber-700 dark:text-warning font-semibold">{t('myWork.checklistLate')}</span> : undefined,
        }
      }),
    },
    {
      id: 'approvals', title: t('myWork.approvals'), icon: CheckCircle2, section: work.approvals,
      rows: (work.approvals?.items ?? []).map((a) => ({
        key: a.id, to: recordPath('approvals', a.id), number: a.number, title: a.title,
        meta: [a.outlet, rupiah(a.amount), t('myWork.step', { step: a.stepOrder, total: a.stepCount }),
          a.waitingSince ? t('myWork.waitingSince', { time: relative(a.waitingSince) }) : ''].filter(Boolean).join(' · '),
        badge: a.escalated ? <span className="text-xs px-2 py-0.5 rounded-md bg-destructive/10 text-destructive font-semibold">{t('myWork.escalated')}</span> : undefined,
      })),
    },
    {
      id: 'workOrders', title: t('myWork.workOrders'), icon: Wrench, section: work.workOrders,
      rows: (work.workOrders?.items ?? []).map((w) => ({
        key: w.id, to: recordPath('cmms', w.id), number: w.number, title: w.title,
        meta: [w.assetName, w.outlet, w.scheduledDate ? t('myWork.scheduled', { date: date(w.scheduledDate) }) : ''].filter(Boolean).join(' · '),
        badge: <><PriorityBadge priority={w.priority as never} /><StatusBadge status={w.status as never} /></>,
      })),
    },
    {
      id: 'tasks', title: t('myWork.tasks'), icon: ListChecks, section: work.tasks,
      rows: (work.tasks?.items ?? []).map((task) => ({
        key: task.id, to: recordPath('issues', task.issueId), number: task.number, title: task.title,
        meta: [task.issueNumber, task.outlet, task.dueDate ? t('myWork.due', { date: date(task.dueDate) }) : ''].filter(Boolean).join(' · '),
        badge: <PriorityBadge priority={task.priority as never} />,
      })),
    },
    {
      id: 'readyToClose', title: t('myWork.readyToClose'), icon: ClipboardCheck, section: work.readyToClose,
      rows: (work.readyToClose?.items ?? []).map((i) => ({
        key: i.id, to: recordPath('issues', i.id), number: i.number, title: i.title, meta: i.outlet,
      })),
    },
    {
      id: 'guestWaiting', title: t('myWork.guestWaiting'), icon: MessageSquareWarning, section: work.guestWaiting,
      rows: (work.guestWaiting?.items ?? []).map((g) => ({
        key: g.id, to: recordPath('issues', g.issueId), number: g.issueNumber, title: g.title,
        meta: [g.outlet, g.reportedAt ? t('myWork.reported', { time: relative(g.reportedAt) }) : ''].filter(Boolean).join(' · '),
      })),
    },
  ] : []

  const visible = sections.filter((s) => s.section !== null)
  const nothing = work !== null && visible.every((s) => (s.section?.count ?? 0) === 0)

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl">
      <PageHeader
        title={t('myWork.title')}
        description={t('myWork.subtitle')}
        actions={
          <button onClick={load} aria-label={t('myWork.refresh')} title={t('myWork.refresh')}
            className="size-11 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <RefreshCw className="size-4" />
          </button>
        }
      />

      <OnboardingChecklist />

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" /> {error}</p>
      )}
      {work === null && !error && (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      )}
      {nothing && (
        <EmptyState icon={CheckCircle2} title={t('myWork.empty')} />
      )}

      {!nothing && visible.map(({ id, title, icon: Icon, section, rows }) => (
        <section key={id} aria-label={title} className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <h2 className="flex items-center gap-3 px-4 py-3 border-b border-border text-[15px] font-semibold">
            <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Icon className="size-4" />
            </span>
            {title}
            <span className={cn('ml-auto text-xs min-w-7 h-6 px-2 rounded-full font-bold flex items-center justify-center tabular-nums',
              (section?.count ?? 0) > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {section?.count ?? 0}
            </span>
          </h2>
          {rows.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">{t('myWork.sectionEmpty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.key}>
                  <button type="button" onClick={() => navigate(r.to)}
                    className="group w-full min-h-16 text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5"><span className="font-mono">{r.number}</span>{r.meta && ` · ${r.meta}`}</p>
                    </div>
                    {r.badge && <div className="flex items-center gap-1 flex-shrink-0">{r.badge}</div>}
                    <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground flex-shrink-0" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(section?.count ?? 0) > rows.length && (
            <p className="px-4 py-2.5 text-xs text-muted-foreground border-t border-border bg-muted/20">{t('myWork.more', { count: (section?.count ?? 0) - rows.length })}</p>
          )}
        </section>
      ))}
    </div>
  )
}
