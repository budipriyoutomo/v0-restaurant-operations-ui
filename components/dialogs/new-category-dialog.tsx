'use client'

import { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { CategoryType, MasterCategory } from '@/lib/types'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

interface NewCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: MasterCategory
  onSubmit?: (data: { name: string; description: string; type: CategoryType }) => Promise<void> | void
}

const types: CategoryType[] = ['operations', 'maintenance']
const defaultForm = { name: '', description: '', type: 'operations' as CategoryType }

export function NewCategoryDialog({ open, onOpenChange, initialData, onSubmit }: NewCategoryDialogProps) {
  const { t } = useT()
  const [formData, setFormData] = useState(defaultForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!initialData

  useEffect(() => {
    if (open) {
      setFormData(initialData
        ? { name: initialData.name, description: initialData.description, type: initialData.type }
        : defaultForm
      )
      setError(null)
    }
  }, [open, initialData])

  const isComplete = formData.name.trim() && formData.description.trim()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isComplete) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit?.(formData)
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="category-dialog-title"
        className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <h2 id="category-dialog-title" className="text-lg font-bold">{isEdit ? t('categoryDialog.edit') : t('categoryDialog.create')}</h2>
          <button
            onClick={() => onOpenChange(false)}
            aria-label={t('common.close')}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          <div>
            <label htmlFor="category-name" className="block text-sm font-semibold mb-1.5">{t('categoryDialog.name')} <span className="text-destructive">*</span></label>
            <input id="category-name"
              type="text"
              name="name"
              placeholder={t('categoryDialog.namePlaceholder')}
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label htmlFor="category-description" className="block text-sm font-semibold mb-1.5">{t('common.description')} <span className="text-destructive">*</span></label>
            <textarea id="category-description"
              name="description"
              placeholder={t('categoryDialog.descriptionPlaceholder')}
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div>
            <label htmlFor="category-type" className="block text-sm font-semibold mb-1.5">{t('common.type')}</label>
            <select id="category-type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {type === 'operations' ? t('masterData.typeOperations') : t('masterData.typeMaintenance')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors font-medium text-sm"
            >
              {t('common.cancel')}
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
              {isSubmitting ? t('common.saving') : isEdit ? t('procurement.saveChanges') : t('categoryDialog.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
