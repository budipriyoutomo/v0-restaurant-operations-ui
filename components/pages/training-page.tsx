'use client'

import { useState } from 'react'
import { BookOpen, Plus, Clock, CheckCircle2, XCircle, Users, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { TrainingProgram, TrainingProgramStatus, CreateTrainingProgramInput } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'

type Tab = 'sessions' | 'approvals' | 'programs'

const STATUS_COLORS: Record<TrainingProgramStatus, string> = {
  scheduled:  'bg-blue-100 text-blue-700',
  ongoing:    'bg-amber-100 text-amber-700',
  completed:  'bg-success/15 text-success',
  cancelled:  'bg-muted text-muted-foreground',
}

export function TrainingPage() {
  const {
    issues, approvals, outlets, pics, createIssue,
    trainingPrograms, trainingLoading, createTrainingProgram, updateTrainingProgram, deleteTrainingProgram,
  } = useIssueStore()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<Tab>('sessions')
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null)

  const sessions   = issues.filter(i => i.category === 'Training')
  const approvalsT = approvals.filter(a => a.type === 'training')

  const stats = {
    total:     sessions.length,
    pending:   approvalsT.filter(a => a.status === 'pending').length,
    upcoming:  sessions.filter(s => s.status === 'open' || s.status === 'assigned').length,
    programs:  trainingPrograms.filter(p => p.status !== 'cancelled').length,
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training</h1>
          <p className="text-sm text-muted-foreground mt-1">Staff training programs, certification tracking, and session scheduling</p>
        </div>
        {tab === 'programs' ? (
          <button
            onClick={() => { setEditingProgram(null); setShowProgramForm(true) }}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> New Program
          </button>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> New Training Request
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Sessions"   value={stats.total}    color="text-foreground" />
        <StatCard label="Pending Approval" value={stats.pending}  color="text-amber-600"  />
        <StatCard label="Upcoming"         value={stats.upcoming} color="text-blue-600"   />
        <StatCard label="Programs"         value={stats.programs} color="text-primary"    />
      </div>

      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'sessions',  label: `Training Sessions (${sessions.length})` },
          { id: 'approvals', label: `Approvals (${approvalsT.length})` },
          { id: 'programs',  label: `Programs (${trainingPrograms.length})` },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
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
                    <span>·</span><span>{s.assignee || 'Unassigned'}</span>
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
                  <span className="text-[11px] font-mono text-muted-foreground">{a.number}</span>
                  <p className="text-sm font-semibold mt-0.5">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span>{a.outlet}</span><span>·</span><span>By: {a.requester}</span>
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

      {tab === 'programs' && (
        <ProgramList
          programs={trainingPrograms}
          loading={trainingLoading}
          onEdit={p => { setEditingProgram(p); setShowProgramForm(true) }}
          onDelete={deleteTrainingProgram}
          onStatusChange={(id, status) => updateTrainingProgram(id, { status })}
        />
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultCategory="Training"
        outlets={outlets.map(o => o.name)}
        assignees={['Unassigned', ...pics.map(p => p.name)]}
        onSubmit={async (input) => { await createIssue(input) }}
      />

      {showProgramForm && (
        <ProgramFormModal
          program={editingProgram}
          outlets={outlets.map(o => o.name)}
          onClose={() => setShowProgramForm(false)}
          onSubmit={async (data) => {
            if (editingProgram) {
              await updateTrainingProgram(editingProgram.id, data)
            } else {
              await createTrainingProgram(data as CreateTrainingProgramInput)
            }
            setShowProgramForm(false)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Programs list
// ---------------------------------------------------------------------------
function ProgramList({ programs, loading, onEdit, onDelete, onStatusChange }: {
  programs: TrainingProgram[]
  loading: boolean
  onEdit: (p: TrainingProgram) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TrainingProgramStatus) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (loading && programs.length === 0) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (programs.length === 0) return <EmptyState icon={<BookOpen className="size-8 text-muted-foreground" />} label="No programs yet" hint="Add a training program to schedule and track it." />

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try { await onDelete(id) } finally { setDeleting(null); setConfirmDelete(null) }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {programs.map(p => (
        <div key={p.id} className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">{p.title}</p>
              <span className={cn('inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold mt-1', STATUS_COLORS[p.status as TrainingProgramStatus])}>
                {p.status}
              </span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onEdit(p)} className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="size-3" /></button>
              <button onClick={() => setConfirmDelete(p.id)} className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="size-3" /></button>
            </div>
          </div>
          {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Role: <span className="font-medium text-foreground capitalize">{p.target_role}</span></p>
            {p.trainer && <p>Trainer: {p.trainer}</p>}
            {p.outlet && <p>Outlet: {p.outlet}</p>}
            {p.scheduled_date && <p>Scheduled: {p.scheduled_date}</p>}
            {p.duration_hours != null && <p>Duration: {p.duration_hours}h</p>}
            {p.max_participants && <p>Max participants: {p.max_participants}</p>}
          </div>
          <div className="pt-1 border-t border-border">
            <select
              value={p.status}
              onChange={e => onStatusChange(p.id, e.target.value as TrainingProgramStatus)}
              className="w-full px-2 py-1 text-xs rounded border border-border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {confirmDelete === p.id && (
            <div className="border-t border-border pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">Delete <strong>{p.title}</strong>?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-accent">Cancel</button>
                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                  className="flex-1 py-1 text-xs rounded bg-destructive text-destructive-foreground font-semibold flex items-center justify-center gap-1">
                  {deleting === p.id ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Program form modal
// ---------------------------------------------------------------------------
function ProgramFormModal({ program, outlets, onClose, onSubmit }: {
  program: TrainingProgram | null
  outlets: string[]
  onClose: () => void
  onSubmit: (data: Partial<CreateTrainingProgramInput>) => Promise<void>
}) {
  const [form, setForm] = useState({
    title:           program?.title           ?? '',
    description:     program?.description     ?? '',
    target_role:     program?.target_role     ?? 'staff',
    outlet:          program?.outlet          ?? '',
    trainer:         program?.trainer         ?? '',
    scheduled_date:  program?.scheduled_date  ?? '',
    duration_hours:  program?.duration_hours != null ? String(program.duration_hours) : '',
    max_participants: program?.max_participants != null ? String(program.max_participants) : '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        title:           form.title.trim(),
        description:     form.description || undefined,
        target_role:     form.target_role || 'staff',
        outlet:          form.outlet || undefined,
        trainer:         form.trainer || undefined,
        scheduled_date:  form.scheduled_date || undefined,
        duration_hours:  form.duration_hours ? parseFloat(form.duration_hours) : undefined,
        max_participants: form.max_participants ? parseInt(form.max_participants) : undefined,
      })
    } catch (e) {
      setError(String(e).replace(/Error: API \d+ [^:]+: /, ''))
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{program ? 'Edit Program' : 'New Training Program'}</h2>
          <button onClick={onClose} className="size-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          {[
            { label: 'Title *', key: 'title', placeholder: 'Food Safety Certification' },
            { label: 'Description', key: 'description', placeholder: 'Brief description…' },
            { label: 'Trainer', key: 'trainer', placeholder: 'Trainer name' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold mb-1">{label}</label>
              <input
                type="text"
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold mb-1">Target Role</label>
            <select
              value={form.target_role}
              onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="all">All Roles</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Outlet</label>
            <select
              value={form.outlet}
              onChange={e => setForm(f => ({ ...f, outlet: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Outlets</option>
              {outlets.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Scheduled Date</label>
              <input type="date" value={form.scheduled_date}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Duration (hours)</label>
              <input type="number" min="0.5" step="0.5" placeholder="2" value={form.duration_hours}
                onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Max Participants</label>
            <input type="number" min="1" placeholder="20" value={form.max_participants}
              onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-accent">Cancel</button>
            <button type="submit" disabled={!form.title.trim() || loading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold',
                form.title.trim() && !loading ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : program ? 'Save Changes' : 'Create Program'}
            </button>
          </div>
        </form>
      </div>
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
