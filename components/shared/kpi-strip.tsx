// The KPI status bar of a module page (Todo-Modern-UI Fase 4): one row of
// figures, not four loud cards. It shows only when the module has data — an
// empty module gets its EmptyState instead — and a figure wears its signal
// colour only when it is above 0 (toneIfAny). While loading: placeholders,
// never a misleading coloured 0.
import { cn } from '@/lib/utils'
import { SIGNAL_TEXT, toneIfAny, type Signal } from '@/lib/tone'
import { Skeleton } from './skeleton'

export interface KpiItem {
  label: string
  /** null = no data for this figure ("—"). */
  value: number | string | null
  signal?: Signal
  hint?: string
}

const COLS: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' }

const hasData = (v: KpiItem['value']) => (typeof v === 'number' ? v !== 0 : v !== null && v !== '' && v !== '—')

export function KpiStrip({ label, items, loading = false, className }: {
  /** Names the region for screen readers, e.g. "Ringkasan aset". */
  label: string
  items: KpiItem[]
  loading?: boolean
  className?: string
}) {
  if (!loading && !items.some((i) => hasData(i.value))) return null
  return (
    <section aria-label={label} aria-busy={loading || undefined}
      className={cn('grid grid-cols-2 rounded-lg border border-border bg-card', COLS[items.length] ?? 'sm:grid-cols-4', className)}>
      {items.map((item, i) => {
        const numeric = typeof item.value === 'number' ? item.value : null
        const signal = item.signal && item.signal !== 'neutral' ? (typeof item.value === 'number' ? toneIfAny(numeric, item.signal) : item.signal) : undefined
        return (
          <div key={item.label} className={cn('px-4 py-3 min-w-0 border-border',
            i % 2 === 1 && 'border-l', i >= 2 && 'max-sm:border-t', i > 0 && 'sm:border-l')}>
            <p className="text-xs text-muted-foreground truncate">{item.label}</p>
            {loading ? (
              <Skeleton className="h-6 w-12 mt-1" />
            ) : (
              <p className={cn('text-xl font-semibold tabular-nums leading-tight mt-0.5', signal ? SIGNAL_TEXT[signal] : 'text-foreground')}>
                {item.value === null ? '—' : item.value}
              </p>
            )}
            {item.hint && !loading && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.hint}</p>}
          </div>
        )
      })}
    </section>
  )
}
