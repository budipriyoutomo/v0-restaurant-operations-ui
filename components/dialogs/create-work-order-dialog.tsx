'use client'

import { useEffect, useId, useState, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Asset, CreateWorkOrderInput, Priority, WorkOrderType } from '@/lib/types'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { useT } from '@/lib/i18n'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

interface CreateWorkOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assets: Asset[]
  /** Pre-select asset when opening from an asset detail panel */
  defaultAssetId?: string
  /** Pre-link to an issue when opening from Maintenance page (Phase 7) */
  defaultIssueId?: string
  defaultIssueNumber?: string
  onSubmit: (input: CreateWorkOrderInput) => Promise<void>
}

const WO_TYPES: WorkOrderType[] = ['corrective', 'preventive']

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']

const defaultForm = {
  assetId: '',
  type: 'corrective' as WorkOrderType,
  title: '',
  description: '',
  priority: 'medium' as Priority,
  assignee: 'Unassigned',
  assigneeUserId: null as string | null,   // a user of the asset's outlet (Todo-Pilot §17)
  scheduledDate: '',
}

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
  assets,
  defaultAssetId,
  defaultIssueId,
  defaultIssueNumber,
  onSubmit,
}: CreateWorkOrderDialogProps) {
  const id = useId()
  const { t, label } = useT()
  const [form, setForm] = useState({
    ...defaultForm,
    assetId: defaultAssetId ?? assets[0]?.id ?? '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm({
        ...defaultForm,
        assetId: defaultAssetId ?? assets[0]?.id ?? '',
      })
      setError(null)
      setIsSubmitting(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedAsset = assets.find((a) => a.id === form.assetId)
  const isComplete = form.assetId && form.title.trim()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    // Another asset may sit in another outlet with other people: pick again.
    if (name === 'assetId') {
      setForm((prev) => ({ ...prev, assetId: value, assignee: 'Unassigned', assigneeUserId: null }))
      return
    }
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
        assigneeUserId: form.assigneeUserId,
        scheduledDate: form.scheduledDate || undefined,
        issueId:      defaultIssueId,
        issueNumber:  defaultIssueNumber,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createWo.failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, () => { if (!isSubmitting) onOpenChange(false) }, open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="create-wo-title"
        className="bg-background rounded-2xl border border-border shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <div>
            <h2 id="create-wo-title" className="text-lg font-bold">{t('createWo.title')}</h2>
            {defaultIssueNumber && (
              <p className="text-xs text-muted-foreground mt-0.5">{t('createWo.linkedTo')} <span className="font-mono font-semibold text-primary">{defaultIssueNumber}</span></p>
            )}
          </div>
          <button onClick={() => !isSubmitting && onOpenChange(false)} aria-label={t('common.close')} className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 hover:bg-muted rounded-lg transition-colors">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Asset */}
          <div>
            <label htmlFor={`${id}-asset`} className="block text-sm font-semibold mb-1.5">{t('createIssue.asset')} <span className="text-destructive">*</span></label>
            {assets.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                {t('createWo.noAssets')}
              </p>
            ) : (
              <select id={`${id}-asset`} name="assetId" value={form.assetId} onChange={handleChange}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40">
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} — {a.outlet}</option>
                ))}
              </select>
            )}
            {selectedAsset && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">{selectedAsset.number} · {selectedAsset.category}</p>
            )}
          </div>

          {/* Type toggle */}
          <div>
            <p className="block text-sm font-semibold mb-1.5">{t('common.type')}</p>
            <div className="grid grid-cols-2 gap-2">
              {WO_TYPES.map((type) => (
                <label
                  key={type}
                  className={cn(
                    'flex flex-col gap-0.5 p-3 rounded-lg border cursor-pointer transition-colors',
                    form.type === type
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/30'
                  )}
                >
                  <input
                    type="radio" name="type" value={type}
                    checked={form.type === type}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold">{label('woType', type)}</span>
                  <span className="text-xs text-muted-foreground">{t(type === 'corrective' ? 'createWo.correctiveHint' : 'createWo.preventiveHint')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor={`${id}-title`} className="block text-sm font-semibold mb-1.5">{t('common.title')} <span className="text-destructive">*</span></label>
            <input
              id={`${id}-title`} type="text" name="title"
              placeholder={form.type === 'preventive' ? t('createWo.titlePreventive') : t('createWo.titleCorrective')}
              value={form.title} onChange={handleChange}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor={`${id}-description`} className="block text-sm font-semibold mb-1.5">{t('common.description')}</label>
            <textarea
              id={`${id}-description`} name="description"
              placeholder={t('createWo.descriptionPlaceholder')}
              value={form.description} onChange={handleChange} rows={3}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 resize-none"
            />
          </div>

          {/* Priority + Assignee — two columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-priority`} className="block text-sm font-semibold mb-1.5">{t('common.priority')}</label>
              <select id={`${id}-priority`} name="priority" value={form.priority} onChange={handleChange}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{label('priority', p)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-assignee`} className="block text-sm font-semibold mb-1.5">{t('common.assignTo')}</label>
              {selectedAsset ? (
                <AssigneePicker
                  id={`${id}-assignee`}
                  outlet={selectedAsset.outlet}
                  value={form.assigneeUserId}
                  onChange={(userId, name) => setForm((prev) => ({ ...prev, assigneeUserId: userId, assignee: name }))}
                />
              ) : (
                <select id={`${id}-assignee`} disabled className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40">
                  <option>{t('createWo.pickAssetFirst')}</option>
                </select>
              )}
            </div>
          </div>

          {/* Scheduled Date */}
          <div>
            <label htmlFor={`${id}-scheduled`} className="block text-sm font-semibold mb-1.5">{t('createWo.scheduledDate')}</label>
            <input id={`${id}-scheduled`} type="date" name="scheduledDate" value={form.scheduledDate} onChange={handleChange}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40" />
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-background flex gap-3 py-4 border-t border-border">
            <button
              type="button" onClick={() => !isSubmitting && onOpenChange(false)} disabled={isSubmitting}
              className="flex-1 h-10 px-4 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-colors font-medium text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit" disabled={!isComplete || assets.length === 0 || isSubmitting}
              className={cn(
                'flex-1 h-10 px-4 rounded-lg font-semibold text-sm transition-colors',
                isComplete && assets.length > 0 && !isSubmitting
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSubmitting ? t('common.creating') : t('createWo.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
