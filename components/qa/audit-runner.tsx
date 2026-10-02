'use client'

// Run (or review) one QA audit — Todo-Pilot §7. Built for a phone in the
// kitchen: big Pass / Fail / N/A buttons, camera capture, and every answer or
// photo goes through the offline queue, so a dead zone never loses work.
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Camera, Check, Loader2, Minus, Repeat, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { QueuedError, apiErrorMessage } from '@/lib/api-client'
import { auditProgress, previewScore, scoreTone, submitProblems } from '@/lib/qa-audit'
import { qaApi } from '@/lib/qa-audit-api'
import type { QAAuditDetail, QAAuditFinding, QAAuditResult } from '@/lib/types'
import { AuthedImage } from '@/components/shared/authed-image'
import { TONE_CLASS } from './tone'

const RESULT_BUTTONS: { value: QAAuditResult; label: string; icon: React.ElementType; active: string }[] = [
  { value: 'pass', label: 'Pass', icon: Check, active: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'fail', label: 'Fail', icon: X,     active: 'bg-red-600 text-white border-red-600' },
  { value: 'na',   label: 'N/A',  icon: Minus, active: 'bg-slate-500 text-white border-slate-500' },
]

interface Props {
  auditId: string
  canEdit: boolean
  onClose: () => void
  onChanged: () => void          // list should refresh (submitted / discarded)
}

export function AuditRunner({ auditId, canEdit, onClose, onChanged }: Props) {
  const [audit, setAudit] = useState<QAAuditDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Photos taken offline: shown as "queued" until the queue replays them.
  const [queuedPhotos, setQueuedPhotos] = useState<Record<string, number>>({})

  useEffect(() => {
    qaApi.get(auditId).then(setAudit).catch((e) => setError(apiErrorMessage(e)))
  }, [auditId])

  const editable = canEdit && audit?.status === 'in_progress'

  // Queued photos count toward "photo required" so an offline auditor can still
  // see a complete checklist; the server re-checks on submit.
  const findingsForRules = useMemo(() => (audit?.findings ?? []).map((f) => ({
    ...f,
    photos: queuedPhotos[f.id] ? [...f.photos, ...Array(queuedPhotos[f.id]).fill(null)] : f.photos,
  })), [audit, queuedPhotos])

  if (error) return <Shell onClose={onClose}><p className="p-6 text-sm text-destructive">{error}</p></Shell>
  if (!audit) return <Shell onClose={onClose}><div className="p-10 flex justify-center"><Loader2 className="size-5 animate-spin" /></div></Shell>

  const progress = auditProgress(audit.findings)
  const score = audit.status === 'submitted' ? audit.score : previewScore(audit.findings)
  const problems = submitProblems(findingsForRules)

  const patchLocal = (id: string, patch: Partial<QAAuditFinding>) =>
    setAudit((a) => a && { ...a, findings: a.findings.map((f) => f.id === id ? { ...f, ...patch } : f) })

  const save = async (finding: QAAuditFinding, body: { result?: QAAuditResult; notes?: string }) => {
    patchLocal(finding.id, body)                       // optimistic
    try {
      const updated = await qaApi.updateFinding(audit.id, finding.id, body)
      patchLocal(finding.id, { result: updated.result, notes: updated.notes })
    } catch (e) {
      if (e instanceof QueuedError) toast.info('Offline — answer saved and will sync automatically.')
      else { toast.error(apiErrorMessage(e)); patchLocal(finding.id, { result: finding.result, notes: finding.notes }) }
    }
  }

  const addPhoto = async (finding: QAAuditFinding, file: File) => {
    try {
      const photo = await qaApi.uploadPhoto(audit.id, finding.id, file)
      patchLocal(finding.id, { photos: [...finding.photos, photo] })
    } catch (e) {
      if (e instanceof QueuedError) {
        setQueuedPhotos((q) => ({ ...q, [finding.id]: (q[finding.id] ?? 0) + 1 }))
        toast.info('Offline — photo queued and will upload automatically.')
      } else toast.error(apiErrorMessage(e, 'Photo upload failed.'))
    }
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const done = await qaApi.submit(audit.id)
      setAudit(done)
      const fails = done.failedCount
      toast.success(fails ? `Audit submitted — ${fails} issue(s) raised for the failed items.` : 'Audit submitted — all clear.')
      onChanged()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const discard = async () => {
    if (!window.confirm(`Discard audit ${audit.number}? Answers and photos are deleted.`)) return
    try {
      await qaApi.discard(audit.id)
      onChanged()
      onClose()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    }
  }

  // Group by category, keeping template order.
  const groups: { category: string; items: QAAuditFinding[] }[] = []
  for (const f of audit.findings) {
    const cat = f.category || 'General'
    const g = groups.find((x) => x.category === cat)
    if (g) g.items.push(f)
    else groups.push({ category: cat, items: [f] })
  }

  return (
    <Shell onClose={onClose}>
      {/* Sticky header: what, where, progress, score */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 sm:px-6 py-3 space-y-2">
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="min-w-0">
            <p className="font-mono text-xs text-primary font-bold">{audit.number}</p>
            <h2 className="font-bold text-base leading-snug truncate">{audit.templateName}</h2>
            <p className="text-xs text-muted-foreground">{audit.outlet} · {audit.auditDate} · {audit.auditor}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={cn('text-2xl font-bold', TONE_CLASS[scoreTone(score)])}>{score === null ? '—' : `${score}`}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {audit.status === 'submitted' ? 'Score' : 'Preview'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{progress.answered}/{progress.total}</span>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 space-y-6">
        {groups.map((g) => (
          <section key={g.category} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.category}</h3>
            {g.items.map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                editable={!!editable}
                queuedPhotos={queuedPhotos[f.id] ?? 0}
                onResult={(r) => save(f, { result: r })}
                onNotes={(n) => n !== f.notes && save(f, { notes: n })}
                onPhoto={(file) => addPhoto(f, file)}
              />
            ))}
          </section>
        ))}
      </div>

      {editable && (
        <div className="sticky bottom-0 bg-background border-t border-border px-4 sm:px-6 py-3 space-y-2">
          {problems.length > 0 && (
            <details className="text-xs text-amber-800">
              <summary className="cursor-pointer font-medium">{problems.length} item(s) still need attention</summary>
              <ul className="mt-1 space-y-0.5 list-disc pl-4">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </details>
          )}
          <div className="flex gap-2">
            <button onClick={discard} className="flex items-center gap-1.5 px-3 h-10 rounded-md border border-border text-xs font-semibold hover:bg-muted/50">
              <Trash2 className="size-3.5" /> Discard
            </button>
            <button
              onClick={submit}
              disabled={problems.length > 0 || submitting}
              className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit audit'}
            </button>
          </div>
        </div>
      )}
    </Shell>
  )
}

