'use client'

import { useState } from 'react'
import { Search, Filter, Plus, Clock, Flame, Droplet, Wind, Monitor, Snowflake, Lightbulb, AlertCircle, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { EngineeringKPIBar } from '@/components/shared/engineering-kpi-bar'
import { WorkOrderStatusBadge, RecurringIssueBadge, CriticalEquipmentBadge, DowntimeRiskBadge, SLARiskBadge, WaitingSparePartBadge, WorkOrderTypeBadge, HealthScoreBadge } from '@/components/shared/work-order-badges'
import { CreateTicketDialog } from '@/components/dialogs/create-ticket-dialog'
import { tickets, equipmentTypes } from '@/lib/data'
import { cn } from '@/lib/utils'

const workOrderColumns = [
  { id: 'open', label: 'Open', color: 'bg-blue-500' },
  { id: 'assigned', label: 'Assigned', color: 'bg-purple-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-warning' },
  { id: 'waiting_sparepart', label: 'Waiting Sparepart', color: 'bg-amber-500' },
  { id: 'testing', label: 'Testing', color: 'bg-indigo-500' },
  { id: 'completed', label: 'Completed', color: 'bg-success' },
]

const iconMap: Record<string, typeof Flame> = {
  Flame, Droplet, Wind, Monitor, Snowflake, Lightbulb
}

export function TicketsPage() {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<typeof tickets[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const filtered = tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.outlet.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getEquipmentIcon = (assetId: string) => {
    const equip = equipmentTypes[assetId as keyof typeof equipmentTypes]
    if (!equip) return Flame
    return iconMap[equip.icon as keyof typeof iconMap] || Flame
  }

  const getWorkOrderBadges = (wo: typeof tickets[0]) => {
    const badges = []
    if (wo.workOrderType === 'Corrective' && equipmentTypes[wo.assetId as keyof typeof equipmentTypes]?.recurring) {
      badges.push('recurring')
    }
    if (wo.priority === 'critical') {
      badges.push('critical')
    }
    if (wo.downtimeStart) {
      badges.push('downtime')
    }
    if (wo.status === 'waiting_sparepart') {
      badges.push('sparepart')
    }
    if (wo.slaRiskLevel === 'critical' || wo.slaRiskLevel === 'warning') {
      badges.push('sla')
    }
    return badges
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Engineering KPI Bar */}
      <EngineeringKPIBar />

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-border bg-background flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="relative flex-1 max-w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search work orders..."
              className="w-full pl-8 pr-3 h-7 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors">
            <Filter className="size-3" /> Filter
          </button>
        </div>
        <button 
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 h-7 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" /> New Work Order
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Kanban Board */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex gap-4 h-full">
            {workOrderColumns.map((col) => {
              const colWorkOrders = filtered.filter((t) => t.status === col.id)
              return (
                <div key={col.id} className="w-96 flex-shrink-0 flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('size-2 rounded-full', col.color)} />
                    <span className="text-xs font-semibold">{col.label}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{colWorkOrders.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colWorkOrders.map((wo) => {
                      const equip = equipmentTypes[wo.assetId as keyof typeof equipmentTypes]
                      const EquipIcon = getEquipmentIcon(wo.assetId)
                      const badges = getWorkOrderBadges(wo)

                      return (
                        <button
                          key={wo.id}
                          onClick={() => setSelectedWorkOrder(selectedWorkOrder?.id === wo.id ? null : wo)}
                          className={cn(
                            'w-full text-left p-3 rounded-lg border bg-card shadow-sm hover:shadow-md transition-all space-y-2',
                            selectedWorkOrder?.id === wo.id ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                          )}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn('p-1.5 rounded-md', wo.priority === 'critical' ? 'bg-destructive/15' : 'bg-muted')}>
                                <EquipIcon className={cn('size-3.5', wo.priority === 'critical' ? 'text-destructive' : 'text-muted-foreground')} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-mono text-muted-foreground font-semibold">{wo.id}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{equip?.name}</p>
                              </div>
                            </div>
                            {equip && (
                              <HealthScoreBadge score={equip.healthScore} />
                            )}
                          </div>

                          {/* Title */}
                          <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{wo.title}</p>

                          {/* Badges */}
                          <div className="flex flex-wrap gap-1">
                            <WorkOrderTypeBadge type={wo.workOrderType} />
                            {badges.includes('recurring') && <RecurringIssueBadge />}
                            {badges.includes('downtime') && <DowntimeRiskBadge />}
                            {badges.includes('sparepart') && <WaitingSparePartBadge />}
                            {badges.includes('sla') && <SLARiskBadge />}
                          </div>

                          {/* Location & Downtime */}
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                            <span>{wo.outlet}</span>
                            {wo.downtimeStart && equip && (
                              <span className="flex items-center gap-1 text-destructive font-semibold">
                                <Clock className="size-2.5" /> {equip.downtime}
                              </span>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <div className="size-5 rounded-full bg-muted text-[9px] font-bold flex items-center justify-center">
                                {wo.assignee === 'Unassigned' ? '?' : wo.assignee.split(' ').map(w => w[0]).join('').slice(0, 2)}
                              </div>
                              <span className="text-muted-foreground max-w-20 truncate">{wo.assignee === 'Unassigned' ? 'Unassigned' : wo.assignee.split(' ')[0]}</span>
                            </div>
                            <span className={cn('text-[11px] font-semibold', wo.slaHours <= 2 ? 'text-destructive' : wo.slaHours <= 4 ? 'text-warning' : 'text-muted-foreground')}>
                              {wo.slaHours}h SLA
                            </span>
                          </div>
                        </button>
                      )
                    })}
                    {colWorkOrders.length === 0 && (
                      <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                        No work orders
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Work Order Detail Panel */}
        {selectedWorkOrder && (
          <div className="w-96 border-l border-border bg-card flex-shrink-0 overflow-y-auto p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] font-mono text-muted-foreground font-semibold">{selectedWorkOrder.id}</p>
                <h3 className="text-sm font-semibold mt-1 leading-snug">{selectedWorkOrder.title}</h3>
              </div>
              <button onClick={() => setSelectedWorkOrder(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none ml-2">×</button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status & Priority */}
              <div className="flex flex-col gap-2 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <WorkOrderStatusBadge status={selectedWorkOrder.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <span className={cn(
                    'font-semibold px-2 py-1 rounded text-[10px]',
                    selectedWorkOrder.priority === 'critical' && 'bg-destructive/15 text-destructive',
                    selectedWorkOrder.priority === 'high' && 'bg-orange-500/15 text-orange-600',
                    selectedWorkOrder.priority === 'medium' && 'bg-warning/15 text-warning',
                    selectedWorkOrder.priority === 'low' && 'bg-muted text-muted-foreground',
                  )}>
                    {selectedWorkOrder.priority.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Asset Information */}
              {equipmentTypes[selectedWorkOrder.assetId as keyof typeof equipmentTypes] && (
                <div className="pb-3 border-b border-border">
                  <p className="font-semibold mb-2">Asset Information</p>
                  <div className="space-y-1.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Asset ID</span>
                      <span className="font-mono">{selectedWorkOrder.assetId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Equipment</span>
                      <span className="text-foreground font-medium">{equipmentTypes[selectedWorkOrder.assetId as keyof typeof equipmentTypes]?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Category</span>
                      <span className="text-foreground">{equipmentTypes[selectedWorkOrder.assetId as keyof typeof equipmentTypes]?.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Health Score</span>
                      <HealthScoreBadge score={equipmentTypes[selectedWorkOrder.assetId as keyof typeof equipmentTypes]?.healthScore || 0} />
                    </div>
                  </div>
                </div>
              )}

              {/* Work Order Details */}
              <div className="pb-3 border-b border-border">
                <p className="font-semibold mb-2">Work Order Details</p>
                <div className="space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Type</span>
                    <WorkOrderTypeBadge type={selectedWorkOrder.workOrderType} />
                  </div>
                  <div className="flex justify-between">
                    <span>Outlet</span>
                    <span className="text-foreground font-medium">{selectedWorkOrder.outlet}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span className="text-foreground font-mono">{selectedWorkOrder.createdAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SLA Remaining</span>
                    <span className={cn(
                      'font-semibold',
                      selectedWorkOrder.slaHours <= 2 ? 'text-destructive' : selectedWorkOrder.slaHours <= 4 ? 'text-warning' : 'text-success'
                    )}>
                      {selectedWorkOrder.slaHours}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Downtime Information */}
              {selectedWorkOrder.downtimeStart && (
                <div className="pb-3 border-b border-border">
                  <p className="font-semibold mb-2">Downtime Information</p>
                  <div className="space-y-1.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Downtime Start</span>
                      <span className="text-foreground font-mono">{selectedWorkOrder.downtimeStart}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration</span>
                      <span className="text-foreground font-medium">{equipmentTypes[selectedWorkOrder.assetId as keyof typeof equipmentTypes]?.downtime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Business Impact</span>
                      <span className="text-foreground text-right max-w-32">{selectedWorkOrder.businessImpact}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Technician Assignment */}
              <div className="pb-3 border-b border-border">
                <p className="font-semibold mb-2">Technician Assignment</p>
                <div className="space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Assigned To</span>
                    <span className="text-foreground font-medium">{selectedWorkOrder.assignee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ETA</span>
                    <span className="text-foreground font-mono">{selectedWorkOrder.technicianETA}</span>
                  </div>
                </div>
              </div>

              {/* Maintenance Checklist */}
              <div className="pb-3 border-b border-border">
                <p className="font-semibold mb-2">Maintenance Checklist</p>
                <div className="space-y-1.5">
                  {selectedWorkOrder.checklist.map((item, i) => (
                    <label key={i} className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        defaultChecked={item.completed}
                        className="mt-1 size-3 rounded border border-border cursor-pointer"
                      />
                      <span className={cn('text-xs leading-relaxed', item.completed ? 'text-muted-foreground line-through' : 'text-foreground')}>
                        {item.item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Spare Parts */}
              {selectedWorkOrder.spareParts.length > 0 && (
                <div className="pb-3 border-b border-border">
                  <p className="font-semibold mb-2">Spare Parts Used</p>
                  <div className="space-y-1.5">
                    {selectedWorkOrder.spareParts.map((part, i) => (
                      <div key={i} className="p-2 rounded-md bg-muted/40 space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="text-foreground font-medium text-[10px]">{part.part}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground capitalize font-semibold">
                            {part.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{part.vendor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Engineering Timeline */}
              <div className="pb-3 border-b border-border">
                <p className="font-semibold mb-2">Engineering Timeline</p>
                <div className="space-y-2">
                  {selectedWorkOrder.timeline.map((event, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <div className="size-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                        {i < selectedWorkOrder.timeline.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
                      </div>
                      <div className="pb-2">
                        <p className="text-[10px] font-mono text-muted-foreground">{event.time}</p>
                        <p className="text-xs font-medium">{event.action}</p>
                        <p className="text-[10px] text-muted-foreground">{event.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="pb-3">
                <p className="font-semibold mb-1.5">Description</p>
                <p className="text-muted-foreground leading-relaxed text-[11px]">{selectedWorkOrder.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Work Order Dialog */}
      <CreateTicketDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSubmit={(data) => {
          console.log('[v0] New work order created:', data)
        }}
      />
    </div>
  )
}
