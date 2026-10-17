'use client'

// none / view / manage for one module (Todo-UI #6): a segmented radio group,
// so screen readers hear which level is set, and 32px targets instead of 24px.
import { cn } from '@/lib/utils'
import type { AccessLevel } from '@/lib/types'

const LEVELS: AccessLevel[] = ['none', 'view', 'manage']

export function AccessLevelPicker({ label, value, manageable, onChange, labels }: {
  label: string
  value: AccessLevel
  manageable: boolean
  onChange: (level: AccessLevel) => void
  labels: Record<AccessLevel, string>
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-0.5 p-0.5 rounded-lg bg-muted flex-shrink-0">
      {LEVELS.map((l) => {
        const checked = value === l
        const disabled = l === 'manage' && !manageable
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(l)}
            className={cn(
              'h-9 px-3 rounded-lg text-xs font-medium transition-colors',
              checked
                ? l === 'none' ? 'bg-background text-foreground shadow-sm' : l === 'view' ? 'bg-background text-primary shadow-sm' : 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
              disabled && 'opacity-30 cursor-not-allowed hover:text-muted-foreground',
            )}
          >
            {labels[l]}
          </button>
        )
      })}
    </div>
  )
}
