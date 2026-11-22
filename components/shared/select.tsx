import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// The one select of kanban boards and forms (Todo-Modern-UI Fase 1). A styled
// native <select>: the phone's own picker, keyboard and screen reader for free.
// `className` sizes the wrapper (width, margins); `size="sm"` is the compact
// one for kanban cards and table rows (Fase 4), still thumb-sized on phones.
// The only <select> in the app: select.test.tsx fails on any other.
type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { size?: 'sm' | 'md' }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, children, size = 'md', ...props }, ref) {
    const sm = size === 'sm'
    return (
      <span className={cn('relative inline-flex', className)}>
        <select
          ref={ref}
          {...props}
          className={cn(
            'w-full appearance-none rounded-md border border-input bg-card text-foreground disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
            sm ? 'h-10 sm:h-8 pl-2.5 pr-7 text-xs' : 'h-10 pl-3 pr-9 text-sm',
          )}
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
          sm ? 'right-2 size-3.5' : 'right-3 size-4')} />
      </span>
    )
  },
)
