'use client'

import { TrendingDown, Zap, Clock, CheckCircle, AlertTriangle, DollarSign, Activity, AlertCircle } from 'lucide-react'

const kpis = [
  { label: 'MTTR', value: '3.2h', icon: Clock, trend: '-0.6h', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { label: 'MTBF', value: '168h', icon: TrendingDown, trend: '+12h', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { label: 'Active Downtime', value: '12.7h', icon: Zap, trend: '-2.1h', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  { label: 'PM Compliance', value: '94%', icon: CheckCircle, trend: '+3%', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { label: 'Critical Breakdowns', value: '3', icon: AlertTriangle, trend: '-1', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { label: 'Maintenance Cost', value: 'RM8.5k', icon: DollarSign, trend: '+RM1.2k', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { label: 'Asset Health', value: '68%', icon: Activity, trend: '-4%', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  { label: 'Overdue WO', value: '2', icon: AlertCircle, trend: '+1', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
]

export function EngineeringKPIBar() {
  return (
    <div className="px-5 py-3 border-b border-border bg-background/50 backdrop-blur-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className={`${kpi.color} px-3 py-2 rounded-lg flex flex-col gap-1 transition-all hover:shadow-md`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="size-3.5" />
                <span className="text-[10px] font-semibold text-current opacity-75">{kpi.label}</span>
              </div>
              <p className="text-sm font-bold text-current">{kpi.value}</p>
              <p className="text-[10px] text-current opacity-60">{kpi.trend}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
