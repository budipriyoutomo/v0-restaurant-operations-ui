// Empty list or page (Todo-UI 0.4): says what is (not) here and what to do
// next (Todo-Pilot §24). Announced as a status named by its title.
import { isValidElement, useId } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon?: React.ElementType | React.ReactElement   // a component, or an element already sized
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div role="status" aria-labelledby={id}
      className={cn('py-12 px-6 rounded-2xl border border-dashed border-border text-center space-y-3', className)}>
      {Icon && (
        <span className="mx-auto size-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center [&_svg]:size-6" aria-hidden="true">
          {isValidElement(Icon) ? Icon : <Icon />}
        </span>
      )}
      <p id={id} className="font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>}
      {action && <div className="pt-1 flex justify-center">{action}</div>}
    </div>
  )
}
