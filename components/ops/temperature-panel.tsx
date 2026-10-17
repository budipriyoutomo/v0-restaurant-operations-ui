'use client'

// Food safety temperature of one asset (Todo-Ops-Checklist Fase 2), in the CMMS
// asset detail: monitoring settings, a 30-day chart with the allowed band and
// the excursions marked, a table view, and a manual reading.
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Thermometer } from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { QueuedError, apiErrorMessage } from '@/lib/api-client'
import { opsApi } from '@/lib/ops-checklist-api'
import { evaluateItem } from '@/lib/ops-checklist'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import type { Asset, TemperatureLog } from '@/lib/types'
import { SensorPanel } from './sensor-panel'
import { useT } from '@/lib/i18n'

const field = 'px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'
const num = (s: string): number | null => (s.trim() === '' || s.trim() === '-' ? null : Number(s.replace(',', '.')))

export function TemperaturePanel({ asset }: { asset: Asset }) {
  const { t } = useT()
  const { can } = usePermissions()
  const manage = can.manageAssets || can.manageCMMS
  if (!asset.tempMonitored) {
    return manage ? <MonitoringSettings asset={asset} /> : null
  }
  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-semibold flex items-center gap-1.5"><Thermometer className="size-3.5" aria-hidden /> {t('temp.title')}</h4>
        <span className="text-xs text-muted-foreground">{t('temp.limits', { min: asset.tempMin ?? '—', max: asset.tempMax ?? '—' })}</span>
      </div>
      <TemperatureHistory asset={asset} />
      {can.manageOps && <SensorPanel asset={asset} />}
      {manage && <MonitoringSettings asset={asset} />}
    </div>
  )
}

function MonitoringSettings({ asset }: { asset: Asset }) {
  const { t } = useT()
  const updateAsset = useIssueStore((s) => s.updateAsset)
  const [on, setOn] = useState(!!asset.tempMonitored)
  const [min, setMin] = useState(asset.tempMin == null ? '' : String(asset.tempMin))
  const [max, setMax] = useState(asset.tempMax == null ? '' : String(asset.tempMax))
  const [saving, setSaving] = useState(false)
  const lo = num(min), hi = num(max)
  const valid = !on || (lo === null || hi === null || lo < hi)
  const changed = on !== !!asset.tempMonitored || lo !== (asset.tempMin ?? null) || hi !== (asset.tempMax ?? null)

  const save = async () => {
    setSaving(true)
    try {
      await updateAsset(asset.id, { tempMonitored: on, tempMin: on ? lo : asset.tempMin ?? null, tempMax: on ? hi : asset.tempMax ?? null })
      toast.success(t('temp.settingsSaved'))
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('rounded-md border border-border p-3 space-y-2', !asset.tempMonitored && 'mt-4')}>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="size-4 accent-primary" />
        {t('temp.monitor')}
      </label>
      {on && (
        <div className="flex items-end gap-2 flex-wrap">
          <label className="text-xs text-muted-foreground">{t('temp.min')}
            <input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} className={cn(field, 'block w-24 mt-0.5')} />
          </label>
          <label className="text-xs text-muted-foreground">{t('temp.max')}
            <input inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} className={cn(field, 'block w-24 mt-0.5')} />
          </label>
          <span className="text-xs text-muted-foreground pb-2">°C</span>
        </div>
      )}
      {!valid && <p className="text-xs text-destructive">{t('temp.minBelowMax')}</p>}
      {changed && (
        <button type="button" onClick={save} disabled={!valid || saving}
          className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
          {saving ? t('common.saving') : t('common.save')}
        </button>
      )}
    </div>
  )
}

