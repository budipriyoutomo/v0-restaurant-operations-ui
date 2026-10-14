'use client'

// Guest Service KPIs: first response, resolution, recovery cost (Todo-Pilot §8).
// Used on the Guest Service page and on Analytics.
import { useEffect, useState } from 'react'
import { Clock, Gauge, Timer, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { formatDuration, formatIDR } from '@/lib/guest-service'
import { guestApi } from '@/lib/guest-service-api'
import { useT } from '@/lib/i18n'
import type { GuestChannel, GuestKpis } from '@/lib/types'
import { formatMoney } from '@/lib/money'

export function GuestKpiPanel({ refreshKey = 0, compact = false }: { refreshKey?: number; compact?: boolean }) {
  const { t, label, locale } = useT()
  const [k, setK] = useState<GuestKpis | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    guestApi.kpis(3).then(setK).catch((e) => setError(apiErrorMessage(e)))
  }, [refreshKey])

  if (error) return <p className="text-xs text-destructive">{error}</p>
  if (!k) return <p className="text-xs text-muted-foreground">{t('guestKpi.loading')}</p>
  if (k.cases === 0) return <p className="text-sm text-muted-foreground py-6 text-center">{t('guestKpi.empty')}</p>

  const within = k.withinTargetPct
  const comp = Object.entries(k.compensationTotal)
  const channels = Object.entries(k.byChannel) as [GuestChannel, number][]
  const maxChannel = Math.max(1, ...channels.map(([, n]) => n))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Clock} label={t('guestKpi.firstResponse')} value={formatDuration(k.medianFirstResponseMinutes, locale)}
          sub={t('guestKpi.firstResponseSub', { avg: formatDuration(k.avgFirstResponseMinutes, locale), responded: k.responded, cases: k.cases })} />
        <Kpi icon={Gauge} label={t('guestKpi.within', { target: formatDuration(k.targetMinutes, locale) })}
          value={within === null ? '—' : `${within}%`}
          tone={within === null ? undefined : within >= 90 ? 'good' : within >= 70 ? 'warn' : 'bad'} />
        <Kpi icon={Timer} label={t('guestKpi.resolution')} value={formatDuration(k.medianResolutionMinutes, locale)}
          sub={t('guestKpi.resolutionSub', { avg: formatDuration(k.avgResolutionMinutes, locale), open: k.open })} />
        <Kpi icon={Wallet} label={t('guestKpi.recoveryCost')} value={comp.length ? comp.map(([cur, v]) => cur === 'IDR' ? formatIDR(v) : `${cur} ${v}`).join(' · ') : formatMoney(0)}
          sub={t('guestKpi.recoverySub', { count: k.cases })} />
      </div>

      {!compact && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold">{t('guestKpi.byChannel')}</p>
            {channels.sort((a, b) => b[1] - a[1]).map(([ch, n]) => (
              <div key={ch} className="space-y-0.5">
                <div className="flex justify-between text-xs"><span>{label('guestChannel', ch)}</span><span className="text-muted-foreground">{n}</span></div>
                <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / maxChannel) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2 font-semibold">{t('common.outlet')}</th>
                  <th className="text-right px-3 py-2 font-semibold">{t('guestKpi.cases')}</th>
                  <th className="text-right px-3 py-2 font-semibold">{t('guestKpi.avgResponse')}</th>
                  <th className="text-right px-3 py-2 font-semibold hidden sm:table-cell">{t('guestKpi.avgResolution')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {k.perOutlet.map((o) => (
                  <tr key={o.outlet}>
                    <td className="px-3 py-2">{o.outlet}{o.open > 0 && <span className="ml-1 text-[11px] text-amber-700">{t('guestKpi.openCount', { count: o.open })}</span>}</td>
                    <td className="px-3 py-2 text-right">{o.cases}</td>
                    <td className="px-3 py-2 text-right">{formatDuration(o.avgFirstResponseMinutes, locale)}</td>
                    <td className="px-3 py-2 text-right hidden sm:table-cell">{formatDuration(o.avgResolutionMinutes, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, tone }: {
  icon: React.ElementType; label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad'
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className={cn('text-2xl font-bold mt-1',
        tone === 'good' && 'text-emerald-700', tone === 'warn' && 'text-amber-700', tone === 'bad' && 'text-red-600')}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}
