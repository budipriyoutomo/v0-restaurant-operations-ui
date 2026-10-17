'use client'

// List filters as dropdowns: a row of compact buttons that fits a phone,
// instead of rows of chips. The button says what is filtered ("Priority: High")
// and is tinted while a filter is on.
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ALL = '__all__'

// h-10 on phones (thumb target), h-9 from sm up
const trigger = 'inline-flex items-center gap-1.5 h-10 sm:h-9 px-3 rounded-full border text-sm font-medium transition-colors whitespace-nowrap max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
const triggerOff = 'border-border bg-card text-foreground hover:bg-muted/50'
const triggerOn = 'border-primary bg-primary/10 text-primary'
const item = 'min-h-10 gap-2 rounded-lg'

export interface FilterOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

/** Pick one value; with `allLabel`, null means "no filter". */
export function FilterSelect<T extends string>({ label, value, options, onChange, allLabel, className }: {
  label: string
  value: T | null
  options: FilterOption<T>[]
  onChange: (value: T | null) => void
  allLabel?: string
  className?: string
}) {
  label = label.replace(/:\s*$/, '')   // i18n filter labels end in ":"
  const current = options.find((o) => o.value === value)
  const active = Boolean(allLabel && current)
  const shown = current?.label ?? allLabel ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`${label}: ${shown}`} data-active={active}
          className={cn(trigger, active ? triggerOn : triggerOff, className)}>
          <span className={cn('flex-shrink-0', !active && 'text-muted-foreground')}>{label}:</span>
          <span className="truncate">{shown}</span>
          <ChevronDown className="size-3.5 flex-shrink-0 opacity-60" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48 max-h-80 overflow-y-auto rounded-xl">
        <DropdownMenuRadioGroup value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : (v as T))}>
          {allLabel && (
            <>
              <DropdownMenuRadioItem value={ALL} className={item}>{allLabel}</DropdownMenuRadioItem>
              <DropdownMenuSeparator />
            </>
          )}
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className={item}>
              {o.icon}
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Yes/no filters ("Hide finished") grouped in one menu; the button counts those that are on. */
export function FilterOptions({ label, items, className }: {
  label: string
  items: { label: string; checked: boolean; onChange: (checked: boolean) => void }[]
  className?: string
}) {
  const on = items.filter((i) => i.checked).length
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={on ? `${label} (${on})` : label} data-active={on > 0}
          className={cn(trigger, on ? triggerOn : triggerOff, className)}>
          <SlidersHorizontal className="size-4 flex-shrink-0" aria-hidden="true" />
          {label}
          {on > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs leading-5 text-center">{on}</span>}
          <ChevronDown className="size-3.5 flex-shrink-0 opacity-60" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56 rounded-xl">
        {items.map((i) => (
          // Stays open: several options are often set together.
          <DropdownMenuCheckboxItem key={i.label} checked={i.checked} className={item}
            onCheckedChange={(c) => i.onChange(c === true)} onSelect={(e) => e.preventDefault()}>
            {i.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** One wrapping row for the search box and the filter buttons. */
export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
}
