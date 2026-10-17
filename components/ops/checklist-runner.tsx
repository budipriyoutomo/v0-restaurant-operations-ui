'use client'

// Fill in (or review) one daily ops checklist — Todo-Ops-Checklist Fase 1.
// Built for a phone in the kitchen: big Pass / Fail / N/A buttons, a numeric
// field with a ± key for freezer temperatures, camera capture, and every
// answer, photo and the submit itself go through the offline queue.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Camera, Check, Clock, Loader2, Minus, QrCode, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { QueuedError, apiErrorMessage } from '@/lib/api-client'
import { evaluateItem, failPreview, progress, runScore, submitProblems, windowState } from '@/lib/ops-checklist'
import { opsApi, type OpsAnswer } from '@/lib/ops-checklist-api'
import type { OpsResult, OpsRunDetail, OpsRunItem } from '@/lib/types'
import { AuthedImage } from '@/components/shared/authed-image'
import { useT } from '@/lib/i18n'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'
import { useIssueStore } from '@/lib/store'
import { ScanTab } from '@/components/cmms/qr-dialog'
import type { QRResolveResult } from '@/lib/types'

const RESULT_BUTTONS: { value: OpsResult; icon: React.ElementType; active: string }[] = [
  { value: 'pass', icon: Check, active: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'fail', icon: X,     active: 'bg-red-600 text-white border-red-600' },
  { value: 'na',   icon: Minus, active: 'bg-slate-500 text-white border-slate-500' },
]

export const WINDOW_TONE: Record<string, string> = {
  upcoming: 'bg-muted text-muted-foreground',
  open: 'bg-blue-100 text-blue-800',
  late: 'bg-amber-100 text-amber-800',
  missed: 'bg-red-100 text-red-700',
  submitted: 'bg-emerald-100 text-emerald-800',
}

interface Props {
  runId: string
  onClose: () => void
  onChanged: () => void          // the list should refresh (answered / submitted)
}

