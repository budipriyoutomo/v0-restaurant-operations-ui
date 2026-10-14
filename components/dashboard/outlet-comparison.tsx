'use client'

// Outlets side by side for the GM (Todo-Pilot §25 / UX-12): the numbers that
// need action, exceptions first and marked red; every number opens the list
// behind it. Hidden for a single outlet — there is nothing to compare.
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { outletsApi, type OutletComparison as Data, type OutletFlag, type OutletRow } from '@/lib/outlets-api'
import { pagePath } from '@/lib/routes'
import { navigate } from '@/lib/use-route'
import { useT } from '@/lib/i18n'

const PERIODS = [7, 30] as const

export function OutletComparison() {
  const { t } = useT()
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<Data | null>(null)
  const [onlyExceptions, setOnlyExceptions] = useState(false)

  useEffect(() => {
    let live = true
    outletsApi.compare(days).then((d) => { if (live) setData(d) }).catch(() => {})
    return () => { live = false }
  }, [days])

  if (!data || data.outlets.length < 2) return null

  const flagged = data.outlets.filter((r) => r.flags.length > 0)
  const rows = onlyExceptions ? flagged : data.outlets
  const q = (outlet: string, extra: string) => `/issues?outlet=${encodeURIComponent(outlet)}&${extra}`

  const cell = (r: OutletRow, flag: OutletFlag | null, text: string, label: string, to: string) => (
    <td className="px-3 py-2 text-right">
      <button type="button" onClick={() => navigate(to)} aria-label={label}
        data-flag={flag && r.flags.includes(flag) ? 'true' : undefined}
        className={cn('min-w-10 min-h-9 px-2 rounded-md tabular-nums hover:bg-muted',
          flag && r.flags.includes(flag) && 'bg-red-100 text-red-800 font-semibold dark:bg-red-950/60 dark:text-red-300')}>
        {text}
      </button>
    </td>
  )

  return (
    <section aria-labelledby="outlet-cmp-title" className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-48">
          <h2 id="outlet-cmp-title" className="font-semibold">{t('outletCompare.title')}</h2>
          <p className={cn('text-xs flex items-center gap-1', flagged.length ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground')}>
            {flagged.length > 0 && <AlertTriangle className="size-3.5" />}
            {flagged.length === 0 ? t('outletCompare.allClear')
              : flagged.length === 1 ? t('outletCompare.attentionOne') : t('outletCompare.attentionMany', { count: flagged.length })}
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={onlyExceptions} onChange={(e) => setOnlyExceptions(e.target.checked)} />
          {t('outletCompare.onlyExceptions')}
        </label>
        <div className="flex rounded-md border border-border overflow-hidden" role="group" aria-label={t('outletCompare.period')}>
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={days === p} onClick={() => setDays(p)}
              className={cn('px-3 h-8 text-xs font-medium', days === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              {t('outletCompare.days', { n: p })}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table aria-label={t('outletCompare.title')} className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground text-right">
              <th scope="col" className="px-3 py-2 text-left font-medium">Outlet</th>
              <th scope="col" className="px-3 py-2 font-medium">{t('outletCompare.open')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{t('outletCompare.late')}</th>
              <th scope="col" className="px-3 py-2 font-medium" title={t('outletCompare.qaHint', { min: data.thresholds.qaMinScore })}>{t('outletCompare.qa')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{t('outletCompare.guests')}</th>
              <th scope="col" className="px-3 py-2 font-medium">{t('outletCompare.budget')}</th>
              <th scope="col" className="px-3 py-2 font-medium" title={t('outletCompare.downtimeHint', { max: data.thresholds.downtimeMaxHours })}>{t('outletCompare.downtime')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.outletId}>
                <th scope="row" className="px-3 py-2 text-left font-medium">{r.outlet}</th>
                {cell(r, null, String(r.openIssues), t('outletCompare.openLabel', { n: r.openIssues, outlet: r.outlet }), q(r.outlet, 'open=1'))}
                {cell(r, 'sla', String(r.slaBreached), t('outletCompare.lateLabel', { n: r.slaBreached, outlet: r.outlet }), q(r.outlet, 'late=1'))}
                {cell(r, 'qa', r.qaScore == null ? '—' : String(r.qaScore), t('outletCompare.qaLabel', { score: r.qaScore ?? '—', outlet: r.outlet }), pagePath('qa'))}
                {cell(r, 'guest', String(r.guestWaiting), t('outletCompare.guestLabel', { n: r.guestWaiting, outlet: r.outlet }), pagePath('guest-service'))}
                {cell(r, 'budget', r.budgetPct == null ? '—' : `${r.budgetPct}%`, t('outletCompare.budgetLabel', { pct: r.budgetPct ?? '—', outlet: r.outlet }), pagePath('procurement'))}
                {cell(r, 'downtime', `${r.downtimeHours}`, t('outletCompare.downtimeLabel', { n: r.downtimeHours, outlet: r.outlet }), pagePath('cmms'))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
