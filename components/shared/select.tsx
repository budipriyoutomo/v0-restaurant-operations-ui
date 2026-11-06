import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// The one select of kanban boards and forms (Todo-Modern-UI Fase 1). A styled
// native <select>: the phone's own picker, keyboard and screen reader for free.
// `className` sizes the wrapper (width, margins).
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <span className={cn('relative inline-flex', className)}>
        <select
          ref={ref}
          {...props}
          className="w-full h-10 appearance-none rounded-md border border-input bg-card pl-3 pr-9 text-sm text-foreground disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      </span>
    )
  },
)
