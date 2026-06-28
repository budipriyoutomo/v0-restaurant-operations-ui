'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Asset, CreateWorkOrderInput, Priority, WorkOrderType } from '@/lib/types'

interface CreateWorkOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assets: Asset[]
  assignees: string[]
  /** Pre-select asset when opening from an asset detail panel */
  defaultAssetId?: string
  /** Pre-link to an issue when opening from Maintenance page (Phase 7) */
  defaultIssueId?: string
  defaultIssueNumber?: string
  onSubmit: (input: CreateWorkOrderInput) => Promise<void>
}

const WO_TYPES: { value: WorkOrderType; label: string; hint: string }[] = [
  { value: 'corrective',  label: 'Corrective',  hint: 'Repair or fix a broken/faulty asset' },
  { value: 'preventive',  label: 'Preventive',  hint: 'Scheduled maintenance to prevent failures' },
]

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']

const defaultForm = {
  assetId: '',
  type: 'corrective' as WorkOrderType,
  title: '',
  description: '',
  priority: 'medium' as Priority,
  assignee: 'Unassigned',
  scheduledDate: '',
}

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
  assets,
  assignees,
  defaultAssetId,
  defaultIssueId,
  defaultIssueNumber,
  onSubmit,
}: CreateWorkOrderDialogProps) {
  const [form, setForm] = useState({
    ...defaultForm,
    assetId: defaultAssetId ?? assets[0]?.id ?? '',
    assignee: assignees[0] ?? 'Unassigned',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm({
        ...defaultForm,
        assetId: defaultAssetId ?? assets[0]?.id ?? '',
        assignee: assignees[0] ?? 'Unassigned',
      })
      setError(null)
      setIsSubmitting(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedAsset = assets.find((a) => a.id === form.assetId)
  const isComplete = form.assetId && form.title.trim()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isComplete || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        assetId:      form.assetId,
        type:         form.type,
        title:        form.title.trim(),
        description:  form.description.trim() || undefined,
        priority:     form.priority,
        assignee:     form.assignee,
        scheduledDate: form.scheduledDate || undefined,
        issueId:      defaultIssueId,
        issueNumber:  defaultIssueNumber,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work order')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <div>
            <h2 className="text-lg font-bold">New Work Order</h2>
            {defaultIssueNumber && (
              <p className="text-xs text-muted-foreground mt-0.5">Linked to issue <span className="font-mono font-semibold text-primary">{defaultIssueNumber}</span></p>
            )}
          </div>
          <button onClick={() => !isSubmitting && onOpenChange(false)} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          {/* Asset */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Asset <span className="text-destructive">*</span></label>
            {assets.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-md">
                No assets registered yet. Register an asset first.
              </p>
            ) : (
              <select name="assetId" value={form.assetId} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} — {a.outlet}</option>
                ))}
              </select>
            )}
            {selectedAsset && (
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">{selectedAsset.number} · {selectedAsset.category}</p>
            )}
          </div>

          {/* Type toggle */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {WO_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    'flex flex-col gap-0.5 p-3 rounded-md border cursor-pointer transition-colors',
                    form.type === t.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/30'
                  )}
                >
                  <input
                    type="radio" name="type" value={t.value}
                    checked={form.type === t.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground">{t.hint}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Title <span className="text-destructive">*</span></label>
            <input
              type="text" name="title"
              placeholder={form.type === 'preventive' ? 'e.g. Monthly PM — AC Unit' : 'e.g. AC not cooling — unit 2B'}
              value={form.title} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Description</label>
            <textarea
              name="description"
              placeholder="Additional details, symptoms, or checklist items…"
              value={form.description} onChange={handleChange} rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Priority + Assignee — two columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Assign To</label>
              <select name="assignee" value={form.assignee} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="Unassigned">Unassigned</option>
                {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Scheduled Date</label>
            <input type="date" name="scheduledDate" value={form.scheduledDate} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button" onClick={() => !isSubmitting && onOpenChange(false)} disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={!isComplete || assets.length === 0 || isSubmitting}
              className={cn(
                'flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors',
                isComplete && assets.length > 0 && !isSubmitting
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSubmitting ? 'Creating…' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
