'use client'

import { useEffect, useState, useRef } from 'react'
import { Lock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { CATEGORY_MODULES } from '@/lib/categories'
import type { ApprovalType, CategoryModule, MasterCategory } from '@/lib/types'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'
import { CATEGORY_ICON_NAMES, CategoryIcon } from '@/components/shared/category-icon'

// Issue categories are master data (Todo-Ops-Checklist P1). The module decides
// behaviour; system categories can be renamed but keep their module and stay active.
export interface CategoryFormData {
  name: string
  description: string
  module: CategoryModule
  icon: string | null
  defaultGenerateTask: boolean
  defaultGenerateApproval: boolean
  approvalType: ApprovalType | null
  isActive: boolean
}

interface NewCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: MasterCategory
  onSubmit?: (data: CategoryFormData) => Promise<void> | void
}

const APPROVAL_TYPES: ApprovalType[] = ['procurement', 'marketing', 'training', 'asset-purchase', 'maintenance']

const defaultForm: CategoryFormData = {
  name: '', description: '', module: 'general', icon: null,
  defaultGenerateTask: true, defaultGenerateApproval: false, approvalType: null, isActive: true,
}

const fieldClass = 'w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40'

export function NewCategoryDialog({ open, onOpenChange, initialData, onSubmit }: NewCategoryDialogProps) {
  const { t, label } = useT()
  const [formData, setFormData] = useState<CategoryFormData>(defaultForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!initialData
  const isSystem = !!initialData?.isSystem

  useEffect(() => {
    if (open) {
      setFormData(initialData
        ? {
            name: initialData.name, description: initialData.description, module: initialData.module,
            icon: initialData.icon, defaultGenerateTask: initialData.defaultGenerateTask,
            defaultGenerateApproval: initialData.defaultGenerateApproval, approvalType: initialData.approvalType,
            isActive: initialData.isActive,
          }
        : defaultForm
      )
      setError(null)
    }
  }, [open, initialData])

  const isComplete = Boolean(formData.name.trim())
  const set = <K extends keyof CategoryFormData>(key: K, value: CategoryFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isComplete) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit?.({ ...formData, name: formData.name.trim() })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, () => onOpenChange(false), open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="category-dialog-title"
        className="bg-background rounded-2xl border border-border shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <h2 id="category-dialog-title" className="text-lg font-bold">{isEdit ? t('categoryDialog.edit') : t('categoryDialog.create')}</h2>
          <button
            onClick={() => onOpenChange(false)}
            aria-label={t('common.close')}
            className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          {isSystem && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
              <Lock className="size-3.5 mt-0.5 shrink-0" aria-hidden /> {t('categoryDialog.systemLocked')}
            </p>
          )}

          <div>
            <label htmlFor="category-name" className="block text-sm font-semibold mb-1.5">{t('categoryDialog.name')} <span className="text-destructive">*</span></label>
            <input id="category-name" type="text" name="name" placeholder={t('categoryDialog.namePlaceholder')}
              value={formData.name} onChange={(e) => set('name', e.target.value)} className={fieldClass} />
          </div>

          <div>
            <label htmlFor="category-description" className="block text-sm font-semibold mb-1.5">{t('common.description')}</label>
            <textarea id="category-description" name="description" placeholder={t('categoryDialog.descriptionPlaceholder')}
              value={formData.description} onChange={(e) => set('description', e.target.value)} rows={2}
              className={cn(fieldClass, 'resize-none')} />
          </div>

          <div>
            <label htmlFor="category-module" className="block text-sm font-semibold mb-1.5">{t('categoryDialog.module')}</label>
            <select id="category-module" name="module" value={formData.module} disabled={isSystem}
              onChange={(e) => set('module', e.target.value as CategoryModule)}
              className={cn(fieldClass, isSystem && 'opacity-60 cursor-not-allowed')}>
              {CATEGORY_MODULES.map((m) => <option key={m} value={m}>{label('categoryModule', m)}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-1">{t('categoryDialog.moduleHint')}</p>
          </div>

          <fieldset>
            <legend className="block text-sm font-semibold mb-1.5">{t('categoryDialog.icon')}</legend>
            <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
              {CATEGORY_ICON_NAMES.map((name) => {
                const on = formData.icon === name
                return (
                  <label key={name} title={name} className={cn(
                    'flex items-center justify-center size-9 rounded-lg border cursor-pointer transition-colors',
                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50',
                    on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/40')}>
                    <input type="radio" name="icon" value={name} checked={on} onChange={() => set('icon', name)}
                      className="sr-only" aria-label={name} />
                    <CategoryIcon name={name} className="size-4" />
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="block text-sm font-semibold mb-1.5">{t('categoryDialog.defaults')}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.defaultGenerateTask} className="size-4 accent-primary"
                onChange={(e) => set('defaultGenerateTask', e.target.checked)} />
              {t('categoryDialog.defaultTask')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.defaultGenerateApproval} className="size-4 accent-primary"
                onChange={(e) => set('defaultGenerateApproval', e.target.checked)} />
              {t('categoryDialog.defaultApproval')}
            </label>
          </fieldset>

          <div>
            <label htmlFor="category-approval-type" className="block text-sm font-semibold mb-1.5">{t('categoryDialog.approvalType')}</label>
            <select id="category-approval-type" value={formData.approvalType ?? ''}
              onChange={(e) => set('approvalType', (e.target.value || null) as ApprovalType | null)} className={fieldClass}>
              <option value="">{t('categoryDialog.approvalTypeDefault')}</option>
              {APPROVAL_TYPES.map((a) => <option key={a} value={a}>{label('approvalType', a)}</option>)}
            </select>
          </div>

          {isEdit && (
            <label className={cn('flex items-start gap-2 text-sm', isSystem && 'opacity-60 cursor-not-allowed')}>
              <input type="checkbox" checked={formData.isActive} disabled={isSystem} className="size-4 mt-0.5 accent-primary"
                onChange={(e) => set('isActive', e.target.checked)} />
              <span>
                {t('categoryDialog.active')}
                <span className="block text-xs text-muted-foreground">{t('categoryDialog.activeHint')}</span>
              </span>
            </label>
          )}

          <div className="sticky bottom-0 bg-background flex gap-3 py-4 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 h-10 px-4 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-colors font-medium text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!isComplete || isSubmitting}
              className={cn(
                'flex-1 h-10 px-4 rounded-lg font-semibold text-sm transition-colors',
                isComplete && !isSubmitting
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSubmitting ? t('common.saving') : isEdit ? t('procurement.saveChanges') : t('categoryDialog.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