function FindingCard({ finding: f, editable, queuedPhotos, onResult, onNotes, onPhoto }: {
  finding: QAAuditFinding
  editable: boolean
  queuedPhotos: number
  onResult: (r: QAAuditResult) => void
  onNotes: (n: string) => void
  onPhoto: (file: File) => void
}) {
  const [notes, setNotes] = useState(f.notes)
  useEffect(() => setNotes(f.notes), [f.notes])
  const needsPhoto = f.requiresPhoto && f.result !== 'na' && f.photos.length + queuedPhotos === 0

  return (
    <div className={cn(
      'rounded-lg border p-3 space-y-2.5',
      f.result === 'fail' ? 'border-red-300 bg-red-50/40 dark:bg-red-950/10' : 'border-border bg-card',
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{f.title}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          {f.isCritical && <Badge className="bg-red-100 text-red-700"><Star className="size-2.5" /> Critical</Badge>}
          {f.requiresPhoto && <Badge className={needsPhoto ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}><Camera className="size-2.5" /> Photo</Badge>}
          {f.isRepeat && <Badge className="bg-orange-100 text-orange-700"><Repeat className="size-2.5" /> Repeat</Badge>}
          <span className="text-[10px] text-muted-foreground">×{f.weight}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {RESULT_BUTTONS.map((b) => {
          const Icon = b.icon
          const active = f.result === b.value
          return (
            <button
              key={b.value}
              disabled={!editable}
              onClick={() => onResult(b.value)}
              className={cn(
                'h-11 rounded-md border text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors',
                active ? b.active : 'border-border hover:bg-muted/50',
                !editable && !active && 'opacity-40',
                !editable && 'cursor-default',
              )}
            >
              <Icon className="size-4" /> {b.label}
            </button>
          )
        })}
      </div>

      {(editable || f.notes) && (
        <textarea
          value={notes}
          disabled={!editable}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => onNotes(notes)}
          rows={f.result === 'fail' ? 2 : 1}
          placeholder={f.result === 'fail' ? 'What is wrong? (goes into the issue)' : 'Notes (optional)'}
          className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm disabled:opacity-70"
        />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {f.photos.map((p) => (
          <AuthedImage key={p.id} path={p.thumbnailUrl} alt={f.title} className="size-14 rounded-md object-cover border border-border" />
        ))}
        {queuedPhotos > 0 && (
          <span className="size-14 rounded-md border border-dashed border-border text-[10px] text-muted-foreground flex items-center justify-center text-center px-1">
            {queuedPhotos} queued
          </span>
        )}
        {editable && (
          <label className="size-14 rounded-md border border-dashed border-border flex flex-col items-center justify-center text-[10px] text-muted-foreground cursor-pointer hover:bg-muted/50">
            <Camera className="size-4" /> Add
            <input
              type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) onPhoto(file); e.target.value = '' }}
            />
          </label>
        )}
        {f.issueId && (
          <span className="text-[11px] text-red-700 flex items-center gap-1 ml-auto">
            <AlertTriangle className="size-3" /> Issue raised
          </span>
        )}
      </div>
    </div>
  )
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold', className)}>{children}</span>
}

function Shell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-xl bg-background border-l border-border shadow-lg z-50 overflow-y-auto">
        <button onClick={onClose} className="absolute right-3 top-3 z-20 p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="size-5" />
        </button>
        {children}
      </div>
    </>
  )
}
