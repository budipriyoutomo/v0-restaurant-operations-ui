'use client'

import { useState } from 'react'
import { Search, Filter, Calendar, User, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { Task, TaskStatus } from '@/lib/types'

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'open', label: 'Open', color: 'border-blue-200 bg-blue-50' },
  { id: 'assigned', label: 'Assigned', color: 'border-purple-200 bg-purple-50' },
  { id: 'in-progress', label: 'In Progress', color: 'border-amber-200 bg-amber-50' },
  { id: 'waiting', label: 'Waiting', color: 'border-cyan-200 bg-cyan-50' },
  { id: 'resolved', label: 'Resolved', color: 'border-green-200 bg-green-50' },
  { id: 'closed', label: 'Closed', color: 'border-gray-200 bg-gray-50' },
]

export function TaskCenterPage() {
  const { tasks, updateTaskStatus } = useIssueStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string | null>(null)

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.issueNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      {/* Header — no "New Task" button: all tasks here originate from Issues */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Kanban view - Tasks auto-generated from Issues</p>
        </div>
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
              filterPriority === p ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
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
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <h3 className="font-semibold text-sm">{column.label}</h3>
              <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded-full">
                {column.count}
              </span>
            </div>

            <div className={cn('flex-1 space-y-2 p-3 rounded-lg border-2 min-h-96', column.color)}>
              {column.tasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xs text-muted-foreground">No tasks</p>
                </div>
              ) : (
                column.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} columns={columns} onMove={updateTaskStatus} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  columns,
  onMove,
}: {
  task: Task
  columns: { id: TaskStatus; label: string }[]
  onMove: (taskId: string, status: TaskStatus) => void
}) {
  return (
    <div className="p-3 rounded-md bg-white border border-border hover:shadow-md transition-shadow group">
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
          <span className="font-mono text-primary font-semibold">{task.issueNumber}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <User className="size-3" />
          {task.assignee}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="size-3" />
          {task.dueDate ?? '—'}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground truncate">{task.outlet}</span>
        <select
          value={task.status}
          onChange={(e) => onMove(task.id, e.target.value as TaskStatus)}
          className="text-[10px] border border-border rounded px-1 py-0.5 bg-background focus:outline-none"
        >
          {columns.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
