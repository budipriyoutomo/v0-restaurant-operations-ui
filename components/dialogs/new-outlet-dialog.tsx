'use client'

import { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { CreateOutletInput, Outlet, OutletStatus } from '@/lib/types'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

interface NewOutletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Outlet
  onSubmit?: (data: CreateOutletInput) => Promise<void> | void
}

const statuses: OutletStatus[] = ['operational', 'warning', 'critical']
// approvalThreshold is kept as the raw input string: '' = use the global default.
// The zones RestaurantOps outlets are in; the backend accepts any IANA name.
const TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Kuala_Lumpur', 'Asia/Singapore']
const defaultForm = { name: '', code: '', status: 'operational' as OutletStatus, approvalThreshold: '', timezone: 'Asia/Jakarta' }

export function NewOutletDialog({ open, onOpenChange, initialData, onSubmit }: NewOutletDialogProps) {
  const { t, label } = useT()
  const [formData, setFormData] = useState(defaultForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!initialData

  useEffect(() => {
    if (open) {
      setFormData(initialData
        ? {
            name: initialData.name,
            code: initialData.code,
            status: initialData.status,
            approvalThreshold: initialData.approvalThreshold == null ? '' : String(initialData.approvalThreshold),
            timezone: initialData.timezone ?? 'Asia/Jakarta',
          }
        : defaultForm
      )
      setError(null)
    }
  }, [open, initialData])

  const thresholdValid = formData.approvalThreshold === '' || /^\d+$/.test(formData.approvalThreshold)
  const isComplete = formData.name.trim() && formData.code.trim() && thresholdValid

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isComplete) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit?.({
        name: formData.name,
        code: formData.code.toUpperCase(),
        status: formData.status,
        approvalThreshold: formData.approvalThreshold === '' ? null : Number(formData.approvalThreshold),
        timezone: formData.timezone,
      })
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
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="outlet-dialog-title"
        className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <h2 id="outlet-dialog-title" className="text-lg font-bold">{isEdit ? t('outletDialog.edit') : t('outletDialog.create')}</h2>
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
            <label htmlFor="outlet-name" className="block text-sm font-semibold mb-1.5">{t('outletDialog.name')} <span className="text-destructive">*</span></label>
            <input id="outlet-name"
              type="text"
              name="name"
              placeholder={t('outletDialog.namePlaceholder')}
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label htmlFor="outlet-code" className="block text-sm font-semibold mb-1.5">{t('masterData.code')} <span className="text-destructive">*</span></label>
            <input id="outlet-code"
              type="text"
              name="code"
              placeholder={t('outletDialog.codePlaceholder')}
              value={formData.code}
              onChange={handleChange}
              maxLength={5}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
            />
          </div>

          <div>
            <label htmlFor="outlet-status" className="block text-sm font-semibold mb-1.5">{t('common.status')}</label>
            <select id="outlet-status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {label('outletStatus', status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="outlet-timezone" className="block text-sm font-semibold mb-1.5">{t('outletDialog.timezone')}</label>
            <select id="outlet-timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {(TIMEZONES.includes(formData.timezone) ? TIMEZONES : [formData.timezone, ...TIMEZONES]).map((tz) => (
                <option key={tz} value={tz}>
                  {TIMEZONES.includes(tz) ? t(`outletDialog.tz.${tz.replace('/', '_')}` as 'outletDialog.tz.Asia_Jakarta') : tz}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">{t('outletDialog.timezoneHint')}</p>
          </div>

          <div>
            <label htmlFor="outlet-approvalThreshold" className="block text-sm font-semibold mb-1.5">{t('outletDialog.threshold')}</label>
            <input id="outlet-approvalThreshold"
              type="text"
              inputMode="numeric"
              name="approvalThreshold"
              placeholder={t('outletDialog.thresholdPlaceholder', { amount: (initialData?.approvalThresholdDefault ?? 1_000_000).toLocaleString('id-ID') })}
              value={formData.approvalThreshold}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className={cn('text-xs mt-1', thresholdValid ? 'text-muted-foreground' : 'text-destructive')}>
              {thresholdValid
                ? t('outletDialog.thresholdHint')
                : t('outletDialog.thresholdInvalid')}
            </p>
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
              {isSubmitting ? t('common.saving') : isEdit ? t('procurement.saveChanges') : t('outletDialog.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