export function ChecklistRunner({ runId, onClose, onChanged }: Props) {
  const { t, dateTime, relative, date } = useT()
  const [run, setRun] = useState<OpsRunDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [queuedPhotos, setQueuedPhotos] = useState<Record<string, number>>({})
  const [queuedSubmit, setQueuedSubmit] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const resolveQr = useIssueStore((s) => s.resolveQr)

  useEffect(() => {
    opsApi.get(runId).then(setRun).catch((e) => setError(apiErrorMessage(e)))
  }, [runId])

  const state = run ? windowState(run) : 'upcoming'
  const editable = !!run && (state === 'open' || state === 'late') && !queuedSubmit
  const problems = useMemo(() => (run ? submitProblems(run.items, queuedPhotos) : []), [run, queuedPhotos])

  if (error) return <Shell onClose={onClose}><p className="p-6 text-sm text-destructive">{error}</p></Shell>
  if (!run) return <Shell onClose={onClose}><div className="p-10 flex justify-center"><Loader2 className="size-5 animate-spin" /></div></Shell>

  const prog = progress(run.items)
  const score = run.status === 'submitted' ? run.score : runScore(run.items)
  const fails = failPreview(run.items)

  const patchLocal = (id: string, patch: Partial<OpsRunItem>) =>
    setRun((r) => r && { ...r, items: r.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })

  const save = async (item: OpsRunItem, body: OpsAnswer, optimistic: Partial<OpsRunItem>) => {
    patchLocal(item.id, optimistic)
    try {
      const updated = await opsApi.answer(run.id, item.id, body)
      patchLocal(item.id, { result: updated.result, value: updated.value, notes: updated.notes,
        correctiveAction: updated.correctiveAction, recordedAt: updated.recordedAt })
      onChanged()
    } catch (e) {
      if (e instanceof QueuedError) toast.info(t('ops.offlineAnswer'))
      else {
        toast.error(apiErrorMessage(e))
        patchLocal(item.id, { result: item.result, value: item.value, notes: item.notes, correctiveAction: item.correctiveAction })
      }
    }
  }

  const addPhoto = async (item: OpsRunItem, file: File) => {
    try {
      const photo = await opsApi.uploadPhoto(run.id, item.id, file)
      patchLocal(item.id, { photos: [...item.photos, photo] })
    } catch (e) {
      if (e instanceof QueuedError) {
        setQueuedPhotos((q) => ({ ...q, [item.id]: (q[item.id] ?? 0) + 1 }))
        toast.info(t('ops.offlinePhoto'))
      } else toast.error(apiErrorMessage(e, t('ops.photoFailed')))
    }
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const done = await opsApi.submit(run.id)
      setRun(done)
      toast.success(done.failedCount ? t('ops.submittedFails', { count: done.failedCount }) : t('ops.submittedClear'))
      onChanged()
    } catch (e) {
      if (e instanceof QueuedError) {
        setQueuedSubmit(true)
        toast.info(t('ops.offlineSubmit'))
      } else toast.error(apiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  // Scanning the sticker on a freezer jumps to that freezer's reading (Fase 2).
  const hasAssets = run.items.some((i) => i.assetId)
  const onScanned = ({ asset }: QRResolveResult) => {
    setScanOpen(false)
    const target = run.items.find((i) => i.assetId === asset.id)
    if (!target) { toast.error(t('ops.assetNotInChecklist', { name: asset.name })); return }
    const el = document.getElementById(`ops-item-${target.id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.querySelector<HTMLInputElement>('input[inputmode="decimal"]')?.focus()
  }

  // Group by section, keeping template order.
  const groups: { section: string; items: OpsRunItem[] }[] = []
  for (const i of run.items) {
    const section = i.section || t('ops.general')
    const g = groups.find((x) => x.section === section)
    if (g) g.items.push(i)
    else groups.push({ section, items: [i] })
  }

  return (
    <Shell onClose={onClose}>
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 sm:px-6 py-3 space-y-2">
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="min-w-0">
            <p className="font-mono text-xs text-primary font-bold">{run.number}</p>
            <h2 className="font-bold text-base leading-snug truncate">{run.templateName}</h2>
            <p className="text-xs text-muted-foreground">{run.outlet} · {date(run.runDate)}</p>
            <p className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', WINDOW_TONE[queuedSubmit ? 'open' : state])}>
                {queuedSubmit ? t('ops.state.queued') : t(`ops.state.${state}`)}
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden /> {t('ops.dueAt', { time: dateTime(run.dueAt) })}
                {(state === 'open' || state === 'upcoming') && ` · ${relative(run.dueAt)}`}
              </span>
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold">{score === null ? '—' : `${score}`}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {run.status === 'submitted' ? t('ops.score') : t('ops.preview')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${prog.percent}%` }} />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{prog.answered}/{prog.total}</span>
        </div>
        {state === 'upcoming' && <p className="text-xs text-muted-foreground">{t('ops.notOpenYet', { time: dateTime(run.opensAt) })}</p>}
        {editable && hasAssets && (
          <div>
            <button type="button" onClick={() => setScanOpen((v) => !v)} aria-expanded={scanOpen}
              className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs font-semibold">
              <QrCode className="size-4" aria-hidden /> {t('ops.scanAsset')}
            </button>
            {scanOpen && <div className="mt-2"><ScanTab resolveQr={resolveQr} onResolved={onScanned} /></div>}
          </div>
        )}
        {state === 'missed' && <p className="text-xs text-red-700">{t('ops.missedLocked')}</p>}
      </div>

      <div className="px-4 sm:px-6 py-4 space-y-6">
        {groups.map((g) => (
          <section key={g.section} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.section}</h3>
            {g.items.map((i) => (
              <ItemCard
                key={i.id}
                item={i}
                editable={editable}
                queuedPhotos={queuedPhotos[i.id] ?? 0}
                onSave={(body, optimistic) => save(i, body, optimistic)}
                onPhoto={(file) => addPhoto(i, file)}
              />
            ))}
          </section>
        ))}
      </div>

      {editable && (
        <div className="sticky bottom-0 bg-background border-t border-border px-4 sm:px-6 py-3 space-y-2">
          {fails.length > 0 && (
            <div role="note" className="text-xs rounded-md bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 px-2.5 py-1.5">
              <p className="font-semibold flex items-center gap-1"><AlertTriangle className="size-3" aria-hidden /> {t('ops.willRaise', { count: fails.length })}</p>
              <ul className="list-disc pl-4">{fails.map((f) => <li key={f.id}>{f.title}{f.critical ? ` (${t('ops.critical')})` : ''}</li>)}</ul>
            </div>
          )}
          {problems.length > 0 && (
            <details className="text-xs text-amber-800">
              <summary className="cursor-pointer font-medium">{t('ops.needAttention', { count: problems.length })}</summary>
              <ul className="mt-1 space-y-0.5 list-disc pl-4">
                {problems.map((p) => <li key={`${p.title}-${p.kind}`}>{p.title}: {t(`ops.problem.${p.kind}`)}</li>)}
              </ul>
            </details>
          )}
          <button
            onClick={submit}
            disabled={problems.length > 0 || submitting}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? t('ops.submitting') : t('ops.submit')}
          </button>
        </div>
      )}
    </Shell>
  )
}