function TemperatureHistory({ asset }: { asset: Asset }) {
  const { t, dateTime, date } = useT()
  const [logs, setLogs] = useState<TemperatureLog[] | null>(null)
  const [key, setKey] = useState(0)

  useEffect(() => {
    let live = true
    opsApi.temperatureLogs(asset.id, 30).then((rows) => live && setLogs(rows)).catch(() => live && setLogs([]))
    return () => { live = false }
  }, [asset.id, key])

  const data = useMemo(() => (logs ?? []).map((l) => ({ ...l, t: Date.parse(l.recordedAt) })), [logs])
  const excursions = data.filter((d) => !d.inRange).length
  const lo = asset.tempMin ?? null, hi = asset.tempMax ?? null
  const values = data.map((d) => d.value).concat([lo, hi].filter((v): v is number => v !== null))
  const domain: [number, number] = values.length
    ? [Math.floor(Math.min(...values) - 2), Math.ceil(Math.max(...values) + 2)] : [-25, 10]

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {t('temp.last30', { count: data.length })}
        {excursions > 0 && <span className="ml-2 text-destructive inline-flex items-center gap-1"><AlertTriangle className="size-3" aria-hidden /> {t('temp.excursions', { count: excursions })}</span>}
      </p>
      {logs === null ? <div className="h-48 rounded-md bg-muted animate-pulse" />
        : data.length === 0 ? <p className="text-xs text-muted-foreground py-6 text-center">{t('temp.noReadings')}</p>
        : (
          <div className="h-48" role="img" aria-label={t('temp.chartLabel', { name: asset.name, count: data.length, excursions })}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                {lo !== null && hi !== null && (
                  <ReferenceArea y1={lo} y2={hi} fill="var(--muted-foreground)" fillOpacity={0.08} ifOverflow="extendDomain" />
                )}
                {lo !== null && <ReferenceLine y={lo} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth={1} />}
                {hi !== null && <ReferenceLine y={hi} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth={1} />}
                <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']}
                  tickFormatter={(v: number) => date(new Date(v).toISOString())} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  stroke="var(--border)" />
                <YAxis domain={domain} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" unit="°" width={40} />
                <Tooltip
                  cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const p = active && payload?.[0]?.payload as (TemperatureLog & { t: number }) | undefined
                    if (!p) return null
                    return (
                      <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
                        <p className="font-semibold tabular-nums">{p.value} °C</p>
                        <p className="text-muted-foreground">{dateTime(p.recordedAt)} · {t(`temp.source.${p.source}`)}</p>
                        {!p.inRange && <p className="text-destructive">{t('temp.outOfRange')}</p>}
                        {p.correctiveAction && <p className="text-muted-foreground max-w-[220px]">{p.correctiveAction}</p>}
                      </div>
                    )
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} isAnimationActive={false}
                  activeDot={{ r: 5, stroke: 'var(--background)', strokeWidth: 2 }}
                  dot={(props: { cx?: number; cy?: number; payload?: TemperatureLog; index?: number }) => {
                    const { cx, cy, payload, index } = props
                    if (cx == null || cy == null || !payload || payload.inRange) return <g key={`d-${index}`} />
                    return <circle key={`d-${index}`} cx={cx} cy={cy} r={4} fill="var(--destructive)" stroke="var(--background)" strokeWidth={2} />
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      {data.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">{t('temp.showTable')}</summary>
          <table className="w-full mt-2">
            <thead className="text-muted-foreground text-xs"><tr>
              <th className="text-left font-semibold py-1">{t('temp.time')}</th>
              <th className="text-right font-semibold py-1">°C</th>
              <th className="text-left font-semibold py-1 pl-3">{t('temp.status')}</th>
            </tr></thead>
            <tbody>
              {[...data].reverse().map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-1">{dateTime(l.recordedAt)}</td>
                  <td className="py-1 text-right tabular-nums">{l.value}</td>
                  <td className="py-1 pl-3">{l.inRange ? t('temp.inRange')
                    : <span className="text-destructive inline-flex items-center gap-1"><AlertTriangle className="size-3" aria-hidden /> {t('temp.outOfRange')}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      <ManualReading asset={asset} onSaved={() => setKey((k) => k + 1)} />
    </div>
  )
}

function ManualReading({ asset, onSaved }: { asset: Asset; onSaved: () => void }) {
  const { t } = useT()
  const [value, setValue] = useState('')
  const [action, setAction] = useState('')
  const [saving, setSaving] = useState(false)
  const v = num(value)
  const result = v === null || Number.isNaN(v) ? null : evaluateItem(v, asset.tempMin ?? null, asset.tempMax ?? null)
  const needsAction = result === 'fail'
  const ready = result !== null && (!needsAction || action.trim() !== '')

  const save = async () => {
    if (!ready || v === null || saving) return
    setSaving(true)
    try {
      await opsApi.recordTemperature(asset.id, { value: v, ...(needsAction ? { correctiveAction: action.trim() } : {}) })
      toast.success(needsAction ? t('temp.savedExcursion') : t('temp.saved'))
      setValue(''); setAction('')
      onSaved()
    } catch (e) {
      if (e instanceof QueuedError) { toast.info(t('temp.savedOffline')); setValue(''); setAction('') }
      else toast.error(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <p className="text-xs font-semibold">{t('temp.recordNow')}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setValue((d) => (d.startsWith('-') ? d.slice(1) : `-${d}`))}
          aria-label={t('ops.toggleSign')} className="size-10 rounded-md border border-border text-lg font-bold">±</button>
        <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.,-]/g, ''))}
          aria-label={t('temp.reading')} placeholder="°C"
          className={cn(field, 'w-24 h-10 text-base font-semibold tabular-nums', needsAction && 'border-red-400 text-red-700 dark:text-red-400')} />
        <button type="button" onClick={save} disabled={!ready || saving}
          className="h-10 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
          {saving ? t('common.saving') : t('temp.record')}
        </button>
      </div>
      {needsAction && (
        <textarea value={action} onChange={(e) => setAction(e.target.value)} rows={2}
          aria-label={t('ops.correctiveAction')} placeholder={t('ops.correctivePlaceholder')}
          className={cn(field, 'w-full border-red-300')} />
      )}
    </div>
  )
}
