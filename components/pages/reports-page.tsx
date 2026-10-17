'use client'

import { Download, FileText, CheckSquare, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { ApprovalRequest, Issue, Task } from '@/lib/types'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { PageHeader } from '@/components/shared/page-header'

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

// Column keys: header text = t('reports.col.<key>') in the user's language (Todo-Pilot §16).
type ColKey = 'number' | 'title' | 'outlet' | 'category' | 'priority' | 'status' | 'assignee' | 'dueDate' | 'createdDate'
  | 'slaBreach' | 'taskCount' | 'hasApproval' | 'issueNumber' | 'description' | 'type' | 'requester' | 'amount' | 'requestedDate'
type T = ReturnType<typeof useT>['t']
const ISSUE_COLS: ColKey[] = ['number', 'title', 'outlet', 'category', 'priority', 'status', 'assignee', 'dueDate', 'createdDate', 'slaBreach', 'taskCount', 'hasApproval']
const TASK_COLS: ColKey[] = ['number', 'title', 'issueNumber', 'outlet', 'priority', 'status', 'assignee', 'dueDate', 'description']
const APPROVAL_COLS: ColKey[] = ['number', 'title', 'type', 'requester', 'outlet', 'amount', 'status', 'requestedDate', 'issueNumber']
const headersOf = (cols: ColKey[], t: T) => cols.map((c) => t(`reports.col.${c}`))

function exportIssues(issues: Issue[], t: T) {
  const headers = headersOf(ISSUE_COLS, t)
  const rows = issues.map((i) => [
    i.number, i.title, i.outlet, i.category, i.priority, i.status,
    i.assignee, i.dueDate ?? '', i.createdDate,
    i.slaBreach ? t('reports.yes') : t('reports.no'),
    String(i.taskIds.length),
    i.approvalId ? t('reports.yes') : t('reports.no'),
  ])
  downloadCSV(buildCSV(headers, rows), `issues_${todayString()}.csv`)
}

function exportTasks(tasks: Task[], t: T) {
  const headers = headersOf(TASK_COLS, t)
  const rows = tasks.map((t) => [
    t.number, t.title, t.issueNumber, t.outlet, t.priority,
    t.status, t.assignee, t.dueDate ?? '', t.description,
  ])
  downloadCSV(buildCSV(headers, rows), `tasks_${todayString()}.csv`)
}

function exportApprovals(approvals: ApprovalRequest[], t: T) {
  const headers = headersOf(APPROVAL_COLS, t)
  const rows = approvals.map((a) => [
    a.number, a.title, a.type, a.requester, a.outlet,
    // amount is an INTEGER rupiah value — CSV cells are strings
    String(a.amount ?? ''), a.status, a.requestedDate ?? '', a.issueNumber ?? '',
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
  const { t } = useT()
  const handleExport = () => {
    if (count === 0) {
      toast.error(t('reports.nothing', { label }))
      return
    }
    onExport()
    toast.success(t('reports.exported', { count, label }))
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
        <span className="text-xs text-muted-foreground">{t('reports.available', { count })}</span>
        <button
          onClick={handleExport}
          disabled={count === 0}
          className="flex items-center gap-1.5 px-4 h-10 sm:h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="size-3.5" />
          {t('reports.export')}
        </button>
      </div>
    </div>
  )
}

export function ReportsPage() {
  // Aggregates every issue/task/approval: loads them all when opened (Todo-Pilot §22)
  useEnsureLoaded('core')
  const { issues, tasks, approvals } = useIssueStore()
  const { t } = useT()

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <PageHeader
        title={t('reports.title')}
        description={t('reports.subtitle')}
      />

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card text-sm text-muted-foreground">
        <FileText className="size-4 mt-0.5 flex-shrink-0 text-primary" />
        <p>{t('reports.bomNote')}</p>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ReportCard
          icon={<FileText className="size-5" />}
          title={t('reports.issuesTitle')}
          description={t('reports.issuesDesc')}
          count={issues.length}
          label={t('reports.issuesLabel')}
          onExport={() => exportIssues(issues, t)}
        />
        <ReportCard
          icon={<CheckSquare className="size-5" />}
          title={t('reports.tasksTitle')}
          description={t('reports.tasksDesc')}
          count={tasks.length}
          label={t('reports.tasksLabel')}
          onExport={() => exportTasks(tasks, t)}
        />
        <ReportCard
          icon={<CheckCircle2 className="size-5" />}
          title={t('reports.approvalsTitle')}
          description={t('reports.approvalsDesc')}
          count={approvals.length}
          label={t('reports.approvalsLabel')}
          onExport={() => exportApprovals(approvals, t)}
        />
      </div>

      {/* Column reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: t('reports.columnsOf', { name: t('reports.issuesTitle') }), columns: headersOf(ISSUE_COLS, t) },
          { title: t('reports.columnsOf', { name: t('reports.tasksTitle') }), columns: headersOf(TASK_COLS, t) },
          { title: t('reports.columnsOf', { name: t('reports.approvalsTitle') }), columns: headersOf(APPROVAL_COLS, t) },
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
