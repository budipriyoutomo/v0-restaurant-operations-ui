'use client'

// "Pekerjaan Saya" — the home of field users (Todo-Pilot §19 / UX-6): what is
// waiting for *me*, computed by the server (GET /api/my-work). One queue, most
// urgent first (lib/my-work-queue, Todo-Modern-UI Fase 3): the top item is a
// ticket on the service rail with its one action, the rest are compact rows.
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api-client'
import { myWorkApi, type MyWork } from '@/lib/my-work-api'
import { buildQueue, hiddenCounts, type QueueItem } from '@/lib/my-work-queue'
import { navigate } from '@/lib/use-route'
import { useT, type MessageKey } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist'
import { InstallNudge } from '@/components/shared/install-app'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { RecordId } from '@/components/shared/record-id'
import { StatusLabel } from '@/components/shared/status-label'
import { RailTicket, ServiceRail } from '@/components/shared/service-rail'
import { useOutletFilter } from '@/lib/permissions'

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

  const queue = work ? buildQueue(work) : []
  const hidden = work ? hiddenCounts(work) : []
  const [first, ...rest] = queue

  // The one fact that ranks the item: its deadline, or how long it has waited.
  const when = (i: QueueItem): string => {
    switch (i.kind) {
      case 'opsChecklist':
        return [i.dueAt ? t('myWork.checklistDue', { time: relative(i.dueAt) }) : '',
          t('myWork.checklistProgress', { answered: i.detail.answered ?? 0, total: i.detail.total ?? 0 })].filter(Boolean).join(' · ')
      case 'approval':
        return [i.detail.amount != null ? formatMoney(Number(i.detail.amount)) : '',
          t('myWork.step', { step: i.detail.step ?? 1, total: i.detail.steps ?? 1 }),
          i.since ? t('myWork.waitingSince', { time: relative(i.since) }) : ''].filter(Boolean).join(' · ')
      case 'workOrder':
        return [i.detail.asset, i.dueAt ? t('myWork.scheduled', { date: date(i.dueAt) }) : ''].filter(Boolean).join(' · ')
      case 'task':
        return [i.detail.issue, i.dueAt ? t('myWork.due', { date: date(i.dueAt) }) : ''].filter(Boolean).join(' · ')
      case 'guest':
        return i.since ? t('myWork.reported', { time: relative(i.since) }) : ''
      default:
        return ''
    }
  }
  const status = (i: QueueItem) =>
    i.late ? (i.kind === 'approval' ? t('myWork.escalated') : t('myWork.late'))
      : i.signal === 'waiting' ? t('myWork.waiting') : null

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

      <InstallNudge />

      <OnboardingChecklist />

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" /> {error}</p>
      )}
      {work === null && !error && (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />)}
        </div>
      )}
      {work !== null && queue.length === 0 && (
        <EmptyState icon={CheckCircle2} title={t('myWork.empty')} />
      )}

      {first && (
        <ServiceRail label={t('myWork.next')}>
          <RailTicket
            className="w-full"
            signal={first.signal}
            status={status(first) ?? t(`myWork.kind.${first.kind}` as MessageKey)}
            title={first.title}
            meta={<><span>{t(`myWork.kind.${first.kind}` as MessageKey)} · </span><RecordId id={first.number} />{first.outlet && ` · ${first.outlet}`}{when(first) && <span className="block mt-0.5">{when(first)}</span>}</>}
            onClick={() => navigate(first.to)}
          >
            <span className="mt-3 inline-flex items-center gap-1 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
              {t(`myWork.action.${first.kind}` as MessageKey)} <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          </RailTicket>
        </ServiceRail>
      )}

      {rest.length > 0 && (
        <section aria-label={t('myWork.queue')} className="rounded-md border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border">
            {rest.map((i) => (
              <li key={i.key}>
                <button type="button" onClick={() => navigate(i.to)}
                  className="group w-full min-h-14 text-left px-4 py-2.5 hover:bg-muted/40 transition-colors flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {t(`myWork.kind.${i.kind}` as MessageKey)} · <RecordId id={i.number} />{i.outlet && ` · ${i.outlet}`}{when(i) && ` · ${when(i)}`}
                    </p>
                  </div>
                  {status(i) && <StatusLabel signal={i.signal} className="flex-shrink-0">{status(i)}</StatusLabel>}
                  <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground flex-shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hidden.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('myWork.hidden', { list: hidden.map((h) => t(`myWork.hiddenKind.${h.kind}` as MessageKey, { count: h.count })).join(', ') })}
        </p>
      )}
    </div>
  )
}
