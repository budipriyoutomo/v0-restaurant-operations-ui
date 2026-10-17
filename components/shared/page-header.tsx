// Shared page chrome so every page starts the same way: title, one line of
// explanation, the main action on the right; filters as rounded chips.
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({ title, description, actions, className }: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 flex-wrap', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight leading-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

// h-10 on phones (thumb target), compact h-8 from sm up
const chip = 'relative inline-flex items-center gap-1.5 h-10 sm:h-8 px-3 rounded-full border text-[13px] font-medium transition-colors whitespace-nowrap'
const chipOff = 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20'
const chipOn = 'border-primary bg-primary/10 text-primary'

/** A filter that is on or off, e.g. one priority. */
export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn(chip, active ? chipOn : chipOff)}>
      {children}
    </button>
  )
}

/** A yes/no filter: a real checkbox (keyboard, labels) drawn as a chip. */
export function FilterToggle({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode }) {
  return (
    <label className={cn(chip, 'cursor-pointer focus-within:ring-2 focus-within:ring-ring/50', checked ? chipOn : chipOff)}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {checked && <Check className="size-3.5" aria-hidden="true" />}
      {children}
    </label>
  )
}
