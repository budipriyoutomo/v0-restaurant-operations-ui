import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// The one KPI card (Todo-Modern-UI Fase 1; the dashboard's KPICard merged in).
// Numbers wear text colour; a signal colour only for a state to act on — pass
// it through toneIfAny() so 0 stays neutral. Cards with a drill-down are one button.
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: { value: string; positive: boolean }
  variant?: 'default' | 'success' | 'warning' | 'critical' | 'primary'
  onClick?: () => void
  className?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', onClick, className }: StatCardProps) {
  const body = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
        <p className={cn(
          'text-2xl font-bold mt-1 leading-none tabular-nums',
          variant === 'success' && 'text-success',
          variant === 'warning' && 'text-warning',
          variant === 'critical' && 'text-destructive',
          variant === 'primary' && 'text-primary',
        )}>
          {value}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>}
        {trend && (
          <div className={cn('flex items-center gap-1 mt-1.5 text-xs font-medium', trend.positive ? 'text-success' : 'text-destructive')}>
            <span>{trend.positive ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      {Icon && (
        <div className={cn(
          'size-8 rounded-md flex items-center justify-center flex-shrink-0',
          variant === 'success' ? 'bg-success/10 text-success' :
          variant === 'warning' ? 'bg-warning-mark/10 text-warning' :
          variant === 'critical' ? 'bg-destructive-soft text-destructive' :
          variant === 'primary' ? 'bg-primary/10 text-primary' :
          'bg-muted text-muted-foreground'
        )}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
      )}
    </div>
  )
  const cls = cn('rounded-md border border-border bg-card p-4', className)
  return onClick ? (
    <button type="button" data-kpi onClick={onClick}
      className={cn(cls, 'text-left w-full hover:border-foreground/30 transition-colors')}>{body}</button>
  ) : (
    <div data-kpi className={cls}>{body}</div>
  )
}
