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
import { useMyOutlets, usePermissions } from '@/lib/permissions'
import { navigate, useRecordRoute, useUrlState } from '@/lib/use-route'
import type { OpsRun, OpsRunStatus, OpsSchedule, OpsTemplate } from '@/lib/types'
import { ChecklistRunner, WINDOW_TONE } from '@/components/ops/checklist-runner'
import { OpsTemplateEditor } from '@/components/ops/template-editor'
import { OpsSchedulePanel } from '@/components/ops/schedule-panel'
import { OpsKpiPanel } from '@/components/ops/kpi-panel'
import { DaySignoffList, ExportPdfButton } from '@/components/ops/day-signoff'
import { PresetPicker } from '@/components/ops/preset-picker'
import { useT } from '@/lib/i18n'

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
  const [outletParam, setOutletParam] = useUrlState('outlet', null)
  const [today, setToday] = useState<OpsRun[] | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const record = useRecordRoute(true)
  const reload = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    opsApi.runs().then(setToday).catch((e) => { toast.error(apiErrorMessage(e)); setToday([]) })
  }, [refreshKey])

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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">{t('ops.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('ops.subtitle')}</p>
        </div>
        {manage && tab === 'today' && (
          <button onClick={runNow}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md border border-border text-xs font-semibold hover:bg-muted/50">
            <Play className="size-4" aria-hidden /> {t('ops.runNow')}
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((td) => (
          <button key={td.id} onClick={() => setTab(td.id)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap',
              tab === td.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {td.label}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        today === null ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
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
    <button onClick={onOpen} className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{run.templateName}</p>
          <p className="text-xs text-muted-foreground">{run.outlet} · {label('opsShift', run.shift)}</p>
        </div>
        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap', WINDOW_TONE[state])}>
          {t(`ops.state.${state}`)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('ops.dueAt', { time: dateTime(run.dueAt) })}
        {(state === 'open' || state === 'upcoming') && ` · ${relative(run.dueAt)}`}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${run.itemCount ? (run.answeredCount * 100) / run.itemCount : 0}%` }} />
        </div>
        <span className="text-[11px] text-muted-foreground">{run.answeredCount}/{run.itemCount}</span>
      </div>
      {(run.failedCount > 0 || run.isLate) && (
        <p className="text-[11px] flex items-center gap-2">
          {run.failedCount > 0 && <span className="text-red-700 inline-flex items-center gap-1"><AlertTriangle className="size-3" /> {t('ops.failedCount', { count: run.failedCount })}</span>}
          {run.criticalFailed && <span className="text-red-700 inline-flex items-center gap-1"><Star className="size-3" /> {t('ops.critical')}</span>}
          {run.isLate && <span className="text-amber-700">{t('ops.lateBadge')}</span>}
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

  const field = 'h-9 px-2.5 rounded-md border border-border bg-background text-sm'
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs">{t('ops.from')}<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(field, 'block mt-1')} /></label>
        <label className="text-xs">{t('ops.to')}<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={cn(field, 'block mt-1')} /></label>
        <label className="text-xs">{t('common.outlet')}
          <select value={outlet} onChange={(e) => setOutlet(e.target.value)} className={cn(field, 'block mt-1')}>
            <option value="">{t('ops.allOutlets')}</option>
            {outlets.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
          </select>
        </label>
        <label className="text-xs">{t('common.status')}
          <select value={status} onChange={(e) => setStatus(e.target.value as OpsRunStatus | '')} className={cn(field, 'block mt-1')}>
            <option value="">{t('ops.allStatuses')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{label('opsRunStatus', s)}</option>)}
          </select>
        </label>
        <ExportPdfButton outlet={outlet} from={from} to={to} />
      </div>
      {!outlet && <p className="text-[11px] text-muted-foreground">{t('opsSignoff.pickOutlet')}</p>}
      {rows === null ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        : rows.length === 0 ? <Empty text={t('ops.noHistory')} />
        : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-3 py-2">{t('ops.date')}</th>
                  <th className="text-left font-semibold px-3 py-2">{t('ops.template')}</th>
                  <th className="text-left font-semibold px-3 py-2">{t('common.outlet')}</th>
                  <th className="text-left font-semibold px-3 py-2">{t('common.status')}</th>
                  <th className="text-right font-semibold px-3 py-2">{t('ops.score')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => onOpen(r.id)} className="border-t border-border cursor-pointer hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap">{date(r.runDate)}</td>
                    <td className="px-3 py-2"><span className="font-medium">{r.templateName}</span> <span className="font-mono text-[11px] text-muted-foreground">{r.number}</span></td>
                    <td className="px-3 py-2">{r.outlet}</td>
                    <td className="px-3 py-2">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', WINDOW_TONE[windowState(r)])}>{label('opsRunStatus', r.status)}</span>
                      {r.isLate && <span className="ml-1 text-[10px] text-amber-700">{t('ops.lateBadge')}</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.score ?? '—'}{r.failedCount > 0 && <span className="ml-1 text-[11px] text-red-700">({r.failedCount}✗)</span>}</td>
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('ops.templates')}</h2>
          <div className="flex gap-2">
            {templates.length > 0 && (
              <button onClick={() => setShowPresets((v) => !v)} aria-expanded={showPresets}
                className="px-3 h-8 rounded-md border border-border text-xs font-semibold hover:bg-muted/50">
                {t('opsPreset.fromPreset')}
              </button>
            )}
            <button onClick={() => setEditing('new')}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold">
              <Plus className="size-4" /> {t('ops.newTemplate')}
            </button>
          </div>
        </div>
        {(templates.length === 0 || showPresets) && <PresetPicker onApplied={() => { setShowPresets(false); reload() }} />}
        {templates.length === 0 ? <Empty text={t('ops.noTemplates')} /> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((tpl) => (
              <div key={tpl.id} className={cn('p-4 rounded-xl border border-border bg-card space-y-1', !tpl.isActive && 'opacity-60')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold flex items-center gap-1.5"><ClipboardList className="size-4 text-muted-foreground" aria-hidden /> {tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{label('opsShift', tpl.shift)} · {t('ops.itemCount', { count: tpl.items.length })}</p>
                  </div>
                  <button onClick={() => setEditing(tpl)} aria-label={t('common.edit')} className="p-1.5 rounded hover:bg-muted"><Pencil className="size-4" /></button>
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
  return <div className="p-10 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">{text}</div>
}
