'use client'

// "Pekerjaan Saya" — the home of field users (Todo-Pilot §19 / UX-6): what is
// waiting for *me*, computed by the server (GET /api/my-work), each row one tap
// from its record. Sections the role cannot open come back null and are hidden.
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, ClipboardList, ListChecks, MessageSquareWarning, RefreshCw, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { myWorkApi, type MyWork, type Section } from '@/lib/my-work-api'
import { recordPath } from '@/lib/routes'
import { navigate } from '@/lib/use-route'
import { useT } from '@/lib/i18n'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist'
import { formatMoney } from '@/lib/money'

type Row = { key: string; to: string; number: string; title: string; meta: string; badge?: React.ReactNode }

export function MyWorkPage() {
  const { t, date, relative } = useT()
  const [work, setWork] = useState<MyWork | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    myWorkApi.get().then(setWork).catch((e) => setError(apiErrorMessage(e, t('myWork.loadFailed'))))
  }, [t])

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
          badge: late ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-semibold">{t('myWork.checklistLate')}</span> : undefined,
        }
      }),
    },
    {
      id: 'approvals', title: t('myWork.approvals'), icon: CheckCircle2, section: work.approvals,
      rows: (work.approvals?.items ?? []).map((a) => ({
        key: a.id, to: recordPath('approvals', a.id), number: a.number, title: a.title,
        meta: [a.outlet, rupiah(a.amount), t('myWork.step', { step: a.stepOrder, total: a.stepCount }),
          a.waitingSince ? t('myWork.waitingSince', { time: relative(a.waitingSince) }) : ''].filter(Boolean).join(' · '),
        badge: a.escalated ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-semibold">{t('myWork.escalated')}</span> : undefined,
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
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t('myWork.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('myWork.subtitle')}</p>
        </div>
        <button onClick={load} aria-label={t('myWork.refresh')} title={t('myWork.refresh')}
          className="size-11 flex items-center justify-center rounded-md border border-border hover:bg-accent">
          <RefreshCw className="size-4" />
        </button>
      </div>

      <OnboardingChecklist />

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" /> {error}</p>
      )}
      {work === null && !error && (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      )}
      {nothing && (
        <p className="py-14 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">{t('myWork.empty')}</p>
      )}

      {!nothing && visible.map(({ id, title, icon: Icon, section, rows }) => (
        <section key={id} aria-label={title} className="rounded-xl border border-border bg-card overflow-hidden">
          <h2 className="flex items-center gap-2 px-4 py-3 border-b border-border text-sm font-semibold">
            <Icon className="size-4 text-primary" /> {title}
            <span className={cn('ml-auto text-xs px-2 py-0.5 rounded-full font-bold',
              (section?.count ?? 0) > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {section?.count ?? 0}
            </span>
          </h2>
          {rows.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">{t('myWork.sectionEmpty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.key}>
                  <button type="button" onClick={() => navigate(r.to)}
                    className="w-full min-h-14 text-left px-4 py-2.5 hover:bg-muted/40 transition-colors flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate"><span className="font-mono">{r.number}</span>{r.meta && ` · ${r.meta}`}</p>
                    </div>
                    {r.badge && <div className="flex items-center gap-1 flex-shrink-0">{r.badge}</div>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(section?.count ?? 0) > rows.length && (
            <p className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border">{t('myWork.more', { count: (section?.count ?? 0) - rows.length })}</p>
          )}
        </section>
      ))}
    </div>
  )
}
