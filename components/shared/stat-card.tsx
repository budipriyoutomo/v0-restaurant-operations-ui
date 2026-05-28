import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: { value: string; positive: boolean }
  variant?: 'default' | 'success' | 'warning' | 'critical' | 'primary'
  className?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', className }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow',
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
          <p className={cn(
            'text-2xl font-bold mt-1 leading-none',
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
            'size-8 rounded-lg flex items-center justify-center flex-shrink-0',
            variant === 'success' ? 'bg-success/10 text-success' :
            variant === 'warning' ? 'bg-warning/10 text-warning' :
            variant === 'critical' ? 'bg-destructive/10 text-destructive' :
            variant === 'primary' ? 'bg-primary/10 text-primary' :
            'bg-muted text-muted-foreground'
          )}>
            <Icon className="size-4" />
          </div>
        )}
      </div>
    </div>
  )
}
