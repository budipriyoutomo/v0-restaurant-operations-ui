'use client'

import { AlertCircle, Zap, Clock, AlertTriangle, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RecurringIssueBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[10px] font-semibold">
      <TrendingDown className="size-2.5" /> Recurring
    </span>
  )
}

export function CriticalEquipmentBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-semibold">
      <AlertTriangle className="size-2.5" /> Critical Equip
    </span>
  )
}

export function DowntimeRiskBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/15 text-destructive text-[10px] font-semibold">
      <Zap className="size-2.5" /> Downtime Risk
    </span>
  )
}

export function SLARiskBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-semibold">
      <Clock className="size-2.5" /> SLA Risk
    </span>
  )
}

export function WaitingSparePartBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
      <AlertCircle className="size-2.5" /> Waiting Sparepart
    </span>
  )
}

export function WorkOrderTypeBadge({ type }: { type: 'Corrective' | 'Preventive' }) {
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
      type === 'Corrective' 
        ? 'bg-red-500/15 text-red-600 dark:text-red-400' 
        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
    )}>
      {type}
    </span>
  )
}

export function WorkOrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    open: { label: 'Open', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
    assigned: { label: 'Assigned', className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
    acknowledged: { label: 'Acknowledged', className: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400' },
    in_progress: { label: 'In Progress', className: 'bg-warning/15 text-warning' },
    waiting_sparepart: { label: 'Waiting Sparepart', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    waiting_vendor: { label: 'Waiting Vendor', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    testing: { label: 'Testing', className: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' },
    completed: { label: 'Completed', className: 'bg-success/15 text-success' },
    closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
  }
  const c = config[status] ?? config.open
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold', c.className)}>
      {c.label}
    </span>
  )
}

export function HealthScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold',
      score >= 80 ? 'bg-success/15 text-success' :
      score >= 60 ? 'bg-warning/15 text-warning' :
      'bg-destructive/15 text-destructive'
    )}>
      Health {score}%
    </span>
  )
}
