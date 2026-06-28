'use client'

import { Download, FileText, CheckSquare, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { ApprovalRequest, Issue, Task } from '@/lib/types'

// ── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCell(value: string | null | undefined): string {
  const s = value == null ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

function buildCSV(headers: string[], rows: string[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCell).join(','))
    .join('\n')
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Export functions ─────────────────────────────────────────────────────────

function exportIssues(issues: Issue[]) {
  const headers = ['Number', 'Title', 'Outlet', 'Category', 'Priority', 'Status', 'Assignee', 'Due Date', 'Created Date', 'SLA Breach', 'Task Count', 'Has Approval']
  const rows = issues.map((i) => [
    i.number, i.title, i.outlet, i.category, i.priority, i.status,
    i.assignee, i.dueDate ?? '', i.createdDate,
    i.slaBreach ? 'Yes' : 'No',
    String(i.taskIds.length),
    i.approvalId ? 'Yes' : 'No',
  ])
  downloadCSV(buildCSV(headers, rows), `issues_${todayString()}.csv`)
}

function exportTasks(tasks: Task[]) {
  const headers = ['Number', 'Title', 'Issue Number', 'Outlet', 'Priority', 'Status', 'Assignee', 'Due Date', 'Description']
  const rows = tasks.map((t) => [
    t.number, t.title, t.issueNumber, t.outlet, t.priority,
    t.status, t.assignee, t.dueDate ?? '', t.description,
  ])
  downloadCSV(buildCSV(headers, rows), `tasks_${todayString()}.csv`)
}

function exportApprovals(approvals: ApprovalRequest[]) {
  const headers = ['Number', 'Title', 'Type', 'Requester', 'Outlet', 'Amount', 'Status', 'Requested Date', 'Issue Number']
  const rows = approvals.map((a) => [
    a.number, a.title, a.type, a.requester, a.outlet,
    a.amount ?? '', a.status, a.requestedDate ?? '', a.issueNumber,
  ])
  downloadCSV(buildCSV(headers, rows), `approvals_${todayString()}.csv`)
}

// ── Component ────────────────────────────────────────────────────────────────

interface ReportCardProps {
  icon: React.ReactNode
  title: string
  description: string
  count: number
  label: string
  onExport: () => void
}

function ReportCard({ icon, title, description, count, label, onExport }: ReportCardProps) {
  const handleExport = () => {
    if (count === 0) {
      toast.error(`No ${label} to export.`)
      return
    }
    onExport()
    toast.success(`Exported ${count} ${label} to CSV.`)
  }

  return (
    <div className="p-6 rounded-lg border border-border bg-muted/20 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <span className="text-2xl font-bold text-foreground flex-shrink-0">{count}</span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">{count} record{count !== 1 ? 's' : ''} available</span>
        <button
          onClick={handleExport}
          disabled={count === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="size-3.5" />
          Export CSV
        </button>
      </div>
    </div>
  )
}

export function ReportsPage() {
  const { issues, tasks, approvals } = useIssueStore()

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Export operational data as CSV files</p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
        <FileText className="size-4 mt-0.5 flex-shrink-0 text-primary" />
        <p>
          All exports are generated from live data and include a UTF-8 BOM for compatibility with Microsoft Excel.
          Dates are in <span className="font-mono text-foreground">YYYY-MM-DD</span> format.
        </p>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ReportCard
          icon={<FileText className="size-5" />}
          title="Issues"
          description="All operational issues with status, priority, outlet, category, and linked records"
          count={issues.length}
          label="issues"
          onExport={() => exportIssues(issues)}
        />
        <ReportCard
          icon={<CheckSquare className="size-5" />}
          title="Tasks"
          description="All tasks auto-generated from issues with assignee, priority, and status"
          count={tasks.length}
          label="tasks"
          onExport={() => exportTasks(tasks)}
        />
        <ReportCard
          icon={<CheckCircle2 className="size-5" />}
          title="Approvals"
          description="All approval requests with type, requester, amount, and decision status"
          count={approvals.length}
          label="approvals"
          onExport={() => exportApprovals(approvals)}
        />
      </div>

      {/* Column reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Issues CSV columns',
            columns: ['Number', 'Title', 'Outlet', 'Category', 'Priority', 'Status', 'Assignee', 'Due Date', 'Created Date', 'SLA Breach', 'Task Count', 'Has Approval'],
          },
          {
            title: 'Tasks CSV columns',
            columns: ['Number', 'Title', 'Issue Number', 'Outlet', 'Priority', 'Status', 'Assignee', 'Due Date', 'Description'],
          },
          {
            title: 'Approvals CSV columns',
            columns: ['Number', 'Title', 'Type', 'Requester', 'Outlet', 'Amount', 'Status', 'Requested Date', 'Issue Number'],
          },
        ].map(({ title, columns }) => (
          <div key={title} className="p-4 rounded-lg border border-border bg-background">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
            <div className="flex flex-wrap gap-1.5">
              {columns.map((col) => (
                <span key={col} className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{col}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
