'use client'

// Page tabs as one segmented control (Todo-UI 0.1): a real tablist (arrow keys,
// one Tab stop), scrolls sideways on a phone instead of wrapping.
import { useRef } from 'react'
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

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : step ? (index + step + tabs.length) % tabs.length : -1
    if (next < 0) return
    e.preventDefault()
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div className={cn('overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0', className)}>
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
  )
}
