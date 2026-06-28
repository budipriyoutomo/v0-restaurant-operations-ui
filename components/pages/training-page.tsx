'use client'

import { useState } from 'react'
import { BookOpen, Plus, Clock, CheckCircle2, XCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'

export function TrainingPage() {
  const { issues, approvals, outlets, pics, createIssue } = useIssueStore()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'sessions' | 'approvals'>('sessions')

  const sessions   = issues.filter(i => i.category === 'Training')
  const approvalsT = approvals.filter(a => a.type === 'training')

  const stats = {
    total:     sessions.length,
    pending:   approvalsT.filter(a => a.status === 'pending').length,
    upcoming:  sessions.filter(s => s.status === 'open' || s.status === 'assigned').length,
    completed: sessions.filter(s => s.status === 'resolved' || s.status === 'closed').length,
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training</h1>
          <p className="text-sm text-muted-foreground mt-1">Staff training programs, certification tracking, and session scheduling</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> New Training Request
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Sessions"   value={stats.total}     color="text-foreground" />
        <StatCard label="Pending Approval" value={stats.pending}   color="text-amber-600"  />
        <StatCard label="Upcoming"         value={stats.upcoming}  color="text-blue-600"   />
        <StatCard label="Completed"        value={stats.completed} color="text-success"     />
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['sessions', 'approvals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'sessions' ? `Training Sessions (${sessions.length})` : `Approvals (${approvalsT.length})`}
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        sessions.length === 0 ? (
          <EmptyState icon={<BookOpen className="size-8 text-muted-foreground" />} label="No training sessions" hint="Create a new training request to get started." />
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-muted-foreground">{s.number}</span>
                    <PriorityBadge priority={s.priority} />
                  </div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="size-3" />{s.outlet}</span>
                    <span>·</span>
                    <span>{s.assignee || 'Unassigned'}</span>
                    {s.dueDate && <><span>·</span><span>Scheduled: {s.dueDate}</span></>}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'approvals' && (
        approvalsT.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="size-8 text-muted-foreground" />} label="No training approvals" hint="Approvals appear when a training request is submitted with approval enabled." />
        ) : (
          <div className="space-y-2">
            {approvalsT.map(a => (
              <div key={a.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-muted-foreground">{a.number}</span>
                  </div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span>{a.outlet}</span>
                    <span>·</span>
                    <span>By: {a.requester}</span>
                    {a.amount && <><span>·</span><span className="font-semibold text-foreground">{a.amount}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {a.status === 'pending'  && <Clock className="size-4 text-amber-500" />}
                  {a.status === 'approved' && <CheckCircle2 className="size-4 text-success" />}
                  {a.status === 'rejected' && <XCircle className="size-4 text-destructive" />}
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultCategory="Training"
        outlets={outlets.map(o => o.name)}
        assignees={['Unassigned', ...pics.map(p => p.name)]}
        onSubmit={async (input) => { await createIssue(input) }}
      />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function EmptyState({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
      {icon}
      <p className="text-sm font-medium mt-3">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  )
}
