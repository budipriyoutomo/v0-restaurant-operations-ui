'use client'

import { useState, useRef } from 'react'
import { BookOpen, Plus, Clock, CheckCircle2, XCircle, Users, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { useMyOutlets, useOutletFilter, usePermissions } from '@/lib/permissions'
import { TrainingProgram, TrainingProgramStatus, CreateTrainingProgramInput } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'
import { ParticipantsDrawer } from '@/components/training/participants-drawer'
import { AttendanceRecap } from '@/components/training/attendance-recap'
import { useT } from '@/lib/i18n'
import { navigate } from '@/lib/use-route'
import { recordPath } from '@/lib/routes'
import { placesLeft } from '@/lib/training'
import { formatMoney } from '@/lib/money'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'
import { SegmentedTabs } from '@/components/shared/segmented-tabs'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState as SharedEmptyState } from '@/components/shared/empty-state'
import { byOutlet } from '@/lib/outlet-filter'

type Tab = 'sessions' | 'approvals' | 'programs' | 'attendance'

const STATUS_COLORS: Record<TrainingProgramStatus, string> = {
  scheduled:  'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  ongoing:    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  completed:  'bg-success/15 text-success',
  cancelled:  'bg-muted text-muted-foreground',
}

export function TrainingPage() {
  useEnsureLoaded('core', 'training', 'users')
  const { t, date } = useT()
  const {
    issues: allIssues, approvals: allApprovals, outlets, pics, createIssue,
    trainingPrograms: allPrograms, trainingLoading, createTrainingProgram, updateTrainingProgram, deleteTrainingProgram,
    loadTrainingPrograms,
  } = useIssueStore()
  // Top bar outlet filter; company-wide programmes (no outlet) always show.
  const { outlet } = useOutletFilter()
  const issues = byOutlet(allIssues, outlet)
  const approvals = byOutlet(allApprovals, outlet)
  const trainingPrograms = byOutlet(allPrograms, outlet, { includeShared: true })
  // Outlet pickers must only offer outlets this user may write to (Tier 4).
  const myOutlets = useMyOutlets()
  const { can } = usePermissions()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<Tab>('sessions')
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null)
  // Participants drawer + attendance recap (Todo-Pilot §9)
  const [participantsOf, setParticipantsOf] = useState<string | null>(null)
  const [recapKey, setRecapKey] = useState(0)
  const participantsProgram = trainingPrograms.find((p) => p.id === participantsOf) ?? null

  const sessions   = issues.filter(i => i.category === 'Training')
  const approvalsT = approvals.filter(a => a.type === 'training')

  const stats = {
    total:     sessions.length,
    pending:   approvalsT.filter(a => a.status === 'pending').length,
    upcoming:  sessions.filter(s => s.status === 'open' || s.status === 'assigned').length,
    programs:  trainingPrograms.filter(p => p.status !== 'cancelled').length,
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">
      <PageHeader
        title={t('training.title')}
        description={t('training.subtitle')}
        actions={<>
          {tab === 'programs' ? (
          can.manageTraining && (
            <button
              onClick={() => { setEditingProgram(null); setShowProgramForm(true) }}
              className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" /> {t('training.newProgram')}
            </button>
          )
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> {t('training.newRequest')}
          </button>
        )}
      </>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={t('training.totalSessions')} value={stats.total}    color="text-foreground" />
        <StatCard label={t('assetsPage.pending')} value={stats.pending}  color="text-amber-700 dark:text-amber-400"  />
        <StatCard label={t('training.upcoming')} value={stats.upcoming} color="text-blue-600"   />
        <StatCard label={t('training.programs')} value={stats.programs} color="text-primary"    />
      </div>

      <SegmentedTabs label={t('nav.training')} value={tab} onChange={setTab} tabs={[
        { id: 'sessions',   label: t('training.tab.sessions', { count: sessions.length }) },
        { id: 'approvals',  label: t('training.tab.approvals', { count: approvalsT.length }) },
        { id: 'programs',   label: t('training.tab.programs', { count: trainingPrograms.length }) },
        { id: 'attendance', label: t('training.tab.attendance') },
      ] as const} />

      {tab === 'sessions' && (
        sessions.length === 0 ? (
          <EmptyState icon={<BookOpen className="size-8 text-muted-foreground" />} label={t('training.noSessions')} hint={t('training.noSessionsHint')} />
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <button type="button" key={s.id} onClick={() => navigate(recordPath('issues', s.id))} className="w-full text-left p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{s.number}</span>
                    <PriorityBadge priority={s.priority} />
                  </div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="size-3" />{s.outlet}</span>
                    <span>·</span><span>{s.assignee || t('common.unassigned')}</span>
                    {s.dueDate && <><span>·</span><span>{t('training.scheduled', { date: date(s.dueDate) })}</span></>}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </button>
            ))}
          </div>
        )
      )}

      {tab === 'approvals' && (
        approvalsT.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="size-8 text-muted-foreground" />} label={t('training.noApprovals')} hint={t('training.noApprovalsHint')} />
        ) : (
          <div className="space-y-2">
            {approvalsT.map(a => (
              <button type="button" key={a.id} onClick={() => navigate(recordPath('approvals', a.id))} className="w-full text-left p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground">{a.number}</span>
                  <p className="text-sm font-semibold mt-0.5">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>{a.outlet}</span><span>·</span><span>{t('assetsPage.by', { name: a.requester })}</span>
                    {a.amount != null && <><span>·</span><span className="font-semibold text-foreground">{formatMoney(a.amount, a.currency)}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {a.status === 'pending'  && <Clock className="size-4 text-amber-700 dark:text-amber-400" />}
                  {a.status === 'approved' && <CheckCircle2 className="size-4 text-success" />}
                  {a.status === 'rejected' && <XCircle className="size-4 text-destructive" />}
                  <StatusBadge status={a.status} />
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {tab === 'programs' && (
        <ProgramList
          programs={trainingPrograms}
          loading={trainingLoading}
          canManage={can.manageTraining}
          onEdit={p => { setEditingProgram(p); setShowProgramForm(true) }}
          onDelete={deleteTrainingProgram}
          onStatusChange={(id, status) => updateTrainingProgram(id, { status })}
          onParticipants={(p) => setParticipantsOf(p.id)}
        />
      )}

      {tab === 'attendance' && <AttendanceRecap refreshKey={recapKey} />}

      {participantsProgram && (
        <ParticipantsDrawer
          program={participantsProgram}
          canManage={can.manageTraining}
          onClose={() => setParticipantsOf(null)}
          onChanged={() => { loadTrainingPrograms(); setRecapKey((k) => k + 1) }}
        />
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultSystemKey="training"
        outlets={myOutlets.map(o => o.name)}
        onSubmit={async (input) => { await createIssue(input) }}
      />

      {showProgramForm && (
        <ProgramFormModal
          program={editingProgram}
          outlets={myOutlets.map(o => o.name)}
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
function ProgramList({ programs, loading, canManage, onEdit, onDelete, onStatusChange, onParticipants }: {
  programs: TrainingProgram[]
  loading: boolean
  canManage: boolean
  onEdit: (p: TrainingProgram) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TrainingProgramStatus) => void
  onParticipants: (p: TrainingProgram) => void
}) {
  const { t, label, date } = useT()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (loading && programs.length === 0) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (programs.length === 0) return <EmptyState icon={<BookOpen className="size-8 text-muted-foreground" />} label={t('training.noPrograms')} hint={t('training.noProgramsHint')} />

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
              <span className={cn('inline-block text-xs px-2 py-0.5 rounded-md font-semibold mt-1', STATUS_COLORS[p.status as TrainingProgramStatus])}>
                {label('trainingStatus', p.status)}
              </span>
            </div>
            {canManage && (
              <div className="flex gap-1">
                <button onClick={() => onEdit(p)} aria-label={t('common.edit')} className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="size-3" /></button>
                <button onClick={() => setConfirmDelete(p.id)} aria-label={t('common.delete')} className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="size-3" /></button>
              </div>
            )}
          </div>
          {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>{t('training.role')} <span className="font-medium text-foreground">{p.target_role === 'all' ? t('training.allRoles') : label('tier', p.target_role)}</span></p>
            {p.trainer && <p>{t('training.trainer', { name: p.trainer })}</p>}
            {p.outlet && <p>{t('training.outlet', { name: p.outlet })}</p>}
            {p.scheduled_date && <p>{t('training.scheduled', { date: date(p.scheduled_date) })}</p>}
            {p.duration_hours != null && <p>{t('training.durationValue', { n: p.duration_hours })}</p>}
          </div>
          <button onClick={() => onParticipants(p)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-muted/50">
            <span className="flex items-center gap-1.5 font-medium"><Users className="size-3.5" /> {t('training.participants')}</span>
            <span className="text-muted-foreground">
              {p.enrolled_count}{p.max_participants ? ` / ${p.max_participants}` : ''}
              {placesLeft(p.max_participants, p.enrolled_count) === 0 && <span className="ml-1 text-amber-700 dark:text-amber-400 font-semibold">{t('training.full')}</span>}
              {p.attended_count > 0 && <span className="ml-1">· {p.attended_count} attended</span>}
            </span>
          </button>
          {canManage && (
            <div className="pt-1 border-t border-border">
              <select
                value={p.status}
                onChange={e => onStatusChange(p.id, e.target.value as TrainingProgramStatus)}
                className="w-full px-2 py-1 text-xs rounded border border-border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                {(['scheduled', 'ongoing', 'completed', 'cancelled'] as const).map((st) => (
                  <option key={st} value={st}>{label('trainingStatus', st)}</option>
                ))}
              </select>
            </div>
          )}
          {confirmDelete === p.id && (
            <div className="border-t border-border pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">{t('training.deleteConfirm', { name: p.title })}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-accent">{t('common.cancel')}</button>
                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                  className="flex-1 py-1 text-xs rounded bg-destructive text-destructive-foreground font-semibold flex items-center justify-center gap-1">
                  {deleting === p.id ? <Loader2 className="size-3 animate-spin" /> : t('common.delete')}
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
  const { t, label } = useT()
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

  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{program ? t('training.editProgram') : t('training.newProgramTitle')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="size-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          {[
            { text: t('training.fieldTitle'), key: 'title', placeholder: t('training.titlePlaceholder') },
            { text: t('common.description'), key: 'description', placeholder: t('training.descriptionPlaceholder') },
            { text: t('training.trainerLabel'), key: 'trainer', placeholder: t('training.trainerPlaceholder') },
          ].map(({ text, key, placeholder }) => (
            <div key={key}>
              <label htmlFor={`program-${key}`} className="block text-xs font-semibold mb-1">{text}</label>
              <input
                id={`program-${key}`}
                type="text"
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              />
            </div>
          ))}
          <div>
            <label htmlFor="program-role" className="block text-xs font-semibold mb-1">{t('training.targetRole')}</label>
            <select
              id="program-role"
              value={form.target_role}
              onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            >
              <option value="staff">{label('tier', 'staff')}</option>
              <option value="manager">{label('tier', 'manager')}</option>
              <option value="admin">{label('tier', 'admin')}</option>
              <option value="all">{t('training.allRoles')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="program-outlet" className="block text-xs font-semibold mb-1">{t('common.outlet')}</label>
            <select
              id="program-outlet"
              value={form.outlet}
              onChange={e => setForm(f => ({ ...f, outlet: e.target.value }))}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            >
              <option value="">{t('cmms.allOutlets')}</option>
              {outlets.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="program-date" className="block text-xs font-semibold mb-1">{t('training.scheduledDate')}</label>
              <input id="program-date" type="date" value={form.scheduled_date}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              />
            </div>
            <div>
              <label htmlFor="program-duration" className="block text-xs font-semibold mb-1">{t('training.duration')}</label>
              <input id="program-duration" type="number" min="0.5" step="0.5" placeholder="2" value={form.duration_hours}
                onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              />
            </div>
          </div>
          <div>
            <label htmlFor="program-max" className="block text-xs font-semibold mb-1">{t('training.maxParticipants')}</label>
            <input id="program-max" type="number" min="1" placeholder="20" value={form.max_participants}
              onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-accent">{t('common.cancel')}</button>
            <button type="submit" disabled={!form.title.trim() || loading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold',
                form.title.trim() && !loading ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : program ? t('procurement.saveChanges') : t('training.createProgram')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-2xl border border-border bg-card">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function EmptyState({ icon, label, hint }: { icon: React.ReactElement; label: string; hint: string }) {
  return (
    <SharedEmptyState icon={icon} title={label} description={hint} />
  )
}
