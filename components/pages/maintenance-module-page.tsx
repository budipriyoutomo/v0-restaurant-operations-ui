'use client'

import { useState } from 'react'
import { Search, Filter, Plus, AlertCircle, Wrench, Calendar, User, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkOrder {
  id: string
  number: string
  title: string
  equipment: string
  location: string
  issue: string
  issueId: string
  type: 'preventive' | 'corrective'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'assigned' | 'in-progress' | 'waiting' | 'completed'
  assignee: string
  outlet: string
  createdDate: string
  dueDate: string
  estimatedHours: number
}

const mockWorkOrders: WorkOrder[] = [
  {
    id: 'wo-1',
    number: 'WO-0041',
    title: 'Kitchen AC Compressor Replacement',
    equipment: 'Air Conditioning Unit',
    location: 'Kitchen Area',
    issue: 'AC system breakdown - unit not functioning',
    issueId: 'ISS-2026-00145',
    type: 'corrective',
    priority: 'critical',
    status: 'in-progress',
    assignee: 'Ahmad Razif',
    outlet: 'KL Central',
    createdDate: '2026-06-03',
    dueDate: '2026-06-04',
    estimatedHours: 8
  },
  {
    id: 'wo-2',
    number: 'WO-0042',
    title: 'POS System Network Cable Replacement',
    equipment: 'Network Infrastructure',
    location: 'POS Area',
    issue: 'Intermittent network connectivity issues',
    issueId: 'ISS-2026-00142',
    type: 'corrective',
    priority: 'critical',
    status: 'assigned',
    assignee: 'Raj Kumar',
    outlet: 'KLCC',
    createdDate: '2026-06-03',
    dueDate: '2026-06-04',
    estimatedHours: 4
  },
  {
    id: 'wo-3',
    number: 'WO-0040',
    title: 'Monthly HVAC System Preventive Maintenance',
    equipment: 'HVAC System',
    location: 'Server Room',
    issue: 'Regular scheduled maintenance',
    issueId: 'ISS-2026-00140',
    type: 'preventive',
    priority: 'medium',
    status: 'waiting',
    assignee: 'Lee Chong Wei',
    outlet: 'Bangsar',
    createdDate: '2026-06-01',
    dueDate: '2026-06-10',
    estimatedHours: 3
  },
  {
    id: 'wo-4',
    number: 'WO-0039',
    title: 'Cold Storage Temperature Control Check',
    equipment: 'Cold Storage Unit',
    location: 'Food Storage',
    issue: 'Temperature deviation during audit',
    issueId: 'ISS-2026-00138',
    type: 'corrective',
    priority: 'high',
    status: 'open',
    assignee: 'Unassigned',
    outlet: 'Subang',
    createdDate: '2026-06-02',
    dueDate: '2026-06-05',
    estimatedHours: 2
  },
]

const columns = [
  { id: 'open', label: 'Open', color: 'border-blue-200 bg-blue-50' },
  { id: 'assigned', label: 'Assigned', color: 'border-purple-200 bg-purple-50' },
  { id: 'in-progress', label: 'In Progress', color: 'border-amber-200 bg-amber-50' },
  { id: 'waiting', label: 'Waiting', color: 'border-cyan-200 bg-cyan-50' },
  { id: 'completed', label: 'Completed', color: 'border-green-200 bg-green-50' },
]

export function MaintenanceModulePage() {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [workOrders] = useState<WorkOrder[]>(mockWorkOrders)

  const filteredOrders = workOrders.filter((wo) => {
    const matchesSearch = wo.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.outlet.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = !filterPriority || wo.priority === filterPriority
    const matchesType = !filterType || wo.type === filterType
    return matchesSearch && matchesPriority && matchesType
  })

  const ordersByStatus = columns.map((col) => ({
    ...col,
    orders: filteredOrders.filter((wo) => wo.status === col.id),
    count: filteredOrders.filter((wo) => wo.status === col.id).length,
  }))

  const stats = {
    total: workOrders.length,
    overdue: workOrders.filter(w => new Date(w.dueDate) < new Date() && w.status !== 'completed').length,
    critical: workOrders.filter(w => w.priority === 'critical').length,
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Module</h1>
          <p className="text-sm text-muted-foreground mt-1">Work orders, preventive maintenance, and equipment management linked to Issues</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="size-4" /> New Work Order
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Work Orders</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Critical</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Overdue</p>
          <p className="text-2xl font-bold text-amber-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search work orders by number, title, outlet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors font-medium text-sm">
            <Filter className="size-4" />
            Filter
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 items-center">
            <span className="text-xs font-medium text-muted-foreground">Type:</span>
            {['preventive', 'corrective'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? null : t)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors capitalize',
                  filterType === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {ordersByStatus.map((column) => (
          <div key={column.id} className="flex flex-col min-w-80 sm:min-w-64">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <h3 className="font-semibold text-sm">{column.label}</h3>
              <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded-full">
                {column.count}
              </span>
            </div>

            {/* Column Content */}
            <div className={cn(
              'flex-1 space-y-2 p-3 rounded-lg border-2 min-h-96',
              column.color
            )}>
              {column.orders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xs text-muted-foreground">No work orders</p>
                </div>
              ) : (
                column.orders.map((wo) => (
                  <WorkOrderCard
                    key={wo.id}
                    workOrder={wo}
                    isSelected={selectedWorkOrder?.id === wo.id}
                    onSelect={() => setSelectedWorkOrder(wo)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      {selectedWorkOrder && (
        <div className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg p-6 overflow-y-auto space-y-5 z-40">
          <button
            onClick={() => setSelectedWorkOrder(null)}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>

          {/* Header */}
          <div className="pt-4">
            <p className="font-mono text-xs text-primary font-bold mb-1">{selectedWorkOrder.number}</p>
            <h2 className="font-bold text-lg leading-snug">{selectedWorkOrder.title}</h2>
          </div>

          {/* Status & Type */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <span className={cn(
                'text-xs font-semibold px-2 py-1 rounded-full',
                selectedWorkOrder.status === 'open' ? 'bg-blue-100 text-blue-700' :
                selectedWorkOrder.status === 'assigned' ? 'bg-purple-100 text-purple-700' :
                selectedWorkOrder.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                selectedWorkOrder.status === 'waiting' ? 'bg-cyan-100 text-cyan-700' :
                'bg-green-100 text-green-700'
              )}>
                {selectedWorkOrder.status.charAt(0).toUpperCase() + selectedWorkOrder.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Type</span>
              <span className={cn(
                'text-xs font-semibold px-2 py-1 rounded-full',
                selectedWorkOrder.type === 'preventive'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              )}>
                {selectedWorkOrder.type.charAt(0).toUpperCase() + selectedWorkOrder.type.slice(1)}
              </span>
            </div>
          </div>

          {/* Equipment & Location */}
          <div className="space-y-2 border-t border-border pt-4 text-xs">
            <div>
              <p className="text-muted-foreground font-medium mb-1">Equipment</p>
              <p className="text-foreground font-semibold">{selectedWorkOrder.equipment}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-1">Location</p>
              <p className="text-foreground font-semibold">{selectedWorkOrder.location}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-1">Issue Description</p>
              <p className="text-foreground">{selectedWorkOrder.issue}</p>
            </div>
          </div>

          {/* Linked Issue */}
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs">
            <p className="text-blue-700 font-medium">Linked to Issue</p>
            <p className="text-blue-700 font-mono font-bold mt-1">{selectedWorkOrder.issueId}</p>
          </div>

          {/* Assignment & Timeline */}
          <div className="space-y-2 border-t border-border pt-4 text-xs">
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              <span className="text-foreground font-semibold">{selectedWorkOrder.assignee}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Due: {selectedWorkOrder.dueDate}</p>
                <p className="text-muted-foreground">Est. {selectedWorkOrder.estimatedHours}h</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <button className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
              Update Status
            </button>
            <button className="w-full px-3 py-2 rounded-md border border-border text-muted-foreground text-xs font-semibold hover:bg-muted/50 transition-colors">
              Close Work Order
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function WorkOrderCard({ workOrder, isSelected, onSelect }: { workOrder: WorkOrder; isSelected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'p-3 rounded-md border cursor-move transition-all',
        isSelected
          ? 'bg-white border-primary shadow-md'
          : 'bg-white border-border hover:shadow-sm'
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <Wrench className={cn(
          'size-4 mt-0.5 flex-shrink-0',
          workOrder.priority === 'critical' ? 'text-red-600' : 'text-blue-600'
        )} />
        <h4 className="font-medium text-xs line-clamp-2 flex-1">{workOrder.title}</h4>
      </div>

      <p className="text-[10px] text-muted-foreground mb-2">{workOrder.equipment}</p>

      <div className="space-y-1 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-primary font-semibold">{workOrder.number}</span>
          <span className={cn(
            'px-1.5 py-0.5 rounded font-semibold',
            workOrder.priority === 'critical' ? 'bg-red-100 text-red-700' :
            workOrder.priority === 'high' ? 'bg-orange-100 text-orange-700' :
            'bg-green-100 text-green-700'
          )}>
            {workOrder.priority}
          </span>
        </div>
        <div className="text-muted-foreground">
          {workOrder.assignee}
        </div>
      </div>
    </div>
  )
}
