'use client'

// Page tabs as one segmented control (Todo-UI 0.1): a real tablist (arrow keys,
// one Tab stop), scrolls sideways on a phone instead of wrapping. A faded edge
// shows there are more tabs that way (Todo-Modern-UI Fase 2).
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface SegmentedTab<T extends string> {
  id: T
  label: React.ReactNode
}

export function SegmentedTabs<T extends string>({ label, tabs, value, onChange, className }: {
  label: string
  tabs: readonly SegmentedTab<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const scroller = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState({ start: false, end: false })

  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const start = el.scrollLeft > 1
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setHidden((h) => (h.start === start && h.end === end ? h : { start, end }))
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, tabs.length])

  // Keep the chosen tab in view when it was off screen (not on first render:
  // that would scroll the page).
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current) refs.current[tabs.findIndex((t) => t.id === value)]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    mounted.current = true
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps -- pages rebuild `tabs` every render

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : step ? (index + step + tabs.length) % tabs.length : -1
    if (next < 0) return
    e.preventDefault()
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div className={cn('relative -mx-4 sm:mx-0', className)}>
    <div ref={scroller} onScroll={measure} className="overflow-x-auto px-4 sm:px-0">
      <div role="tablist" aria-label={label} className="inline-flex gap-1 p-1 rounded-xl bg-muted">
        {tabs.map((tab, i) => {
          const selected = tab.id === value
          return (
            <button
              key={tab.id}
              ref={(el) => { refs.current[i] = el }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'h-9 px-4 rounded-lg text-sm font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
    {hidden.start && <div data-fade="start" aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background" />}
    {hidden.end && <div data-fade="end" aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background" />}
    </div>
  )
}
