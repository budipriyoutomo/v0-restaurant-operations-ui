'use client'

import { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { AssignableUser, MasterCategory, PIC } from '@/lib/types'
import { useIssueStore } from '@/lib/store'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

interface NewPICDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: MasterCategory[]
  initialData?: PIC
  onSubmit?: (data: {
    name: string
    email: string
    phone: string
    department: string
    categories: string[]
    userId: string | null
  }) => Promise<void> | void
}

// Stored as these values; shown as t('picDialog.dept.<value>').
const departments = ['Engineering', 'Operations', 'Maintenance', 'Quality', 'Supply Chain', 'Finance'] as const
const defaultForm = { name: '', email: '', phone: '', department: 'Engineering', categories: [] as string[], userId: null as string | null }

export function NewPICDialog({ open, onOpenChange, categories, initialData, onSubmit }: NewPICDialogProps) {
  const { t } = useT()
  const [formData, setFormData] = useState(defaultForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!initialData
  // The PIC's account (P2): every active user of the company.
  const loadAssignableUsers = useIssueStore((s) => s.loadAssignableUsers)
  const [users, setUsers] = useState<AssignableUser[]>([])
  useEffect(() => {
    if (open) loadAssignableUsers('').then(setUsers).catch(() => setUsers([]))
  }, [open, loadAssignableUsers])

  useEffect(() => {
    if (open) {
      setFormData(initialData
        ? {
            name: initialData.name,
            email: initialData.email,
            phone: initialData.phone,
            department: initialData.department,
            categories: [...initialData.categories],
            userId: initialData.userId ?? null,
          }
        : defaultForm
      )
      setError(null)
    }
  }, [open, initialData])

  const isComplete = formData.name.trim() && formData.email.trim() && formData.phone.trim() && formData.categories.length > 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCategoryToggle = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }))
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="pic-dialog-title"
        className="bg-background rounded-2xl border border-border shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <h2 id="pic-dialog-title" className="text-lg font-bold">{isEdit ? t('picDialog.edit') : t('picDialog.create')}</h2>
          <button
            onClick={() => onOpenChange(false)}
            aria-label={t('common.close')}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label htmlFor="pic-name" className="block text-sm font-semibold mb-1.5">{t('picDialog.fullName')} <span className="text-destructive">*</span></label>
            <input id="pic-name"
              type="text"
              name="name"
              placeholder={t('picDialog.namePlaceholder')}
              value={formData.name}
              onChange={handleChange}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            />
          </div>

          <div>
            <label htmlFor="pic-email" className="block text-sm font-semibold mb-1.5">{t('common.email')} <span className="text-destructive">*</span></label>
            <input id="pic-email"
              type="email"
              name="email"
              placeholder={t('picDialog.emailPlaceholder')}
              value={formData.email}
              onChange={handleChange}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            />
          </div>

          <div>
            <label htmlFor="pic-phone" className="block text-sm font-semibold mb-1.5">{t('picDialog.phone')} <span className="text-destructive">*</span></label>
            <input id="pic-phone"
              type="tel"
              name="phone"
              placeholder={t('picDialog.phonePlaceholder')}
              value={formData.phone}
              onChange={handleChange}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            />
          </div>

          <div>
            <label htmlFor="pic-department" className="block text-sm font-semibold mb-1.5">{t('picDialog.department')}</label>
            <select id="pic-department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {t(`picDialog.dept.${dept}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pic-user" className="block text-sm font-semibold mb-1.5">{t('picDialog.userAccount')}</label>
            <select id="pic-user"
              value={formData.userId ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, userId: e.target.value || null }))}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            >
              <option value="">{t('picDialog.noUser')}</option>
              {/* Keep the current link visible even if the user list has not loaded / excludes them. */}
              {formData.userId && !users.some((u) => u.id === formData.userId) && (
                <option value={formData.userId}>{initialData?.userName ?? formData.userId}</option>
              )}
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role_name}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-1">{t('picDialog.userHint')}</p>
          </div>

          <div>
            <p className="block text-sm font-semibold mb-2">{t('picDialog.assignCategories')} <span className="text-destructive">*</span></p>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">{t('picDialog.noCategories')}</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`cat-${category.id}`}
                      checked={formData.categories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="rounded border border-border"
                    />
                    <label htmlFor={`cat-${category.id}`} className="text-sm cursor-pointer flex-1">
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
            {formData.categories.length === 0 && (
              <p className="text-xs text-destructive mt-2">{t('picDialog.pickOne')}</p>
            )}
          </div>

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
              {isSubmitting ? t('common.saving') : isEdit ? t('procurement.saveChanges') : t('picDialog.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
