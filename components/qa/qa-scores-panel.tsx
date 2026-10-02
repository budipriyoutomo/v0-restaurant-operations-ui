'use client'

// QA score per outlet + monthly trend (Todo-Pilot §7). Used on the QA page and
// on Analytics.
import { useEffect, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { scoreTone } from '@/lib/qa-audit'
import { qaApi } from '@/lib/qa-audit-api'
import type { QAScores } from '@/lib/types'
import { TONE_CLASS } from './tone'

const LINE_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d']

export function QAScoresPanel({ refreshKey = 0, compact = false }: { refreshKey?: number; compact?: boolean }) {
  const [data, setData] = useState<QAScores | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    qaApi.scores(6).then(setData).catch((e) => setError(apiErrorMessage(e)))
  }, [refreshKey])

  if (error) return <p className="text-xs text-destructive">{error}</p>
  if (!data) return <p className="text-xs text-muted-foreground">Loading QA scores…</p>
  if (data.outlets.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No submitted audits in the last 6 months.</p>
  }

  // Recharts wants one row per month with a key per outlet.
  const months = [...new Set(Object.values(data.trend).flat().map((p) => p.month))].sort()
  const outlets = Object.keys(data.trend)
  const chartRows = months.map((m) => ({
    month: m,
    ...Object.fromEntries(outlets.map((o) => [o, data.trend[o].find((p) => p.month === m)?.score ?? null])),
  }))

  return (
    <div className={cn('grid gap-4', !compact && 'lg:grid-cols-5')}>
      <div className={cn('rounded-xl border border-border bg-card overflow-hidden', !compact && 'lg:col-span-2')}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="text-left px-3 py-2 font-semibold">Outlet</th>
              <th className="text-right px-3 py-2 font-semibold">Latest</th>
              <th className="text-right px-3 py-2 font-semibold hidden sm:table-cell">Audits</th>
              <th className="text-right px-3 py-2 font-semibold">Repeats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.outlets.map((o) => (
              <tr key={o.outlet}>
                <td className="px-3 py-2">
                  <p className="font-medium">{o.outlet}</p>
                  <p className="text-[11px] text-muted-foreground">{o.latestDate}</p>
                </td>
                <td className={cn('px-3 py-2 text-right font-bold', TONE_CLASS[scoreTone(o.latestScore)])}>
                  {o.latestScore ?? '—'}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">{o.audits}</td>
                <td className="px-3 py-2 text-right">
                  {o.repeatFindings > 0
                    ? <span className="inline-flex items-center gap-1 text-orange-600 font-semibold"><Repeat className="size-3" />{o.repeatFindings}</span>
                    : <span className="text-muted-foreground">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cn('rounded-xl border border-border bg-card p-3', !compact && 'lg:col-span-3')}>
        <p className="text-xs font-semibold mb-2">Monthly average score</p>
        <ResponsiveContainer width="100%" height={compact ? 180 : 240}>
          <LineChart data={chartRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} width={30} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {outlets.map((o, i) => (
              <Line key={o} type="monotone" dataKey={o} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
