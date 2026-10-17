'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Play, Trash2, CalendarClock, Loader2, Gauge } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { CreatePMScheduleInput, PMIntervalType, PMTriggerType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { EmptyState as SharedEmptyState } from '@/components/shared/empty-state'

const EMPTY_FORM: CreatePMScheduleInput = {
  assetId: '',
  name: '',
  triggerType: 'calendar',
  intervalType: 'days',
  intervalValue: 30,
  meterInterval: 500,
  checklist: [],
  leadTimeDays: 0,
  nextDueDate: '',
  assigneeName: '',
  isActive: true,
}

export function PMSchedulePanel() {
  const { assets, pmSchedules, pmLoading, loadPMSchedules, createPMSchedule, deletePMSchedule, updatePMSchedule, runPMGenerator, recordMeterReading } =
    useIssueStore()
  const { can } = usePermissions()
  const { t, date } = useT()

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [form, setForm] = useState<CreatePMScheduleInput>(EMPTY_FORM)
  const [checklistText, setChecklistText] = useState('')
  const [meterAsset, setMeterAsset] = useState('')
  const [meterValue, setMeterValue] = useState('')

  useEffect(() => {
    loadPMSchedules()
  }, [loadPMSchedules])

  function resetForm() {
    setForm(EMPTY_FORM)
    setChecklistText('')
    setShowForm(false)
  }

  const isMeter = form.triggerType === 'meter'
  const formAsset = assets.find((a) => a.id === form.assetId)

  async function handleSave() {
    if (!form.assetId) return toast.error(t('pm.pickAsset'))
    if (!form.name.trim()) return toast.error(t('pm.nameRequired'))
    if (isMeter) {
      if (!form.meterInterval || form.meterInterval < 1) return toast.error(t('pm.meterRequired'))
    } else if (!form.nextDueDate) {
      return toast.error(t('pm.firstDueRequired'))
    }
    setSaving(true)
    try {
      const checklist = checklistText.split('\n').map((s) => s.trim()).filter(Boolean)
      const payload: CreatePMScheduleInput = { ...form, checklist }
      if (isMeter) payload.nextDueDate = null
      await createPMSchedule(payload)
      toast.success(t('pm.created'))
      resetForm()
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleRecordReading() {
    if (!meterAsset) return toast.error(t('pm.pickAssetShort'))
    const v = Number(meterValue)
    if (Number.isNaN(v) || v < 0) return toast.error(t('pm.badMeter'))
    try {
      await recordMeterReading(meterAsset, v)
      toast.success(t('pm.readingRecorded'))
      setMeterValue('')
    } catch (e) {
      toast.error(String(e))
    }
  }

  async function handleRun() {
    setRunning(true)
    try {
      const result = await runPMGenerator()
      if (result.generated > 0) {
        toast.success(t('pm.generated', { count: result.generated }))
      } else {
        toast.message(t('pm.nothingDue'))
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setRunning(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t('pm.confirmDelete', { name }))) return
    try {
      await deletePMSchedule(id)
      toast.success(t('pm.deleted'))
    } catch (e) {
      toast.error(String(e))
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await updatePMSchedule(id, { isActive: !isActive })
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">{t('pm.title')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('pm.subtitle')}
            </p>
          </div>
        </div>
        {can.managePM && (
          <div className="flex items-center gap-2">
            {can.runPMGenerator && (
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                {t('pm.runNow')}
              </button>
            )}
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              {showForm ? t('common.close') : t('pm.newSchedule')}
            </button>
          </div>
        )}
      </div>

      {/* Create form */}
      {showForm && can.managePM && (
        <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">{t('pm.asset')}</span>
              <select
                value={form.assetId}
                onChange={(e) => setForm({ ...form, assetId: e.target.value, assigneeUserId: undefined, assigneeName: '' })}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="">{t('pm.pickAssetOption')}</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} · {a.outlet}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">{t('pm.name')}</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('pm.namePlaceholder')}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">{t('pm.trigger')}</span>
              <select
                value={form.triggerType}
                onChange={(e) => setForm({ ...form, triggerType: e.target.value as PMTriggerType })}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="calendar">{t('pm.triggerCalendar')}</option>
                <option value="meter">{t('pm.triggerMeter')}</option>
              </select>
            </label>

            {isMeter ? (
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-muted-foreground">{t('pm.meterInterval')}</span>
                <input
                  type="number" min={1}
                  value={form.meterInterval ?? 0}
                  onChange={(e) => setForm({ ...form, meterInterval: Number(e.target.value) })}
                  placeholder={t('pm.meterPlaceholder')}
                  className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
                />
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold text-muted-foreground">{t('pm.interval')}</span>
                  <div className="flex gap-1">
                    <input
                      type="number" min={1}
                      value={form.intervalValue}
                      onChange={(e) => setForm({ ...form, intervalValue: Number(e.target.value) })}
                      className="h-9 w-14 rounded-lg border border-border bg-background px-2 text-xs"
                    />
                    <select
                      value={form.intervalType}
                      onChange={(e) => setForm({ ...form, intervalType: e.target.value as PMIntervalType })}
                      className="h-9 flex-1 rounded-lg border border-border bg-background px-1 text-xs"
                    >
                      <option value="days">{t('pm.days')}</option>
                      <option value="weeks">{t('pm.weeks')}</option>
                      <option value="months">{t('pm.months')}</option>
                    </select>
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold text-muted-foreground">{t('pm.firstDue')}</span>
                  <input
                    type="date"
                    value={form.nextDueDate ?? ''}
                    onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
                  />
                </label>
              </>
            )}

            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">{t('pm.leadTime')}</span>
              <input
                type="number"
                min={0}
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: Number(e.target.value) })}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* A user of the asset's outlet, so the generated WO notifies them (Todo-Pilot §17) */}
            <div className="flex flex-col gap-1 text-xs">
              <label htmlFor="pm-assignee" className="font-semibold text-muted-foreground">{t('pm.assignee')}</label>
              {formAsset ? (
                <AssigneePicker
                  id="pm-assignee"
                  outlet={formAsset.outlet}
                  value={form.assigneeUserId ?? null}
                  onChange={(userId, name) => setForm({ ...form, assigneeUserId: userId ?? undefined, assigneeName: userId ? name : '' })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
                />
              ) : (
                <select id="pm-assignee" disabled className="h-9 rounded-lg border border-border bg-background px-2 text-xs">
                  <option>{t('pm.pickAssetForAssignee')}</option>
                </select>
              )}
            </div>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">{t('pm.checklist')}</span>
              <textarea
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                rows={2}
                placeholder={t('pm.checklistPlaceholder')}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs resize-y"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={resetForm} className="px-3 h-9 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {t('pm.save')}
            </button>
          </div>
        </div>
      )}

      {/* Meter reading recorder (for meter-based schedules) */}
      {can.managePM && assets.length > 0 && (
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/10 p-2.5">
          <Gauge className="size-4 text-primary mb-1.5" />
          <span className="text-xs font-semibold text-muted-foreground mb-1.5">{t('pm.recordReading')}</span>
          <select
            value={meterAsset}
            onChange={(e) => setMeterAsset(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
          >
            <option value="">{t('pm.assetOption')}</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input
            type="number" min={0} value={meterValue}
            onChange={(e) => setMeterValue(e.target.value)}
            placeholder={t('pm.meterValue')}
            className="h-9 w-40 rounded-lg border border-border bg-background px-2 text-xs"
          />
          <button
            onClick={handleRecordReading}
            className="px-2.5 h-9 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            {t('pm.record')}
          </button>
        </div>
      )}

      {/* Schedule list */}
      {pmLoading ? (
        <p className="text-xs text-muted-foreground text-center py-6">{t('pm.loading')}</p>
      ) : pmSchedules.length === 0 ? (
        <SharedEmptyState title={t('pm.empty')} className="py-10 text-sm" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2.5 font-semibold">{t('pm.colSchedule')}</th>
                <th className="text-left py-2.5 font-semibold">{t('pm.asset')}</th>
                <th className="text-left py-2.5 font-semibold">{t('pm.interval')}</th>
                <th className="text-left py-2.5 font-semibold">{t('pm.colDue')}</th>
                <th className="text-left py-2.5 font-semibold">{t('wo.checklist')}</th>
                <th className="text-left py-2.5 font-semibold">{t('common.status')}</th>
                {can.managePM && <th className="py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pmSchedules.map((s) => (
                <tr key={s.id} className="hover:bg-accent/40 transition-colors">
                  <td className="py-2.5 font-semibold">
                    {s.name}
                    {s.triggerType === 'meter' && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs font-semibold border bg-primary/10 text-primary border-primary/20">
                        <Gauge className="size-2.5" /> {t('pm.meterBadge')}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-muted-foreground">{s.assetName}</td>
                  <td className="py-2.5 text-muted-foreground">
                    {s.triggerType === 'meter'
                      ? t('pm.everyUnits', { n: s.meterInterval ?? 0 })
                      : t('pm.every', { n: s.intervalValue, unit: t(`pm.unit.${s.intervalType}`) })}
                  </td>
                  <td className="py-2.5 text-muted-foreground">
                    {s.triggerType === 'meter'
                      ? t('pm.meterReading', { value: s.lastMeterValue ?? 0 })
                      : date(s.nextDueDate)}
                  </td>
                  <td className="py-2.5 text-muted-foreground">{t('pm.items', { count: s.checklist.length })}</td>
                  <td className="py-2.5">
                    <button
                      disabled={!can.managePM}
                      onClick={() => toggleActive(s.id, s.isActive)}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs font-semibold border',
                        s.isActive
                          ? 'bg-success/15 text-success border-success/30'
                          : 'bg-muted text-muted-foreground border-border',
                        can.managePM && 'hover:opacity-80 cursor-pointer',
                      )}
                    >
                      {s.isActive ? t('pm.active') : t('pm.inactive')}
                    </button>
                  </td>
                  {can.managePM && (
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="size-9 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title={t('pm.delete')}
                        aria-label={t('pm.delete')}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
