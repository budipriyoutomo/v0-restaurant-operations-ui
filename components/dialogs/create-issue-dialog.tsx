'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  X, CheckSquare, CheckCircle2, CloudUpload, Sparkles, Wrench, Camera, QrCode, MessageCircle, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage, QueuedError } from '@/lib/api-client'
import { newKey } from '@/lib/offline-queue'
import type { CategorySystemKey, CreateIssueInput, Priority, Asset, QRResolveResult } from '@/lib/types'
import { activeCategories, allowsWorkOrder, categoryBySystemKey, defaultsFor } from '@/lib/categories'
import { useIssueStore } from '@/lib/store'
import { CategoryIcon } from '@/components/shared/category-icon'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { ScanTab } from '@/components/cmms/qr-dialog'
import { useT } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'
import { Select } from '@/components/shared/select'

interface CreateIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Outlet names from store.outlets — an empty list switches to free-text entry */
  outlets?: string[]
  /** Assets from store — shown in WO asset selector when Maintenance category */
  assets?: Asset[]
  /** Pre-select this system category (P1: categories are master data). The
   *  picker then offers only the categories of its module — e.g. Maintenance,
   *  HVAC, Plumbing on the Maintenance page — and is read-only when that is one. */
  defaultSystemKey?: CategorySystemKey
  /** Effective WO approval threshold (IDR) per outlet name (Todo-Pilot §5).
   *  Outlets not listed use DEFAULT_APPROVAL_THRESHOLD. */
  approvalThresholds?: Record<string, number>
  /** Returns the created issue so a photo can be attached to it. */
  onSubmit: (input: CreateIssueInput) => Promise<{ id: string; number: string } | void> | void
  /** Quick report (Todo-Pilot §20): for roles without issues:manage — title,
   *  category, photo; no due date, toggles, cost or assignee; ends on a
   *  confirmation with the issue number instead of closing. */
  quick?: boolean
  /** The reporter gets WhatsApp updates (has a number on file). */
  whatsappOptIn?: boolean
  /** Upload the chosen photo to the created issue, or — `{ afterKey }` — queue it
   *  behind a report saved offline (offline queue — may throw QueuedError). */
  onUploadPhoto?: (issue: string | { afterKey: string }, file: File) => Promise<unknown>
  /** Enables "Scan asset QR". */
  resolveQr?: (token: string) => Promise<QRResolveResult>
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']

// Mirrors backend settings.APPROVAL_THRESHOLD_DEFAULT; the backend decides.
export const DEFAULT_APPROVAL_THRESHOLD = 1_000_000

const rupiah = (n: number) => formatMoney(n)

const COMMON_CATEGORIES = 5

