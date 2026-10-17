'use client'

// Daily Ops — opening/closing/hygiene checklists per outlet (Todo-Ops-Checklist Fase 1).
//   Hari ini            today's runs at my outlets (outlet-local date), with due time & state
//   Riwayat             past runs, filtered by date / outlet / status; with one outlet
//                       chosen: daily sign-off and the inspection PDF (Fase 4)
//   Template & Jadwal   ops:manage — checklist templates (or a built-in set) and per-outlet schedules
// A run opens in the phone-first runner; /ops/{id} links straight to it (My Work).
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ClipboardList, Pencil, Play, Plus, Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { opsApi } from '@/lib/ops-checklist-api'
import { windowState } from '@/lib/ops-checklist'
import { useMyOutlets, useOutletFilter, usePermissions } from '@/lib/permissions'
import { navigate, useRecordRoute, useUrlState } from '@/lib/use-route'
import type { OpsRun, OpsRunStatus, OpsSchedule, OpsTemplate } from '@/lib/types'
import { ChecklistRunner } from '@/components/ops/checklist-runner'
import { WINDOW_TONE } from '@/lib/tone'
import { OpsTemplateEditor } from '@/components/ops/template-editor'
import { OpsSchedulePanel } from '@/components/ops/schedule-panel'
import { OpsKpiPanel } from '@/components/ops/kpi-panel'
import { DaySignoffList, ExportPdfButton } from '@/components/ops/day-signoff'
import { PresetPicker } from '@/components/ops/preset-picker'
import { useT } from '@/lib/i18n'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { SegmentedTabs } from '@/components/shared/segmented-tabs'
import { FilterSelect } from '@/components/shared/filter-menu'

type Tab = 'today' | 'history' | 'compliance' | 'setup'
const STATUSES: OpsRunStatus[] = ['pending', 'in_progress', 'submitted', 'missed']

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

export function OpsChecklistPage() {
  const { t } = useT()
  const { can } = usePermissions()
  const manage = can.manageOps
  // Tab and history outlet live in the URL, so Analytics can link to an outlet's runs (Fase 3).
  const [tabParam, setTabParam] = useUrlState('tab', null)
  const tab: Tab = (['today', 'history', 'compliance', 'setup'] as const).includes(tabParam as Tab) ? tabParam as Tab : 'today'
  const setTab = (next: Tab) => setTabParam(next === 'today' ? null : next)
  // Top bar outlet filter = History's default outlet; an outlet in the URL
  // (Analytics link) wins, and `?outlet=` means "all outlets" explicitly.
  const { outlet: globalOutlet } = useOutletFilter()
  const [outletParam, setOutletParam] = useUrlState('outlet', globalOutlet)
  const [today, setToday] = useState<OpsRun[] | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const record = useRecordRoute(true)
  const reload = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    setToday(null)
    opsApi.runs(globalOutlet ? { outlet: globalOutlet } : {}).then(setToday).catch((e) => { toast.error(apiErrorMessage(e)); setToday([]) })
  }, [refreshKey, globalOutlet])

  const runNow = async () => {
    try {
      const res = await opsApi.runNow()
      toast.success(t('ops.ranNow', { created: res.created, missed: res.missed }))
      reload()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'today', label: t('ops.tab.today') },
    { id: 'history', label: t('ops.tab.history') },
    { id: 'compliance', label: t('ops.tab.compliance') },
    ...(manage ? [{ id: 'setup' as Tab, label: t('ops.tab.setup') }] : []),
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title={t('ops.title')}
        description={t('ops.subtitle')}
        actions={manage && tab === 'today' && (
          <button onClick={runNow}
            className="flex items-center gap-1.5 px-4 h-10 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/50">
            <Play className="size-4" aria-hidden /> {t('ops.runNow')}
          </button>
        )}
      />

      <SegmentedTabs label={t('ops.title')} value={tab} onChange={setTab} tabs={tabs} />

      {tab === 'today' && (
        today === null ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        )
          : today.length === 0 ? <Empty text={manage ? t('ops.noRunsTodayManage') : t('ops.noRunsToday')} />
          : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {today.map((r) => <RunCard key={r.id} run={r} onOpen={() => record.open(r.id)} />)}
            </div>
      )}
      {tab === 'history' && <HistoryTab refreshKey={refreshKey} onOpen={(id) => record.open(id)}
        outlet={outletParam ?? ''} setOutlet={(o) => setOutletParam(o || null)} />}
      {tab === 'compliance' && <OpsKpiPanel onOutlet={(o) => navigate(`/ops?tab=history&outlet=${encodeURIComponent(o)}`)} />}
      {tab === 'setup' && manage && <SetupTab />}

      {record.recordId && (
        <ChecklistRunner runId={record.recordId} onClose={record.close} onChanged={reload} />
      )}
    </div>
  )
}