function rangeText(i: OpsRunItem): string {
  const u = i.unit ? ` ${i.unit}` : ''
  if (i.minValue !== null && i.maxValue !== null) return `${i.minValue} – ${i.maxValue}${u}`
  if (i.minValue !== null) return `≥ ${i.minValue}${u}`
  if (i.maxValue !== null) return `≤ ${i.maxValue}${u}`
  return ''
}

function ItemCard({ item: i, editable, queuedPhotos, onSave, onPhoto }: {
  item: OpsRunItem
  editable: boolean
  queuedPhotos: number
  onSave: (body: OpsAnswer, optimistic: Partial<OpsRunItem>) => void
  onPhoto: (file: File) => void
}) {
  const { t, label } = useT()
  const measured = i.itemType !== 'check'
  const [draft, setDraft] = useState(i.value === null ? '' : String(i.value))
  const [notes, setNotes] = useState(i.notes)
  const [corrective, setCorrective] = useState(i.correctiveAction ?? '')
  useEffect(() => setDraft(i.value === null ? '' : String(i.value)), [i.value])
  useEffect(() => setNotes(i.notes), [i.notes])
  useEffect(() => setCorrective(i.correctiveAction ?? ''), [i.correctiveAction])

  const parsed = draft.trim() === '' || draft.trim() === '-' ? null : Number(draft.replace(',', '.'))
  const livePreview = measured && parsed !== null && !Number.isNaN(parsed) ? evaluateItem(parsed, i.minValue, i.maxValue) : i.result
  const needsPhoto = i.requiresPhoto && i.result !== 'na' && i.photos.length + queuedPhotos === 0
  const needsCorrective = i.itemType === 'temperature' && livePreview === 'fail'
  const range = rangeText(i)

  const commitValue = () => {
    if (parsed === null || Number.isNaN(parsed) || parsed === i.value) return
    onSave({ value: parsed }, { value: parsed, result: evaluateItem(parsed, i.minValue, i.maxValue) })
  }
  const toggleSign = () => setDraft((d) => (d.startsWith('-') ? d.slice(1) : `-${d}`))

  return (
    <div id={`ops-item-${i.id}`} className={cn('rounded-lg border p-3 space-y-2.5 scroll-mt-40',
      livePreview === 'fail' ? 'border-red-300 bg-red-50/40 dark:bg-red-950/10' : 'border-border bg-card')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">
          {i.title}
          {i.assetName && <span className="block text-[11px] font-normal text-muted-foreground">{i.assetName}</span>}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          {i.isCritical && <Badge className="bg-red-100 text-red-700"><Star className="size-2.5" /> {t('ops.critical')}</Badge>}
          {i.requiresPhoto && <Badge className={needsPhoto ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}><Camera className="size-2.5" /> {t('ops.photo')}</Badge>}
        </div>
      </div>

      {measured ? (
        <div className="flex items-center gap-2">
          {i.itemType === 'temperature' && (
            <button type="button" onClick={toggleSign} disabled={!editable} aria-label={t('ops.toggleSign')}
              className="size-11 rounded-md border border-border text-lg font-bold disabled:opacity-40">±</button>
          )}
          <input
            type="text" inputMode="decimal" value={draft} disabled={!editable}
            onChange={(e) => setDraft(e.target.value.replace(/[^\d.,-]/g, ''))}
            onBlur={commitValue}
            onKeyDown={(e) => { if (e.key === 'Enter') commitValue() }}
            aria-label={`${i.title}${i.unit ? ` (${i.unit})` : ''}`}
            className={cn('h-11 w-28 px-3 rounded-md border text-lg font-semibold tabular-nums bg-background disabled:opacity-70',
              livePreview === 'fail' ? 'border-red-400 text-red-700' : 'border-border')}
          />
          <span className="text-sm text-muted-foreground">{i.unit}</span>
          {range && <span className="text-xs text-muted-foreground ml-auto">{t('ops.range', { range })}</span>}
          <button type="button" disabled={!editable} onClick={() => onSave({ result: 'na' }, { result: 'na', value: null })}
            className={cn('h-11 px-3 rounded-md border text-xs font-semibold',
              i.result === 'na' ? 'bg-slate-500 text-white border-slate-500' : 'border-border', !editable && 'opacity-40')}>
            {label('opsResult', 'na')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {RESULT_BUTTONS.map((b) => {
            const Icon = b.icon
            const active = i.result === b.value
            return (
              <button key={b.value} type="button" disabled={!editable} onClick={() => onSave({ result: b.value }, { result: b.value })}
                className={cn('h-11 rounded-md border text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors',
                  active ? b.active : 'border-border hover:bg-muted/50', !editable && !active && 'opacity-40',
                  !editable && 'cursor-default')}>
                <Icon className="size-4" /> {label('opsResult', b.value)}
              </button>
            )
          })}
        </div>
      )}

      {needsCorrective && (
        <div>
          <label className="block text-xs font-semibold text-red-700 mb-1" htmlFor={`ca-${i.id}`}>
            {t('ops.correctiveAction')} <span aria-hidden>*</span>
          </label>
          <textarea id={`ca-${i.id}`} value={corrective} disabled={!editable} rows={2}
            onChange={(e) => setCorrective(e.target.value)}
            onBlur={() => corrective !== (i.correctiveAction ?? '') && onSave({ correctiveAction: corrective }, { correctiveAction: corrective })}
            placeholder={t('ops.correctivePlaceholder')}
            className="w-full px-2.5 py-1.5 rounded-md border border-red-300 bg-background text-sm disabled:opacity-70" />
        </div>
      )}

      {(editable || i.notes) && (livePreview === 'fail' || i.notes) && (
        <textarea value={notes} disabled={!editable} rows={2}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== i.notes && onSave({ notes }, { notes })}
          placeholder={t('ops.failNotes')} aria-label={t('common.notes')}
          className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm disabled:opacity-70" />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {i.photos.map((p) => (
          <AuthedImage key={p.id} path={p.thumbnailUrl} alt={i.title} className="size-14 rounded-md object-cover border border-border" />
        ))}
        {queuedPhotos > 0 && (
          <span className="size-14 rounded-md border border-dashed border-border text-[10px] text-muted-foreground flex items-center justify-center text-center px-1">
            {t('ops.queuedPhotos', { count: queuedPhotos })}
          </span>
        )}
        {editable && (
          <label className="size-14 rounded-md border border-dashed border-border flex flex-col items-center justify-center text-[10px] text-muted-foreground cursor-pointer hover:bg-muted/50">
            <Camera className="size-4" /> {t('ops.addPhoto')}
            <input type="file" accept="image/*" capture="environment" className="hidden" aria-label={t('ops.addPhoto')}
              onChange={(e) => { const file = e.target.files?.[0]; if (file) onPhoto(file); e.target.value = '' }} />
          </label>
        )}
        {i.issueNumber && (
          <span className="text-[11px] text-red-700 flex items-center gap-1 ml-auto">
            <AlertTriangle className="size-3" /> {t('ops.issueRaised', { number: i.issueNumber })}
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
  const { t } = useT()
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={t('ops.runnerTitle')}
        className="fixed inset-y-0 right-0 w-full sm:max-w-xl bg-background border-l border-border shadow-lg z-50 overflow-y-auto">
        <button onClick={onClose} className="absolute right-3 top-3 z-20 p-1 text-muted-foreground hover:text-foreground" aria-label={t('common.close')}>
          <X className="size-5" />
        </button>
        {children}
      </div>
    </>
  )
}
