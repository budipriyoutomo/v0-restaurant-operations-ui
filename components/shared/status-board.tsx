'use client'

// Cards grouped by status. Wide screens (≥ 1024px): a kanban board, one column
// per status, cards dragged between columns. Phones and tablets: status tabs
// with counts and one full-width list — no sideways scrolling, and no dragging,
// which touch screens cannot do (cards move with their own status control).
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useMediaQuery, WIDE_SCREEN } from '@/lib/use-media-query'
import { SegmentedTabs } from '@/components/shared/segmented-tabs'

export interface BoardColumn<S extends string, T> {
  id: S
  label: string
  dot: string        // bg-* of the status dot
  accent: string     // border-t-* of the column
  ring: string       // ring-* while a card is dragged over
  items: T[]
  count?: number     // shown count when not every card is loaded (default items.length)
  footer?: React.ReactNode
}

export interface CardDrag {
  draggable: boolean
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

const NO_DRAG: CardDrag = { draggable: false, dragging: false, onDragStart: () => {}, onDragEnd: () => {} }

export function StatusBoard<S extends string, T>({
  label, columns, getId, renderCard, onDrop, value, onValueChange, emptyText, dropHereText, loading, fill,
}: {
  label: string
  columns: BoardColumn<S, T>[]
  getId: (item: T) => string
  renderCard: (item: T, drag: CardDrag) => React.ReactNode
  /** A card was dropped on another column (wide screens). */
  onDrop?: (itemId: string, to: S) => void
  /** The status shown on a phone; null = the first status that has cards. */
  value?: S | null
  onValueChange?: (status: S) => void
  emptyText: string
  dropHereText: string
  loading?: boolean
  /** Take the remaining height; columns scroll on their own (wide screens). */
  fill?: boolean
}) {
  const wide = useMediaQuery(WIDE_SCREEN)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<S | null>(null)
  const [localValue, setLocalValue] = useState<S | null>(null)

  const countOf = (c: BoardColumn<S, T>) => c.count ?? c.items.length
  const chosen = value !== undefined ? value : localValue
  const current = columns.find((c) => c.id === chosen) ?? columns.find((c) => countOf(c) > 0) ?? columns[0]
  const choose = (id: S) => { setLocalValue(id); onValueChange?.(id) }

  const skeleton = (
    <div aria-busy="true" className="space-y-2">{[1, 2].map((n) => <div key={n} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
  )

  if (!wide) {
    return (
      <div className="space-y-3">
        <SegmentedTabs label={label} value={current.id} onChange={choose}
          tabs={columns.map((c) => ({
            id: c.id,
            label: <>
              <span aria-hidden="true" className={cn('size-2 rounded-full', c.dot)} />
              {c.label}
              <span className="min-w-5 px-1.5 rounded-full bg-background/80 border border-border text-xs tabular-nums">{countOf(c)}</span>
            </>,
          }))} />
        <div role="tabpanel" aria-label={current.label} className="space-y-2">
          {loading ? skeleton : current.items.length === 0 ? (
            <p className="py-10 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : current.items.map((item) => <div key={getId(item)}>{renderCard(item, NO_DRAG)}</div>)}
          {!loading && current.footer}
        </div>
      </div>
    )
  }

  const drop = (to: S) => {
    if (draggingId) onDrop?.(draggingId, to)
    setDraggingId(null)
    setOverCol(null)
  }

  return (
    <div className={cn('overflow-x-auto pb-2', fill && 'flex-1 min-h-0')}>
      <div className={cn('flex gap-4', fill && 'h-full')}>
        {columns.map((c) => {
          const isTarget = overCol === c.id
          return (
            <section
              key={c.id}
              aria-label={c.label}
              onDragOver={(e) => { e.preventDefault(); setOverCol(c.id) }}
              onDragLeave={(e) => {
                // Only clear when leaving the column entirely, not its children
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null)
              }}
              onDrop={() => drop(c.id)}
              className={cn(
                'flex flex-col w-[17rem] shrink-0 rounded-xl border border-t-4 bg-muted/30 transition-colors',
                c.accent,
                isTarget && cn('ring-2 bg-muted/60', c.ring),
              )}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={cn('size-2 rounded-full', c.dot)} />
                  <h3 className="font-semibold text-sm">{c.label}</h3>
                </div>
                <span className="bg-background text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full border border-border">
                  {countOf(c)}
                </span>
              </div>
              <div className={cn('flex-1 min-h-24 space-y-2 px-2 pb-2', fill && 'overflow-y-auto')}>
                {loading ? skeleton : c.items.length === 0 ? (
                  <div className={cn(
                    'flex items-center justify-center h-24 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors',
                    isTarget && 'border-primary/50 text-foreground',
                  )}>
                    {isTarget ? dropHereText : emptyText}
                  </div>
                ) : c.items.map((item) => {
                  const id = getId(item)
                  return (
                    <div key={id}>
                      {renderCard(item, {
                        draggable: Boolean(onDrop),
                        dragging: draggingId === id,
                        onDragStart: () => setDraggingId(id),
                        onDragEnd: () => { setDraggingId(null); setOverCol(null) },
                      })}
                    </div>
                  )
                })}
                {!loading && c.footer}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