function RunCard({ run, onOpen }: { run: OpsRun; onOpen: () => void }) {
  const { t, label, dateTime, relative } = useT()
  const state = windowState(run)
  return (
    <button onClick={onOpen} className="text-left p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-[border-color,box-shadow] space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{run.templateName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{run.outlet} · {label('opsShift', run.shift)}</p>
        </div>
        <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap', WINDOW_TONE[state])}>
          {t(`ops.state.${state}`)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('ops.dueAt', { time: dateTime(run.dueAt) })}
        {(state === 'open' || state === 'upcoming') && ` · ${relative(run.dueAt)}`}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${run.itemCount ? (run.answeredCount * 100) / run.itemCount : 0}%` }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{run.answeredCount}/{run.itemCount}</span>
      </div>
      {(run.failedCount > 0 || run.isLate) && (
        <p className="text-xs flex items-center gap-3 flex-wrap">
          {run.failedCount > 0 && <span className="text-red-700 dark:text-red-400 inline-flex items-center gap-1"><AlertTriangle className="size-3" /> {t('ops.failedCount', { count: run.failedCount })}</span>}
          {run.criticalFailed && <span className="text-red-700 dark:text-red-400 inline-flex items-center gap-1"><Star className="size-3" /> {t('ops.critical')}</span>}
          {run.isLate && <span className="text-amber-700 dark:text-amber-400">{t('ops.lateBadge')}</span>}
        </p>
      )}
    </button>
  )
}

function HistoryTab({ refreshKey, onOpen, outlet, setOutlet }: {
  refreshKey: number; onOpen: (id: string) => void; outlet: string; setOutlet: (o: string) => void
}) {
  const { t, label, date } = useT()
  const outlets = useMyOutlets()
  const now = new Date()
  const [from, setFrom] = useState(isoDay(new Date(now.getTime() - 6 * 86_400_000)))
  const [to, setTo] = useState(isoDay(now))
  const [status, setStatus] = useState<OpsRunStatus | ''>('')
  const [rows, setRows] = useState<OpsRun[] | null>(null)

  useEffect(() => {
    setRows(null)
    opsApi.runs({ from, to, outlet: outlet || undefined, status: status || undefined })
      .then(setRows).catch((e) => { toast.error(apiErrorMessage(e)); setRows([]) })
  }, [from, to, outlet, status, refreshKey])

  const field = 'h-10 px-3 rounded-lg border border-border bg-background text-sm'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end p-3 sm:p-4 rounded-2xl border border-border bg-card">
        <label className="text-xs font-medium text-muted-foreground">{t('ops.from')}<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(field, 'block mt-1')} /></label>
        <label className="text-xs font-medium text-muted-foreground">{t('ops.to')}<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={cn(field, 'block mt-1')} /></label>
        <FilterSelect label={t('common.outlet')} allLabel={t('ops.allOutlets')} value={outlet || null}
          options={outlets.map((o) => ({ value: o.name, label: o.name }))} onChange={(v) => setOutlet(v ?? '')} />
        <FilterSelect label={t('common.status')} allLabel={t('common.all')} value={status || null}
          options={STATUSES.map((s) => ({ value: s, label: label('opsRunStatus', s) }))} onChange={(v) => setStatus(v ?? '')} />
        <ExportPdfButton outlet={outlet} from={from} to={to} />
      </div>
      {!outlet && <p className="text-xs text-muted-foreground">{t('opsSignoff.pickOutlet')}</p>}
      {rows === null ? <div className="h-48 rounded-2xl bg-muted animate-pulse" aria-busy="true" />
        : rows.length === 0 ? <Empty text={t('ops.noHistory')} />
        : (
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">{t('ops.date')}</th>
                  <th className="text-left font-semibold px-4 py-3">{t('ops.template')}</th>
                  <th className="text-left font-semibold px-4 py-3">{t('common.outlet')}</th>
                  <th className="text-left font-semibold px-4 py-3">{t('common.status')}</th>
                  <th className="text-right font-semibold px-4 py-3">{t('ops.score')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => onOpen(r.id)} className="border-t border-border cursor-pointer hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">{date(r.runDate)}</td>
                    <td className="px-4 py-3"><span className="font-medium">{r.templateName}</span> <span className="font-mono text-xs text-muted-foreground">{r.number}</span></td>
                    <td className="px-4 py-3">{r.outlet}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold', WINDOW_TONE[windowState(r)])}>{label('opsRunStatus', r.status)}</span>
                      {r.isLate && <span className="ml-1.5 text-xs text-amber-700 dark:text-amber-400">{t('ops.lateBadge')}</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.score ?? '—'}{r.failedCount > 0 && <span className="ml-1 text-xs text-red-700 dark:text-red-400">({r.failedCount}✗)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {outlet && <DaySignoffList outlet={outlet} from={from} to={to} refreshKey={refreshKey} />}
    </div>
  )
}

function SetupTab() {
  const { t, label } = useT()
  const [templates, setTemplates] = useState<OpsTemplate[]>([])
  const [schedules, setSchedules] = useState<OpsSchedule[]>([])
  const [editing, setEditing] = useState<OpsTemplate | 'new' | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const [key, setKey] = useState(0)
  const reload = () => setKey((k) => k + 1)

  useEffect(() => {
    opsApi.templates(true).then(setTemplates).catch((e) => toast.error(apiErrorMessage(e)))
    opsApi.schedules().then(setSchedules).catch((e) => toast.error(apiErrorMessage(e)))
  }, [key])

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('ops.templates')}</h2>
          <div className="flex gap-2">
            {templates.length > 0 && (
              <button onClick={() => setShowPresets((v) => !v)} aria-expanded={showPresets}
                className="px-3.5 h-9 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/50">
                {t('opsPreset.fromPreset')}
              </button>
            )}
            <button onClick={() => setEditing('new')}
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
              <Plus className="size-4" /> {t('ops.newTemplate')}
            </button>
          </div>
        </div>
        {(templates.length === 0 || showPresets) && <PresetPicker onApplied={() => { setShowPresets(false); reload() }} />}
        {templates.length === 0 ? <Empty text={t('ops.noTemplates')} /> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((tpl) => (
              <div key={tpl.id} className={cn('p-4 rounded-2xl border border-border bg-card space-y-1', !tpl.isActive && 'opacity-60')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold flex items-center gap-1.5"><ClipboardList className="size-4 text-muted-foreground" aria-hidden /> {tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{label('opsShift', tpl.shift)} · {t('ops.itemCount', { count: tpl.items.length })}</p>
                  </div>
                  <button onClick={() => setEditing(tpl)} aria-label={t('common.edit')} className="size-9 -m-1.5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button>
                </div>
                {tpl.description && <p className="text-xs text-muted-foreground">{tpl.description}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('ops.schedules')}</h2>
        <OpsSchedulePanel schedules={schedules} templates={templates} onChanged={reload} />
      </section>

      {editing && (
        <OpsTemplateEditor template={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <EmptyState icon={ClipboardList} title={text} />
}
