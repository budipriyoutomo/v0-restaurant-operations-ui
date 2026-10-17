'use client'

// Checklist schedules: template × outlet × frequency × due time (outlet clock).
// Todo-Ops-Checklist Fase 1; weekly / monthly (deep cleaning, calibration) Fase 4.
// The generator creates each run from these.
import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { opsApi } from '@/lib/ops-checklist-api'
import { useMyOutlets } from '@/lib/permissions'
import { frequencyDefaults, fromWindowInput, scheduleProblem, toWindowInput, windowUnit } from '@/lib/ops-schedule'
import type { OpsSchedule, OpsScheduleFrequency, OpsTemplate } from '@/lib/types'
import { useT } from '@/lib/i18n'

const DAYS = [1, 2, 3, 4, 5, 6, 7]
const FREQUENCIES: OpsScheduleFrequency[] = ['daily', 'weekly', 'monthly']
const field = 'w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

export function OpsSchedulePanel({ schedules, templates, onChanged }: {
  schedules: OpsSchedule[]
  templates: OpsTemplate[]
  onChanged: () => void
}) {
  const { t, label } = useT()
  const outlets = useMyOutlets()
  const active = templates.filter((tpl) => tpl.isActive)
  const [templateId, setTemplateId] = useState('')
  const [outlet, setOutlet] = useState('')
  const [frequency, setFrequency] = useState<OpsScheduleFrequency>('daily')
  const [days, setDays] = useState<number[]>([])
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(null)
  const [dueTime, setDueTime] = useState('09:30')
  const [openBefore, setOpenBefore] = useState(60)      // minutes
  const [grace, setGrace] = useState(120)               // minutes
  const [saving, setSaving] = useState(false)
  const problem = scheduleProblem(frequency, days, dayOfMonth, openBefore, grace)
  const unit = windowUnit(frequency)

  const changeFrequency = (f: OpsScheduleFrequency) => {
    const d = frequencyDefaults(f)
    setFrequency(f)
    setDays(d.daysOfWeek)
    setDayOfMonth(d.dayOfMonth)
    setOpenBefore(d.openMinutesBefore)
    setGrace(d.graceMinutes)
  }

  const tplId = templateId || active[0]?.id || ''
  const outletName = outlet || outlets[0]?.name || ''
  const dayLabel = (d: number) => t(`ops.day.${d}` as 'ops.day.1')
  const daysText = (ds: number[]) => (ds.length === 0 || ds.length === 7 ? t('ops.everyDay') : ds.map(dayLabel).join(', '))
  const whenText = (s: OpsSchedule) =>
    s.frequency === 'weekly' ? t('opsSchedule.weeklyOn', { day: s.daysOfWeek.map(dayLabel).join(', ') })
      : s.frequency === 'monthly' ? t('opsSchedule.monthlyOn', { day: s.dayOfMonth ?? 1 })
        : daysText(s.daysOfWeek)

  const add = async () => {
    if (!tplId || !outletName || !dueTime || problem || saving) return
    setSaving(true)
    try {
      await opsApi.createSchedule({ templateId: tplId, outlet: outletName, frequency, daysOfWeek: days, dayOfMonth,
        dueTime, openMinutesBefore: openBefore, graceMinutes: grace })
      toast.success(t('ops.scheduleSaved'))
      onChanged()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (s: OpsSchedule) => {
    try {
      await opsApi.updateSchedule(s.id, { isActive: !s.isActive })
      onChanged()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    }
  }

  const remove = async (s: OpsSchedule) => {
    if (!window.confirm(t('ops.deleteScheduleConfirm', { name: s.templateName, outlet: s.outlet }))) return
    try {
      await opsApi.deleteSchedule(s.id)
      onChanged()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-semibold">{t('ops.newSchedule')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ops-sch-template" className="block text-xs font-semibold mb-1">{t('ops.template')}</label>
            <select id="ops-sch-template" value={tplId} onChange={(e) => setTemplateId(e.target.value)} className={field}>
              {active.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ops-sch-outlet" className="block text-xs font-semibold mb-1">{t('common.outlet')}</label>
            <select id="ops-sch-outlet" value={outletName} onChange={(e) => setOutlet(e.target.value)} className={field}>
              {outlets.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ops-sch-time" className="block text-xs font-semibold mb-1">{t('ops.dueTime')}</label>
            <input id="ops-sch-time" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={field} />
            <p className="text-[11px] text-muted-foreground mt-1">{t('ops.dueTimeHint')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="ops-sch-open" className="block text-xs font-semibold mb-1">
                {unit === 'days' ? t('opsSchedule.openBeforeDays') : t('ops.openBefore')}
              </label>
              <input id="ops-sch-open" type="number" min={0} step={unit === 'days' ? 0.5 : 15}
                value={toWindowInput(frequency, openBefore)}
                onChange={(e) => setOpenBefore(fromWindowInput(frequency, Number(e.target.value)))} className={field} />
            </div>
            <div>
              <label htmlFor="ops-sch-grace" className="block text-xs font-semibold mb-1">
                {unit === 'days' ? t('opsSchedule.graceDays') : t('ops.grace')}
              </label>
              <input id="ops-sch-grace" type="number" min={0} step={unit === 'days' ? 0.5 : 15}
                value={toWindowInput(frequency, grace)}
                onChange={(e) => setGrace(fromWindowInput(frequency, Number(e.target.value)))} className={field} />
            </div>
          </div>
        </div>
        <div role="radiogroup" aria-label={t('opsSchedule.frequency')} className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold mr-1">{t('opsSchedule.frequency')}</span>
          {FREQUENCIES.map((f) => (
            <button key={f} type="button" role="radio" aria-checked={frequency === f} onClick={() => changeFrequency(f)}
              className={cn('px-3 h-9 rounded-md border text-xs font-semibold',
                frequency === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/50')}>
              {t(`opsSchedule.freq.${f}`)}
            </button>
          ))}
        </div>
        {frequency === 'monthly' ? (
          <div className="max-w-[12rem]">
            <label htmlFor="ops-sch-dom" className="block text-xs font-semibold mb-1">{t('opsSchedule.dayOfMonth')}</label>
            <input id="ops-sch-dom" type="number" min={1} max={31} value={dayOfMonth ?? ''}
              onChange={(e) => setDayOfMonth(e.target.value ? Number(e.target.value) : null)} className={field} />
            <p className="text-[11px] text-muted-foreground mt-1">{t('opsSchedule.dayOfMonthHint')}</p>
          </div>
        ) : (
          <fieldset>
            <legend className="text-xs font-semibold mb-1">
              {t('ops.days')}{' '}
              <span className="font-normal text-muted-foreground">({frequency === 'weekly' ? t('opsSchedule.weeklyHint') : t('ops.daysHint')})</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const on = days.includes(d)
                const pick = () => (frequency === 'weekly'
                  ? setDays([d])
                  : setDays((ds) => (on ? ds.filter((x) => x !== d) : [...ds, d].sort())))
                return (
                  <label key={d} className={cn('px-3 h-9 inline-flex items-center rounded-md border text-xs font-semibold cursor-pointer',
                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50',
                    on ? 'bg-primary text-primary-foreground border-primary' : 'border-border')}>
                    <input type={frequency === 'weekly' ? 'radio' : 'checkbox'} name="ops-sch-day" className="sr-only"
                      checked={on} onChange={pick} />
                    {dayLabel(d)}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}
        {problem && <p role="alert" className="text-xs text-destructive">{t(`opsSchedule.problem.${problem}`)}</p>}
        <button type="button" onClick={add} disabled={!tplId || !outletName || !!problem || saving}
          className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />} {t('ops.addSchedule')}
        </button>
        {active.length === 0 && <p className="text-xs text-muted-foreground">{t('ops.needTemplate')}</p>}
      </div>

      {schedules.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('ops.noSchedules')}</p>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-3 py-2">{t('ops.template')}</th>
                <th className="text-left font-semibold px-3 py-2">{t('common.outlet')}</th>
                <th className="text-left font-semibold px-3 py-2">{t('ops.dueTime')}</th>
                <th className="text-left font-semibold px-3 py-2">{t('ops.days')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className={cn('border-t border-border', !s.isActive && 'opacity-50')}>
                  <td className="px-3 py-2 font-medium">{s.templateName} <span className="text-xs text-muted-foreground">· {label('opsShift', s.shift)}</span></td>
                  <td className="px-3 py-2">{s.outlet}</td>
                  <td className="px-3 py-2 tabular-nums">{s.dueTime} <span className="text-[11px] text-muted-foreground">{s.timezone}</span></td>
                  <td className="px-3 py-2 text-xs">{whenText(s)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => toggle(s)} className="text-xs font-semibold text-primary px-2">
                      {s.isActive ? t('ops.pause') : t('ops.resume')}
                    </button>
                    <button type="button" onClick={() => remove(s)} aria-label={t('common.delete')}
                      className="p-1.5 rounded hover:bg-destructive/20"><Trash2 className="size-4 text-muted-foreground" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
