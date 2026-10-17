'use client'

import { Calendar } from 'lucide-react'
import { Asset } from '@/lib/types'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// PM Calendar — marks days that have a scheduled next_pm for any asset
// ---------------------------------------------------------------------------
export function PMCalendar({ assets }: { assets: Asset[] }) {
  const { t, locale } = useT()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()   // 0-indexed

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Build a set of days that have an asset's nextPM this month
  const pmDayMap: Record<number, 'pm' | 'overdue'> = {}
  assets.forEach((a) => {
    if (!a.nextPM) return
    const d = new Date(a.nextPM)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      const isOverdue = d < now
      pmDayMap[day] = isOverdue ? 'overdue' : 'pm'
    }
  })

  const monthLabel = now.toLocaleString(locale === 'id' ? 'id-ID' : 'en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{t('pmCalendar.title', { month: monthLabel })}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t('pmCalendar.subtitle')}</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {t('pmCalendar.weekdays').split(',').map((d, i) => (
          <div key={i} className="text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
        {calendarDays.map((day) => {
          const pmType = pmDayMap[day]
          const isToday = day === now.getDate()
          return (
            <div
              key={day}
              className={cn(
                'text-xs rounded aspect-square flex items-center justify-center',
                pmType === 'pm'      && 'bg-primary/20 text-primary font-semibold',
                pmType === 'overdue' && 'bg-destructive/20 text-destructive font-semibold',
                !pmType && 'text-muted-foreground',
                isToday && !pmType  && 'ring-1 ring-primary/40 font-semibold text-foreground',
              )}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary/60" />{t('pmCalendar.scheduled')}</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-destructive/60" />{t('pmCalendar.overdue')}</span>
      </div>
    </div>
  )
}
