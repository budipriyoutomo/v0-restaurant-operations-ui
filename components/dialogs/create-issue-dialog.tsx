'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { X, CheckSquare, CheckCircle2, Sparkles, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { newKey } from '@/lib/offline-queue'
import { CATEGORY_DEFAULTS, CreateIssueInput, IssueCategory, Priority, Asset } from '@/lib/types'

interface CreateIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Outlet names from store.outlets — an empty list switches to free-text entry */
  outlets?: string[]
  /** Assignee names from store.pics — always includes 'Unassigned' at minimum */
  assignees?: string[]
  /** Assets from store — shown in WO asset selector when Maintenance category */
  assets?: Asset[]
  /** Pre-select a category and lock the selector */
  defaultCategory?: IssueCategory
  /** Effective WO approval threshold (IDR) per outlet name (Todo-Pilot §5).
   *  Outlets not listed use DEFAULT_APPROVAL_THRESHOLD. */
  approvalThresholds?: Record<string, number>
  onSubmit: (input: CreateIssueInput) => Promise<void> | void
}

const CATEGORIES: IssueCategory[] = [
  'Maintenance', 'IT Support', 'Compliance', 'Training', 'Procurement', 'Marketing', 'Asset Purchase', 'Guest Service', 'Other',
]
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']

// Mirrors backend settings.APPROVAL_THRESHOLD_DEFAULT; the backend decides.
export const DEFAULT_APPROVAL_THRESHOLD = 1_000_000

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

