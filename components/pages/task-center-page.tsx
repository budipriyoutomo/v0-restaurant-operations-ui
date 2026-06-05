'use client'

import { useState } from 'react'
import { Search, Filter, Plus, Calendar, User, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description: string
  status: 'open' | 'assigned' | 'in-progress' | 'waiting' | 'resolved' | 'closed'
  priority: 'critical' | 'high' | 'medium' | 'low'
  assignee: string
  dueDate: string
  outlet: string
  linkedIssue: string
}

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Replace AC compressor unit',
    description: 'Kitchen AC system breakdown repair',
    status: 'in-progress',
    priority: 'critical',
    assignee: 'Ahmad Razif',
    dueDate: '2026-06-04',
    outlet: 'KL Central',
    linkedIssue: 'ISS-2026-00145'
  },
  {
    id: 'task-2',
    title: 'Troubleshoot POS network connectivity',
    description: 'Intermittent POS terminal network issues',
    status: 'assigned',
    priority: 'critical',
    assignee: 'Raj Kumar',
    dueDate: '2026-06-04',
    outlet: 'KLCC',
    linkedIssue: 'ISS-2026-00142'
  },
  {
    id: 'task-3',
    title: 'Audit cold storage temperature logs',
    description: 'Review temperature deviation findings',
    status: 'open',
    priority: 'high',
    assignee: 'Lee Chong Wei',
    dueDate: '2026-06-05',
    outlet: 'Subang',
    linkedIssue: 'ISS-2026-00138'
  },
  {
    id: 'task-4',
    title: 'Prepare training materials',
    description: 'Create training guides for new menu items',
    status: 'assigned',
    priority: 'high',
    assignee: 'Sarah Johnson',
    dueDate: '2026-06-06',
    outlet: 'Bangsar',
    linkedIssue: 'ISS-2026-00135'
  },
  {
    id: 'task-5',
    title: 'Conduct staff training session',
    description: 'Train staff on new menu items',
    status: 'waiting',
    priority: 'high',
    assignee: 'Sarah Johnson',
    dueDate: '2026-06-07',
    outlet: 'Bangsar',
    linkedIssue: 'ISS-2026-00135'
  },
  {
    id: 'task-6',
    title: 'Get management approval for purchase',
    description: 'Obtain approval for equipment purchase',
    status: 'waiting',
    priority: 'medium',
    assignee: 'Priya Sharma',
    dueDate: '2026-06-15',
    outlet: 'KL Central',
    linkedIssue: 'ISS-2026-00132'
  },
]

const columns = [
  { id: 'open', label: 'Open', color: 'border-blue-200 bg-blue-50' },
  { id: 'assigned', label: 'Assigned', color: 'border-purple-200 bg-purple-50' },
  { id: 'in-progress', label: 'In Progress', color: 'border-amber-200 bg-amber-50' },
  { id: 'waiting', label: 'Waiting', color: 'border-cyan-200 bg-cyan-50' },
  { id: 'resolved', label: 'Resolved', color: 'border-green-200 bg-green-50' },
  { id: 'closed', label: 'Closed', color: 'border-gray-200 bg-gray-50' },
]

export function TaskCenterPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [tasks] = useState<Task[]>(mockTasks)

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.linkedIssue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignee.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = !filterPriority || task.priority === filterPriority
    return matchesSearch && matchesPriority
  })

  const tasksByStatus = columns.map((col) => ({
    ...col,
    tasks: filteredTasks.filter((task) => task.status === col.id),
    count: filteredTasks.filter((task) => task.status === col.id).length,
  }))

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Kanban view - Manage task lifecycle from open to closed</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="size-4" /> New Task
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks by title, issue, or assignee..."
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

      {/* Priority Quick Filters */}
      <div className="flex gap-1 items-center">
        <span className="text-xs font-medium text-muted-foreground mr-2">Filter by priority:</span>
        {['critical', 'high', 'medium', 'low'].map((p) => (
          <button
            key={p}
            onClick={() => setFilterPriority(filterPriority === p ? null : p)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors capitalize',
              filterPriority === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {tasksByStatus.map((column) => (
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
              {column.tasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xs text-muted-foreground">No tasks</p>
                </div>
              ) : (
                column.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="p-3 rounded-md bg-white border border-border hover:shadow-md transition-shadow cursor-move group">
      <div className="flex items-start gap-2 mb-2">
        <Flag className={cn(
          'size-3.5 mt-0.5 flex-shrink-0',
          task.priority === 'critical' ? 'text-red-600' :
          task.priority === 'high' ? 'text-orange-600' :
          task.priority === 'medium' ? 'text-amber-600' :
          'text-green-600'
        )} />
        <h4 className="font-medium text-xs line-clamp-2 flex-1">{task.title}</h4>
      </div>

      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{task.description}</p>

      <div className="space-y-2 text-[10px]">
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="font-mono text-primary font-semibold">{task.linkedIssue}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <User className="size-3" />
          {task.assignee}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="size-3" />
          {task.dueDate}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{task.outlet}</span>
        <span className={cn(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize',
          task.priority === 'critical' ? 'bg-red-100 text-red-700' :
          task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
          task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
          'bg-green-100 text-green-700'
        )}>
          {task.priority}
        </span>
      </div>
    </div>
  )
}