// Quick due dates (Todo-Modern-UI Fase 3): days from today, local calendar.
const DUE_QUICK = [['dueToday', 0], ['dueTomorrow', 1], ['dueIn3', 3], ['dueIn7', 7]] as const
export function dayFromToday(days: number, today: Date = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Tiles and segmented choices share one look (Todo-Pilot §20 tiles, for every role now).
const choice = (on: boolean) => cn(
  'relative flex items-center justify-center rounded-lg border text-center text-xs font-medium cursor-pointer transition-colors',
  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50',
  on ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/40')
const fieldLabel = 'block text-sm font-semibold mb-1.5'
const input = 'w-full min-h-10 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40'

export function CreateIssueDialog({
  open, onOpenChange, outlets, assets, defaultSystemKey, approvalThresholds, onSubmit,
  quick = false, whatsappOptIn = false, onUploadPhoto, resolveQr,
}: CreateIssueDialogProps) {
  const id = useId()
  const { t, label } = useT()
  const outletOptions   = outlets ?? []
  // Categories are master data (P1). A page pinned to one module offers only
  // that module's categories; the default is its system category.
  const allCategories = useIssueStore((s) => s.categories)
  const pinned = defaultSystemKey ? categoryBySystemKey(allCategories, defaultSystemKey) : undefined
  const categoryOptions = activeCategories(allCategories).filter((c) => !pinned || c.module === pinned.module)
  const defaultCategoryId = (pinned ?? categoryBySystemKey(categoryOptions, 'maintenance') ?? categoryOptions[0])?.id ?? ''

  const [form, setForm] = useState({
    title: '',
    description: '',
    outlet: outletOptions[0] ?? '',
    category: defaultCategoryId,   // category id
    priority: 'medium' as Priority,
    assignee: 'Unassigned',
    assigneeUserId: null as string | null,   // a user, not a name (Todo-Pilot §17)
    dueDate: '',
    approvalAmount: '',
    assetId: '',
    estimatedCost: '',
  })
  const [generateTask, setGenerateTask] = useState(true)
  const [generateApproval, setGenerateApproval] = useState(false)
  const [generateWorkOrder, setGenerateWorkOrder] = useState(false)
  const [touchedToggles, setTouchedToggles] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // State updates are async: two submits in the same tick both see
  // isSubmitting === false. The ref closes that window.
  const submittingRef = useRef(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // One Idempotency-Key per opening: a double submit or a retry after a lost
  // response replays the same create instead of making a second Issue.
  const [idempotencyKey, setIdempotencyKey] = useState(newKey)
  const [photo, setPhoto] = useState<File | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [scannedAsset, setScannedAsset] = useState<string | null>(null)
  // Everything not required is folded under "Detail lain" (Todo-Modern-UI Fase 3).
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [allCategoriesOpen, setAllCategoriesOpen] = useState(false)
  // Quick report ends on a confirmation (Todo-Pilot §20).
  // `queued`: no signal — the report waits on the device (Todo-PWA).
  const [sent, setSent] = useState<{ number: string; outlet: string; photo: 'queued' | 'failed' | null; queued?: boolean } | null>(null)

  const selectedCategory = categoryOptions.find((c) => c.id === form.category)
  // A company may have many categories: the common ones (system order) and
  // "Other" first, the chosen one always, the rest behind one tap — so the
  // required fields stay on the first screen (Todo-Modern-UI Fase 3).
  const commonCategories = categoryOptions.filter((c, i) => i < COMMON_CATEGORIES || c.systemKey === 'other' || c.id === form.category)
  const shownCategories = allCategoriesOpen ? categoryOptions : commonCategories
  const hiddenCategoryCount = categoryOptions.length - commonCategories.length
  const isMaintenance = allowsWorkOrder(selectedCategory?.module)
  const threshold = approvalThresholds?.[form.outlet] ?? DEFAULT_APPROVAL_THRESHOLD
  // Strictly above, like backend work_order_service.needs_approval.
  const needsApproval = form.estimatedCost !== '' && Number(form.estimatedCost) > threshold

  const reset = () => {
      setForm({
        title: '',
        description: '',
        outlet: outletOptions[0] ?? '',
        category: defaultCategoryId,
        priority: 'medium',
        assignee: 'Unassigned',
        assigneeUserId: null,
        dueDate: '',
        approvalAmount: '',
        assetId: '',
        estimatedCost: '',
      })
      setGenerateWorkOrder(false)
      setTouchedToggles(false)
      setIsSubmitting(false)
      setSubmitError(null)
      setIdempotencyKey(newKey())
      setPhoto(null)
      setScanOpen(false)
      setScannedAsset(null)
      setDetailsOpen(false)
      setAllCategoriesOpen(false)
      setSent(null)
  }

  // Reset form when dialog opens, using current outlet/assignee options
  useEffect(() => {
    if (open) reset()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Master data may arrive after the dialog opened.
  useEffect(() => {
    if (!form.category && defaultCategoryId) setForm((prev) => ({ ...prev, category: defaultCategoryId }))
  }, [defaultCategoryId]) // eslint-disable-line react-hooks/exhaustive-deps
  const firstOutlet = outletOptions[0] ?? ''
  useEffect(() => {
    if (!form.outlet && firstOutlet) setForm((prev) => ({ ...prev, outlet: firstOutlet }))
  }, [firstOutlet]) // eslint-disable-line react-hooks/exhaustive-deps

  // Smart default: whenever category changes (and user hasn't manually
  // overridden the toggles yet), pre-fill Task/Approval suggestions from the
  // category's own defaults (editable in Master Data).
  useEffect(() => {
    if (!touchedToggles) {
      const defaults = defaultsFor(selectedCategory)
      setGenerateTask(defaults.task)
      setGenerateApproval(defaults.approval)
    }
  }, [form.category, selectedCategory?.defaultGenerateTask, selectedCategory?.defaultGenerateApproval, touchedToggles]) // eslint-disable-line react-hooks/exhaustive-deps

  // The minimum (Todo-Modern-UI Fase 3): title, outlet, category, and — when
  // a manager files it — a due date, since lateness is counted from it. The
  // description is optional, as in the API. A disabled button names what is missing.
  const missing = [
    !form.title.trim() && t('createIssue.missingTitle'),
    !form.outlet && t('createIssue.missingOutlet'),
    !selectedCategory && t('createIssue.missingCategory'),
    !quick && !form.dueDate && t('createIssue.missingDue'),
  ].filter((m): m is string => Boolean(m))
  const isComplete = missing.length === 0
  const willCreate = [
    generateTask && t('createIssue.itemTask'),
    isMaintenance && generateWorkOrder && t('createIssue.itemWo'),
    generateApproval && t('createIssue.itemApproval'),
  ].filter((m): m is string => Boolean(m))

  // A scanned asset sticker fills in where and what (Todo-Pilot §20).
  const handleQr = ({ asset }: QRResolveResult) => {
    // An asset problem is a maintenance one unless the page is pinned elsewhere.
    const scannedCategoryId = pinned ? defaultCategoryId
      : (categoryBySystemKey(categoryOptions, 'maintenance')?.id ?? defaultCategoryId)
    setScanOpen(false)
    setDetailsOpen(true)   // the description and the work order it filled in
    setScannedAsset(`${asset.name} (${asset.number})`)
    setForm((prev) => {
      const outlet = outletOptions.includes(asset.outlet) ? asset.outlet : prev.outlet
      const moved = outlet !== prev.outlet
      return {
        ...prev,
        outlet,
        ...(moved ? { assignee: 'Unassigned', assigneeUserId: null } : {}),
        category: scannedCategoryId,
        description: prev.description.trim() ? prev.description : `${asset.name} (${asset.number}): `,
        assetId: asset.id,
      }
    })
    if (!quick && allowsWorkOrder(categoryOptions.find((c) => c.id === scannedCategoryId)?.module)) {
      setTouchedToggles(true)
      setGenerateWorkOrder(true)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    // Another outlet has other people: the assignee must be picked again.
    if (name === 'outlet') {
      setForm((prev) => ({ ...prev, outlet: value, assignee: 'Unassigned', assigneeUserId: null }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isComplete || submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    let created: { id: string; number: string } | void
    try {
      const withWo = !quick && isMaintenance && generateWorkOrder
      created = await onSubmit({
        title: form.title,
        description: form.description,
        outlet: form.outlet,
        category: selectedCategory?.name ?? '',
        categoryId: selectedCategory?.id,
        priority: form.priority,
        assignee: quick ? 'Unassigned' : form.assignee,
        assigneeUserId: quick ? null : form.assigneeUserId,
        dueDate: quick ? '' : form.dueDate,
        generateTask,
        // Staff cannot name an amount; approvals are the manager's call.
        generateApproval: !quick && generateApproval,
        approvalAmount: !quick && generateApproval && form.approvalAmount ? Math.round(Number(form.approvalAmount)) : undefined,
        generateWorkOrder: withWo,
        assetId: withWo && form.assetId ? form.assetId : undefined,
        estimatedCost: withWo && form.estimatedCost ? Math.round(Number(form.estimatedCost)) : undefined,
        idempotencyKey,
      })
    } catch (err) {
      if (err instanceof QueuedError) {
        // No signal: the report is saved on this device and sends itself; the
        // photo waits for it in the same queue.
        if (photo && onUploadPhoto) await onUploadPhoto({ afterKey: idempotencyKey }, photo).catch(() => {})
        if (quick) setSent({ number: '', outlet: form.outlet, photo: photo ? 'queued' : null, queued: true })
        else { toast.info(t('createIssue.queuedTitle'), { description: t('createIssue.queuedHint') }); onOpenChange(false) }
      } else {
        // Stay open with everything typed; a retry reuses the same idempotency key.
        setSubmitError(apiErrorMessage(err, t('createIssue.failed')))
      }
      submittingRef.current = false
      setIsSubmitting(false)
      return
    }
    try {
      // The issue exists now; a photo problem must not look like a failed report.
      let photoState: 'queued' | 'failed' | null = null
      if (photo && created && onUploadPhoto) {
        try {
          await onUploadPhoto(created.id, photo)
        } catch (err) {
          photoState = err instanceof QueuedError ? 'queued' : 'failed'
        }
      }
      if (quick) {
        setSent({ number: created ? created.number : '', outlet: form.outlet, photo: photoState })
      } else {
        if (photoState === 'queued') toast.info(t('createIssue.photoQueued'))
        if (photoState === 'failed') toast.error(t('createIssue.photoFailed'))
        onOpenChange(false)
      }
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, () => { if (!isSubmitting) onOpenChange(false) }, open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-heading`}
        className="bg-background rounded-2xl border border-border shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <h2 id={`${id}-heading`} className="text-lg font-bold">{quick ? t('createIssue.quickTitle') : t('createIssue.title')}</h2>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => !isSubmitting && onOpenChange(false)}
            className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {sent ? (
          <div className="p-6 space-y-4 text-center" role="status">
            {sent.queued ? (<>
              <CloudUpload className="size-12 text-warning mx-auto" />
              <p className="text-lg font-bold">{t('createIssue.queuedTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('createIssue.queuedHint')}</p>
            </>) : (<>
              <CheckCircle2 className="size-12 text-success mx-auto" />
              <p className="text-lg font-bold">{t('createIssue.sent', { number: sent.number })}</p>
              <p className="text-sm text-muted-foreground">{t('createIssue.sentHint', { outlet: sent.outlet })}</p>
            </>)}
            {whatsappOptIn && !sent.queued && (
              <p className="flex items-center justify-center gap-1.5 text-sm text-success">
                <MessageCircle className="size-4" /> {t('createIssue.whatsapp')}
              </p>
            )}
            {sent.photo === 'queued' && <p className="text-sm text-warning">{t('createIssue.photoQueued')}</p>}
            {sent.photo === 'failed' && <p className="text-sm text-destructive">{t('createIssue.photoFailed')}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={reset}
                className="flex-1 min-h-11 px-4 py-2 rounded-lg border border-border font-medium text-sm hover:bg-muted/50">
                {t('createIssue.reportAnother')}
              </button>
              <button type="button" onClick={() => onOpenChange(false)}
                className="flex-1 min-h-11 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90">
                {t('createIssue.done')}
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Asset QR sticker → outlet, description, asset (Todo-Pilot §20) */}
          {resolveQr && (
            <div>
              <button type="button" onClick={() => setScanOpen((v) => !v)} aria-expanded={scanOpen}
                className="w-full min-h-11 flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 text-sm font-medium text-primary hover:bg-primary/5">
                <QrCode className="size-4" /> {t('createIssue.scanQr')}
              </button>
              {scanOpen && <div className="mt-3"><ScanTab resolveQr={resolveQr} onResolved={handleQr} /></div>}
              {scannedAsset && !scanOpen && (
                <p className="mt-1.5 text-xs text-muted-foreground">{t('createIssue.assetPicked', { name: scannedAsset })}</p>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor={`${id}-title`} className={fieldLabel}>{t('common.title')} <span className="text-destructive">*</span></label>
            <input
              id={`${id}-title`} type="text" name="title" placeholder={t('createIssue.titlePlaceholder')}
              value={form.title} onChange={handleChange} className={input}
            />
          </div>

          {/* Category: big tap targets with an icon, for every role */}
          <div>
            <p id={`${id}-category-label`} className={fieldLabel}>{t('common.category')}</p>
            {pinned && categoryOptions.length <= 1 ? (
              <div role="textbox" aria-readonly="true" aria-labelledby={`${id}-category-label`}
                className={cn(input, 'text-muted-foreground')}>
                {label('category', pinned.name)}
              </div>
            ) : categoryOptions.length === 0 ? (
              <p role="textbox" aria-readonly="true" aria-labelledby={`${id}-category-label`} className={cn(input, 'text-muted-foreground')}>
                {t('createIssue.noCategories')}
              </p>
            ) : (
              <>
              <div role="radiogroup" aria-labelledby={`${id}-category-label`} className="grid grid-cols-3 gap-2">
                {shownCategories.map((c) => (
                  <label key={c.id} className={cn(choice(form.category === c.id), 'min-h-14 flex-col gap-1 p-2')}>
                    <input type="radio" name="category" value={c.id} checked={form.category === c.id} onChange={handleChange} className="sr-only" />
                    <CategoryIcon name={c.icon} className="size-5" />
                    {label('category', c.name)}
                  </label>
                ))}
              </div>
              {!allCategoriesOpen && hiddenCategoryCount > 0 && (
                <button type="button" onClick={() => setAllCategoriesOpen(true)}
                  className="mt-2 min-h-10 text-sm font-medium text-primary hover:underline">
                  {t('createIssue.moreCategories', { count: hiddenCategoryCount })}
                </button>
              )}
              </>
            )}
          </div>

          {/* Outlet */}
          <div>
            <label htmlFor={`${id}-outlet`} className={fieldLabel}>
              {t('common.outlet')}
              {!quick && outlets && outlets.length === 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">{t('createIssue.addOutletsHint')}</span>
              )}
            </label>
            {quick && outletOptions.length === 0 ? (
              // The server would refuse a typed name: staff only report for their own outlets.
              <p id={`${id}-outlet`} role="alert" className="px-3 py-2 rounded-lg border border-warning-mark/40 bg-warning-mark/10 text-sm text-warning">
                {/* Offline on a device that never loaded the outlets: not an access problem. */}
                {typeof navigator !== 'undefined' && !navigator.onLine ? t('createIssue.noOutletsOffline') : t('createIssue.noOutletAccess')}
              </p>
            ) : quick && outletOptions.length === 1 ? (
              // One outlet: nothing to choose (Todo-Pilot §20).
              <p id={`${id}-outlet`} className="px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm">{form.outlet}</p>
            ) : outletOptions.length === 0 ? (
              <input
                id={`${id}-outlet`} type="text" name="outlet" placeholder={t('createIssue.outletPlaceholder')}
                value={form.outlet} onChange={handleChange} className={input}
              />
            ) : (
              <Select id={`${id}-outlet`} name="outlet" value={form.outlet} onChange={handleChange} className="w-full">
                {outletOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            )}
          </div>

          {/* Priority: four choices, one tap — it orders "Paling mendesak" */}
          <div>
            <p id={`${id}-priority-label`} className={fieldLabel}>{t('common.priority')}</p>
            <div role="radiogroup" aria-labelledby={`${id}-priority-label`} className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => (
                <label key={p} className={cn(choice(form.priority === p), 'min-h-10 px-1')}>
                  <input type="radio" name="priority" value={p} checked={form.priority === p} onChange={handleChange} className="sr-only" />
                  {label('priority', p)}
                </label>
              ))}
            </div>
          </div>

          {/* Due date: lateness is counted from it, so a manager picks it on purpose */}
          {!quick && (
            <div>
              <label htmlFor={`${id}-dueDate`} className={fieldLabel}>{t('common.dueDate')} <span className="text-destructive">*</span></label>
              <div role="group" aria-label={t('createIssue.dueQuick')} className="grid grid-cols-4 gap-2 mb-2">
                {DUE_QUICK.map(([key, days]) => {
                  const value = dayFromToday(days)
                  return (
                    <button key={key} type="button" aria-pressed={form.dueDate === value}
                      onClick={() => setForm((prev) => ({ ...prev, dueDate: value }))}
                      className={cn(choice(form.dueDate === value), 'min-h-10 px-1')}>
                      {t(`createIssue.${key}`)}
                    </button>
                  )
                })}
              </div>
              <input id={`${id}-dueDate`} type="date" name="dueDate" value={form.dueDate} onChange={handleChange} className={input} />
            </div>
          )}

          {/* Photo (Todo-Pilot §20) — uploaded after the issue exists, through the offline queue */}
          {onUploadPhoto && (
            <div>
              <label htmlFor={`${id}-photo`} className={fieldLabel}>{t('createIssue.photo')}</label>
              {photo ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20 text-sm">
                  <Camera className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{photo.name}</span>
                  <button type="button" onClick={() => setPhoto(null)} aria-label={t('createIssue.removePhoto')}
                    className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 rounded-lg hover:bg-muted"><X className="size-4" /></button>
                </div>
              ) : (
                <input id={`${id}-photo`} type="file" accept="image/*" capture="environment"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  className="w-full text-sm file:mr-3 file:min-h-11 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-medium" />
              )}
              <p className="text-xs text-muted-foreground mt-1">{t('createIssue.photoHint')}</p>
            </div>
          )}

          {/* "Detail lain": optional fields, folded (Todo-Modern-UI Fase 3) */}
          <div className="border-t border-border pt-3">
            <button type="button" aria-expanded={detailsOpen} aria-controls={`${id}-details`}
              onClick={() => setDetailsOpen((v) => !v)}
              className="w-full min-h-10 flex items-center justify-between gap-2 text-sm font-semibold hover:text-primary">
              {t('createIssue.moreDetails')}
              <ChevronDown aria-hidden="true" className={cn('size-4 text-muted-foreground transition-transform', detailsOpen && 'rotate-180')} />
            </button>
            {/* Folded, the category's defaults still show: nothing is created silently. */}
            {!quick && !detailsOpen && (
              <p className="text-xs text-muted-foreground">
                {willCreate.length > 0 ? t('createIssue.willCreate', { items: willCreate.join(' · ') }) : t('createIssue.willCreateNone')}
              </p>
            )}
            {detailsOpen && (
              <div id={`${id}-details`} className="space-y-4 pt-2">
                {/* Description */}
                <div>
                  <label htmlFor={`${id}-description`} className={fieldLabel}>{t('createIssue.descriptionOptional')}</label>
                  <textarea
                    id={`${id}-description`} name="description" placeholder={t('createIssue.descriptionPlaceholder')}
                    value={form.description} onChange={handleChange} rows={3} className={cn(input, 'resize-none')}
                  />
                </div>

                {!quick && (<>
                {/* Assign To */}
                <div>
                  <label htmlFor={`${id}-assignee`} className={fieldLabel}>{t('common.assignTo')}</label>
                  <AssigneePicker
                    id={`${id}-assignee`}
                    outlet={form.outlet}
                    value={form.assigneeUserId}
                    onChange={(userId, name) => setForm((prev) => ({ ...prev, assigneeUserId: userId, assignee: name }))}
                  />
                </div>

                {/* Auto-generation section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('createIssue.autoGenerate')}
                    </p>
                  </div>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={generateTask}
                      onChange={(e) => { setTouchedToggles(true); setGenerateTask(e.target.checked) }}
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <CheckSquare className="size-3.5" /> {t('createIssue.createTask')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('createIssue.createTaskHint')}</p>
                    </div>
                  </label>

                  {/* Work Order toggle — Maintenance category only */}
                  {isMaintenance && (
                    <>
                      <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={generateWorkOrder}
                          onChange={(e) => { setTouchedToggles(true); setGenerateWorkOrder(e.target.checked) }}
                          className="mt-0.5 size-4 accent-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Wrench className="size-3.5" /> {t('createIssue.createWo')}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('createIssue.createWoHint', { threshold: rupiah(threshold), outlet: form.outlet || t('createIssue.thisOutlet') })}
                          </p>
                        </div>
                      </label>

                      {generateWorkOrder && (
                        <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                          <div>
                            <label htmlFor={`${id}-asset`} className={fieldLabel}>{t('createIssue.asset')}</label>
                            {assets && assets.length > 0 ? (
                              <Select id={`${id}-asset`} name="assetId" value={form.assetId} onChange={handleChange} className="w-full">
                                <option value="">{t('createIssue.selectAsset')}</option>
                                {assets.map((a) => (
                                  <option key={a.id} value={a.id}>{a.name} ({a.number})</option>
                                ))}
                              </Select>
                            ) : (
                              // No free-text box here on purpose: assetId is a UUID
                              // foreign key, so an asset *name* typed in by hand can
                              // only ever be rejected by the server.
                              <p className="px-3 py-2 rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                                {t('createIssue.noAssets')}
                              </p>
                            )}
                          </div>
                          <div>
                            <label htmlFor={`${id}-estimatedCost`} className={fieldLabel}>{t('createIssue.estimatedCost')}</label>
                            <input
                              id={`${id}-estimatedCost`} type="number" name="estimatedCost" placeholder={t('createIssue.costPlaceholder')}
                              value={form.estimatedCost} onChange={handleChange} className={input}
                            />
                            {needsApproval && (
                              <p className="text-xs text-warning mt-1">
                                {t('createIssue.needsApproval', { threshold: rupiah(threshold) })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={generateApproval}
                      onChange={(e) => { setTouchedToggles(true); setGenerateApproval(e.target.checked) }}
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <CheckCircle2 className="size-3.5" /> {t('createIssue.sendApproval')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('createIssue.sendApprovalHint')}</p>
                    </div>
                  </label>

                  {generateApproval && (
                    <div>
                      <label htmlFor={`${id}-approvalAmount`} className={fieldLabel}>{t('createIssue.approvalAmount')}</label>
                      <input
                        id={`${id}-approvalAmount`}
                        type="number" name="approvalAmount" placeholder={t('createIssue.amountPlaceholder')}
                        value={form.approvalAmount} onChange={handleChange} className={input}
                      />
                    </div>
                  )}
                </div>
                </>)}
              </div>
            )}
          </div>

          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          {/* Actions */}
          <div className="sticky bottom-0 bg-background py-4 border-t border-border space-y-2">
          {!isComplete && (
            <p id={`${id}-missing`} className="text-xs text-muted-foreground text-right">
              {t('createIssue.missing', { fields: missing.join(', ') })}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => !isSubmitting && onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 h-10 px-4 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-colors font-medium text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!isComplete || isSubmitting}
              aria-describedby={isComplete ? undefined : `${id}-missing`}
              className={cn(
                'flex-1 h-10 px-4 rounded-lg font-semibold text-sm transition-colors',
                isComplete && !isSubmitting
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSubmitting
                ? (quick ? t('createIssue.sending') : t('common.creating'))
                : (quick ? t('createIssue.submitQuick') : t('createIssue.submit'))}
            </button>
          </div>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
