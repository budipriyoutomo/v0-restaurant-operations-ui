'use client'

// Checklist compliance per outlet (Todo-Ops-Checklist Fase 3) — in Daily Ops and
// in Analytics. Worst outlet first; a row opens that outlet's run history.
// compliance = runs submitted on time ÷ runs that were due.
import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronRight, Thermometer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { opsApi } from '@/lib/ops-checklist-api'
import type { OpsKpis } from '@/lib/types'
import { useT } from '@/lib/i18n'

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

// Status bands for a compliance %, always shown with the number and a label.
export function complianceTone(c: number | null): 'good' | 'warning' | 'critical' | 'none' {
  if (c === null) return 'none'
  if (c >= 90) return 'good'
  if (c >= 70) return 'warning'
  return 'critical'
}
const TONE_TEXT = { good: 'text-emerald-700 dark:text-emerald-400', warning: 'text-amber-700 dark:text-amber-400', critical: 'text-red-700 dark:text-red-400', none: 'text-muted-foreground' }

export function OpsKpiPanel({ onOutlet, compact = false }: { onOutlet: (outlet: string) => void; compact?: boolean }) {
  const { t, date } = useT()
  const [days, setDays] = useState(7)
  const [data, setData] = useState<OpsKpis | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    const to = new Date()
    const from = new Date(to.getTime() - (days - 1) * 86_400_000)
    setData(null)
    setFailed(false)
    opsApi.kpis(isoDay(from), isoDay(to)).then((d) => live && setData(d)).catch(() => live && setFailed(true))
    return () => { live = false }
  }, [days])

  if (failed) return <p className="text-xs text-destructive">{t('opsKpi.failed')}</p>
  if (!data) return <div className="h-40 rounded-xl bg-muted animate-pulse" />

  const tot = data.totals
  const tiles = [
    { label: t('opsKpi.compliance'), value: tot.compliance === null ? '—' : `${tot.compliance}%`, tone: complianceTone(tot.compliance) },
    { label: t('opsKpi.onTime'), value: String(tot.onTime), tone: 'none' as const },
    { label: t('opsKpi.late'), value: String(tot.late), tone: 'none' as const },
    { label: t('opsKpi.missed'), value: String(tot.missed), tone: tot.missed > 0 ? 'critical' as const : 'none' as const },
    { label: t('opsKpi.excursions'), value: String(tot.excursions), tone: tot.excursions > 0 ? 'warning' as const : 'none' as const },
    { label: t('opsKpi.issues'), value: String(tot.issuesCreated), tone: 'none' as const },
  ]
  const maxWeek = Math.max(1, ...data.trend.map((w) => w.scheduled))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">{t('opsKpi.range', { from: date(data.from), to: date(data.to) })}</p>
        <div role="group" aria-label={t('opsKpi.period')} className="flex gap-1">
          {[7, 30].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d}
              className={cn('h-8 px-3 rounded-md border text-xs font-semibold',
                days === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/50')}>
              {t('opsKpi.lastDays', { days: d })}
            </button>
          ))}
        </div>
      </div>

      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-6')}>
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{tile.label}</p>
            <p className={cn('text-xl font-bold tabular-nums mt-0.5', TONE_TEXT[tile.tone])}>{tile.value}</p>
          </div>
        ))}
      </div>

      {data.outlets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('opsKpi.empty')}</p>
      ) : (
        <ul className="rounded-xl border border-border divide-y divide-border bg-card">
          {data.outlets.map((o) => {
            const tone = complianceTone(o.compliance)
            return (
              <li key={o.outletId}>
                <button type="button" onClick={() => onOutlet(o.outlet)}
                  aria-label={t('opsKpi.openOutlet', { outlet: o.outlet })}
                  className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{o.outlet}</span>
                      <span className={cn('text-sm font-bold tabular-nums', TONE_TEXT[tone])}>
                        {o.compliance === null ? '—' : `${o.compliance}%`}
                        {tone === 'critical' && <span className="sr-only"> ({t('opsKpi.low')})</span>}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden>
                      <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${o.compliance ?? 0}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                      <span>{t('opsKpi.counts', { onTime: o.onTime, late: o.late, missed: o.missed, scheduled: o.scheduled })}</span>
                      {o.avgScore !== null && <span>{t('opsKpi.avgScore', { score: o.avgScore })}</span>}
                      {o.excursions > 0 && <span className="text-amber-700 inline-flex items-center gap-1"><Thermometer className="size-3" aria-hidden /> {t('opsKpi.excursionCount', { count: o.excursions })}</span>}
                      {o.issuesCreated > 0 && <span>{t('opsKpi.issueCount', { count: o.issuesCreated })}</span>}
                    </p>
                    {!compact && o.topFailing.length > 0 && (
                      <p className="text-[11px] text-red-700 dark:text-red-400 inline-flex items-center gap-1">
                        <AlertTriangle className="size-3" aria-hidden />
                        {t('opsKpi.topFailing')}: {o.topFailing.map((f) => `${f.title} (${f.count}×)`).join(', ')}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!compact && (
        <div className="space-y-2">
          <p className="text-xs font-semibold">{t('opsKpi.trend')}</p>
          <div className="flex items-end gap-1.5 h-24" role="list" aria-label={t('opsKpi.trend')}>
            {data.trend.map((w) => (
              <div key={w.weekStart} role="listitem" className="flex-1 flex flex-col items-center gap-1"
                title={`${date(w.weekStart)}: ${w.compliance === null ? '—' : `${w.compliance}%`} (${w.onTime}/${w.scheduled})`}>
                <span className="text-[10px] tabular-nums text-muted-foreground">{w.compliance === null ? '—' : `${Math.round(w.compliance)}`}</span>
                <div className="w-full rounded-t-[4px] bg-[var(--chart-1)]"
                  style={{ height: `${w.compliance === null ? 0 : Math.max(2, (w.compliance / 100) * 56)}px`, opacity: w.scheduled / maxWeek > 0 ? 1 : 0.3 }} />
                <span className="text-[9px] text-muted-foreground">{w.weekStart.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
