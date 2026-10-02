'use client'

// Attendance recap by outlet and by role (Todo-Pilot §9).
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { api, apiErrorMessage } from '@/lib/api-client'
import { rateLabel } from '@/lib/training'
import type { AttendanceBucket, AttendanceRecap as Recap } from '@/lib/types'

export function AttendanceRecap({ refreshKey = 0 }: { refreshKey?: number }) {
  const [r, setR] = useState<Recap | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<Recap>('/api/training-programs/attendance?months=6').then(setR).catch((e) => setError(apiErrorMessage(e)))
  }, [refreshKey])

  if (error) return <p className="text-xs text-destructive">{error}</p>
  if (!r) return <p className="text-xs text-muted-foreground">Loading attendance…</p>
  if (r.totals.enrolled === 0) return <p className="text-sm text-muted-foreground py-10 text-center">No participants in the last 6 months.</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Enrolled" value={String(r.totals.enrolled)} />
        <Stat label="Attended" value={String(r.totals.attended)} />
        <Stat label="No-show" value={String(r.totals.no_show)} />
        <Stat label="Attendance rate" value={rateLabel(r.totals.attendance_rate)} sub={`${r.totals.pending} not marked yet`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RecapTable title="By outlet" rows={r.by_outlet} />
        <RecapTable title="By role" rows={r.by_role} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Rate = attended ÷ (attended + no-show). Outlet and role are taken when the person was enrolled. Last 6 months.
      </p>
    </div>
  )
}

function RecapTable({ title, rows }: { title: string; rows: (AttendanceBucket & { key: string })[] }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <p className="px-3 py-2 text-xs font-semibold border-b border-border bg-muted/40">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-muted-foreground border-b border-border">
            <th className="text-left px-3 py-1.5 font-semibold" />
            <th className="text-right px-3 py-1.5 font-semibold">Enrolled</th>
            <th className="text-right px-3 py-1.5 font-semibold">Attended</th>
            <th className="text-right px-3 py-1.5 font-semibold">No-show</th>
            <th className="text-right px-3 py-1.5 font-semibold">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((x) => (
            <tr key={x.key}>
              <td className="px-3 py-2">{x.key}</td>
              <td className="px-3 py-2 text-right">{x.enrolled}</td>
              <td className="px-3 py-2 text-right">{x.attended}</td>
              <td className="px-3 py-2 text-right">{x.no_show}</td>
              <td className={cn('px-3 py-2 text-right font-semibold',
                x.attendance_rate === null ? 'text-muted-foreground'
                  : x.attendance_rate >= 90 ? 'text-emerald-600' : x.attendance_rate >= 70 ? 'text-amber-600' : 'text-red-600')}>
                {rateLabel(x.attendance_rate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}
