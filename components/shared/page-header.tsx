// Shared page chrome so every page starts the same way: title, one line of
// explanation, the main action on the right. Filters: shared/filter-menu.tsx.
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