export function CreateIssueDialog({ open, onOpenChange, outlets, assignees, assets, defaultCategory, approvalThresholds, onSubmit }: CreateIssueDialogProps) {
  const id = useId()
  const outletOptions   = outlets ?? []
  const assigneeOptions = assignees && assignees.length > 0 ? assignees : ['Unassigned']

  const [form, setForm] = useState({
    title: '',
    description: '',
    outlet: outletOptions[0] ?? '',
    category: (defaultCategory ?? 'Maintenance') as IssueCategory,
    priority: 'medium' as Priority,
    assignee: 'Unassigned',
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

  const isMaintenance = form.category === 'Maintenance'
  const threshold = approvalThresholds?.[form.outlet] ?? DEFAULT_APPROVAL_THRESHOLD
  // Strictly above, like backend work_order_service.needs_approval.
  const needsApproval = form.estimatedCost !== '' && Number(form.estimatedCost) > threshold

  // Reset form when dialog opens, using current outlet/assignee options
  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        description: '',
        outlet: outletOptions[0] ?? '',
        category: defaultCategory ?? 'Maintenance',
        priority: 'medium',
        assignee: 'Unassigned',
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
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Smart default: whenever category changes (and user hasn't manually
  // overridden the toggles yet), pre-fill Task/Approval suggestions.
  useEffect(() => {
    if (!touchedToggles) {
      const defaults = CATEGORY_DEFAULTS[form.category]
      setGenerateTask(defaults.task)
      setGenerateApproval(defaults.approval)
    }
  }, [form.category, touchedToggles])

  const isComplete = form.title.trim() && form.description.trim() && form.dueDate && form.outlet

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isComplete || submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit({
        title: form.title,
        description: form.description,
        outlet: form.outlet,
        category: form.category,
        priority: form.priority,
        assignee: form.assignee,
        dueDate: form.dueDate,
        generateTask,
        generateApproval,
        approvalAmount: generateApproval && form.approvalAmount ? Math.round(Number(form.approvalAmount)) : undefined,
        generateWorkOrder: isMaintenance && generateWorkOrder,
        assetId: isMaintenance && generateWorkOrder && form.assetId ? form.assetId : undefined,
        estimatedCost: isMaintenance && generateWorkOrder && form.estimatedCost
          ? Math.round(Number(form.estimatedCost)) : undefined,
        idempotencyKey,
      })
      onOpenChange(false)
    } catch (err) {
      // Stay open with everything typed; a retry reuses the same idempotency key.
      setSubmitError(apiErrorMessage(err, 'Failed to create issue.'))
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <h2 className="text-lg font-bold">New Issue</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => !isSubmitting && onOpenChange(false)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor={`${id}-title`} className="block text-sm font-semibold mb-1.5">Title <span className="text-destructive">*</span></label>
            <input
              id={`${id}-title`} type="text" name="title" placeholder="Brief description of the issue"
              value={form.title} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor={`${id}-description`} className="block text-sm font-semibold mb-1.5">Description <span className="text-destructive">*</span></label>
            <textarea
              id={`${id}-description`} name="description" placeholder="Detailed explanation of the issue"
              value={form.description} onChange={handleChange} rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Outlet */}
          <div>
            <label htmlFor={`${id}-outlet`} className="block text-sm font-semibold mb-1.5">
              Outlet
              {outlets && outlets.length === 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(add outlets in Master Data)</span>
              )}
            </label>
            {outletOptions.length === 0 ? (
              <input
                id={`${id}-outlet`} type="text" name="outlet" placeholder="Enter outlet name"
                value={form.outlet} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <select id={`${id}-outlet`} name="outlet" value={form.outlet} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {outletOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor={`${id}-category`} className="block text-sm font-semibold mb-1.5">Category</label>
            {defaultCategory ? (
              <div id={`${id}-category`} role="textbox" aria-readonly="true"
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                {defaultCategory}
              </div>
            ) : (
              <select id={`${id}-category`} name="category" value={form.category} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {/* Priority */}
          <div>
            <label htmlFor={`${id}-priority`} className="block text-sm font-semibold mb-1.5">Priority</label>
            <select id={`${id}-priority`} name="priority" value={form.priority} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>

          {/* Assign To */}
          <div>
            <label htmlFor={`${id}-assignee`} className="block text-sm font-semibold mb-1.5">
              Assign To
              {assignees && assignees.length === 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(add PICs in Master Data)</span>
              )}
            </label>
            <select id={`${id}-assignee`} name="assignee" value={form.assignee} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {assigneeOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor={`${id}-dueDate`} className="block text-sm font-semibold mb-1.5">Due Date <span className="text-destructive">*</span></label>
            <input
              id={`${id}-dueDate`} type="date" name="dueDate" value={form.dueDate} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Auto-generation section */}
          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center gap-1.5 pt-3">
              <Sparkles className="size-3.5 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Auto-generate to other modules
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={generateTask}
                onChange={(e) => { setTouchedToggles(true); setGenerateTask(e.target.checked) }}
                className="mt-0.5 size-4 accent-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <CheckSquare className="size-3.5" /> Create Task in Task Center
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Adds a tracked task assigned to the same person, linked back to this issue.</p>
              </div>
            </label>

            {/* Work Order toggle — Maintenance category only */}
            {isMaintenance && (
              <>
                <label className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={generateWorkOrder}
                    onChange={(e) => { setTouchedToggles(true); setGenerateWorkOrder(e.target.checked) }}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Wrench className="size-3.5" /> Create Work Order (CMMS)
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generates a corrective WO in the CMMS module. If estimated cost &gt; {rupiah(threshold)} ({form.outlet || 'this outlet'}), an approval will be required.
                    </p>
                  </div>
                </label>

                {generateWorkOrder && (
                  <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                    <div>
                      <label htmlFor={`${id}-asset`} className="block text-sm font-semibold mb-1.5">Asset</label>
                      {assets && assets.length > 0 ? (
                        <select
                          id={`${id}-asset`}
                          name="assetId"
                          value={form.assetId}
                          onChange={handleChange}
                          className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="">— Select asset —</option>
                          {assets.map((a) => (
                            <option key={a.id} value={a.id}>{a.name} ({a.number})</option>
                          ))}
                        </select>
                      ) : (
                        // No free-text box here on purpose: assetId is a UUID
                        // foreign key, so an asset *name* typed in by hand can
                        // only ever be rejected by the server.
                        <p className="px-3 py-2 rounded-md border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                          No assets registered yet — add them under Assets → Physical
                          Assets. The work order will still be created, just without
                          an asset link.
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor={`${id}-estimatedCost`} className="block text-sm font-semibold mb-1.5">Estimated Cost (Rp)</label>
                      <input
                        id={`${id}-estimatedCost`}
                        type="number"
                        name="estimatedCost"
                        placeholder="e.g. 1500000"
                        value={form.estimatedCost}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      {needsApproval && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠ Above {rupiah(threshold)} — 2-step approval will be created automatically.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <label className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={generateApproval}
                onChange={(e) => { setTouchedToggles(true); setGenerateApproval(e.target.checked) }}
                className="mt-0.5 size-4 accent-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <CheckCircle2 className="size-3.5" /> Send to Approval Center
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Routes this issue for management sign-off (budget, vendor, or resource approval).</p>
              </div>
            </label>

            {generateApproval && (
              <div>
                <label htmlFor={`${id}-approvalAmount`} className="block text-sm font-semibold mb-1.5">Estimated Amount in IDR (optional)</label>
                <input
                  id={`${id}-approvalAmount`}
                  type="number" name="approvalAmount" placeholder="e.g. 12000000"
                  value={form.approvalAmount} onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}
          </div>

          {submitError && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => !isSubmitting && onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isComplete || isSubmitting}
              className={cn(
                'flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors',
                isComplete && !isSubmitting
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSubmitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
