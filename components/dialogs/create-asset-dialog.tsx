'use client'

import { useEffect, useId, useState, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { AssetStatus, CreateAssetInput } from '@/lib/types'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

interface CreateAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outlets: string[]
  onSubmit: (input: CreateAssetInput) => Promise<void>
}

const ASSET_STATUSES: AssetStatus[] = ['operational', 'warning', 'maintenance', 'critical']

const CATEGORY_SUGGESTIONS = [
  'AC Unit', 'Refrigerator', 'Freezer', 'Generator',
  'Elevator / Escalator', 'CCTV', 'Fire Suppression System',
  'Water Heater', 'POS Terminal', 'Ventilation / Exhaust Fan',
  'Grease Trap', 'Cooking Equipment', 'Dishwasher',
]

const defaultForm = {
  name: '',
  category: '',
  outlet: '',
  status: 'operational' as AssetStatus,
  brand: '',
  model: '',
  serialNumber: '',
  installDate: '',
  lastPM: '',
  nextPM: '',
  purchaseCost: '',
  tempMonitored: false,
  tempMin: '',
  tempMax: '',
}

export function CreateAssetDialog({ open, onOpenChange, outlets, onSubmit }: CreateAssetDialogProps) {
  const id = useId()
  const { t, label } = useT()
  const [form, setForm] = useState({ ...defaultForm, outlet: outlets[0] ?? '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm({ ...defaultForm, outlet: outlets[0] ?? '' })
      setError(null)
      setIsSubmitting(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const tempMin = form.tempMin.trim() === '' ? null : Number(form.tempMin.replace(',', '.'))
  const tempMax = form.tempMax.trim() === '' ? null : Number(form.tempMax.replace(',', '.'))
  const tempValid = !form.tempMonitored || tempMin === null || tempMax === null || tempMin < tempMax
  const isComplete = form.name.trim() && form.category.trim() && form.outlet.trim() && tempValid

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        name:         form.name.trim(),
        category:     form.category.trim(),
        outlet:       form.outlet,
        status:       form.status,
        brand:        form.brand.trim() || undefined,
        model:        form.model.trim() || undefined,
        serialNumber: form.serialNumber.trim() || undefined,
        installDate:  form.installDate || undefined,
        lastPM:       form.lastPM || undefined,
        nextPM:       form.nextPM || undefined,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
        ...(form.tempMonitored ? { tempMonitored: true, tempMin, tempMax } : {}),
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createAsset.failed'))
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
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="create-asset-title"
        className="bg-background rounded-2xl border border-border shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-background">
          <h2 id="create-asset-title" className="text-lg font-bold">{t('createAsset.title')}</h2>
          <button onClick={() => !isSubmitting && onOpenChange(false)} aria-label={t('common.close')} className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 hover:bg-muted rounded-lg transition-colors">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Name */}
          <div>
            <label htmlFor={`${id}-name`} className="block text-sm font-semibold mb-1.5">{t('createAsset.name')} <span className="text-destructive">*</span></label>
            <input id={`${id}-name`}
              type="text" name="name" placeholder={t('createAsset.namePlaceholder')}
              value={form.name} onChange={handleChange} autoFocus
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            />
          </div>

          {/* Category — free text with datalist suggestions */}
          <div>
            <label htmlFor={`${id}-category`} className="block text-sm font-semibold mb-1.5">{t('common.category')} <span className="text-destructive">*</span></label>
            <input id={`${id}-category`}
              type="text" name="category" list="category-suggestions"
              placeholder={t('createAsset.categoryPlaceholder')}
              value={form.category} onChange={handleChange}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Outlet */}
          <div>
            <label htmlFor={`${id}-outlet`} className="block text-sm font-semibold mb-1.5">{t('common.outlet')} <span className="text-destructive">*</span></label>
            {outlets.length > 0 ? (
              <select id={`${id}-outlet`} name="outlet" value={form.outlet} onChange={handleChange}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40">
                {outlets.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type="text" name="outlet" placeholder={t('createIssue.outletPlaceholder')}
                value={form.outlet} onChange={handleChange}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              />
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor={`${id}-status`} className="block text-sm font-semibold mb-1.5">{t('common.status')}</label>
            <select id={`${id}-status`} name="status" value={form.status} onChange={handleChange}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40">
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>{label('assetStatus', s)}</option>
              ))}
            </select>
          </div>

          {/* Brand / Model — two columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-brand`} className="block text-sm font-semibold mb-1.5">{t('asset.brand')}</label>
              <input id={`${id}-brand`}
                type="text" name="brand" placeholder={t('createAsset.brandPlaceholder')}
                value={form.brand} onChange={handleChange}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              />
            </div>
            <div>
              <label htmlFor={`${id}-model`} className="block text-sm font-semibold mb-1.5">{t('asset.model')}</label>
              <input id={`${id}-model`}
                type="text" name="model" placeholder={t('createAsset.modelPlaceholder')}
                value={form.model} onChange={handleChange}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              />
            </div>
          </div>

          {/* Serial Number */}
          <div>
            <label htmlFor={`${id}-serialNumber`} className="block text-sm font-semibold mb-1.5">{t('asset.serial')}</label>
            <input id={`${id}-serialNumber`}
              type="text" name="serialNumber" placeholder={t('createAsset.serialPlaceholder')}
              value={form.serialNumber} onChange={handleChange}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 font-mono"
            />
          </div>

          {/* Dates — Install / Last PM / Next PM */}
          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">{t('createAsset.schedule')}</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor={`${id}-installDate`} className="block text-xs font-semibold mb-1.5 text-muted-foreground">{t('asset.installDate')}</label>
                <input id={`${id}-installDate`} type="date" name="installDate" value={form.installDate} onChange={handleChange}
                  className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40" />
              </div>
              <div>
                <label htmlFor={`${id}-lastPM`} className="block text-xs font-semibold mb-1.5 text-muted-foreground">{t('asset.lastPm')}</label>
                <input id={`${id}-lastPM`} type="date" name="lastPM" value={form.lastPM} onChange={handleChange}
                  className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40" />
              </div>
              <div>
                <label htmlFor={`${id}-nextPM`} className="block text-xs font-semibold mb-1.5 text-muted-foreground">{t('asset.nextPm')}</label>
                <input id={`${id}-nextPM`} type="date" name="nextPM" value={form.nextPM} onChange={handleChange}
                  className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40" />
              </div>
            </div>
            <div>
              <label htmlFor={`${id}-purchaseCost`} className="block text-xs font-semibold mb-1.5 text-muted-foreground">{t('createAsset.purchaseCost')}</label>
              <input id={`${id}-purchaseCost`} type="number" min={0} name="purchaseCost" placeholder={t('createAsset.purchasePlaceholder')}
                value={form.purchaseCost} onChange={handleChange}
                className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40" />
            </div>
            {/* Food safety temperature monitoring (Todo-Ops-Checklist Fase 2) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={form.tempMonitored} className="size-4 accent-primary"
                  onChange={(e) => setForm((prev) => ({ ...prev, tempMonitored: e.target.checked }))} />
                {t('temp.monitor')}
              </label>
              {form.tempMonitored && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`${id}-tempMin`} className="block text-xs font-semibold mb-1.5 text-muted-foreground">{t('temp.min')} (°C)</label>
                    <input id={`${id}-tempMin`} inputMode="decimal" name="tempMin" value={form.tempMin} onChange={handleChange}
                      className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40" />
                  </div>
                  <div>
                    <label htmlFor={`${id}-tempMax`} className="block text-xs font-semibold mb-1.5 text-muted-foreground">{t('temp.max')} (°C)</label>
                    <input id={`${id}-tempMax`} inputMode="decimal" name="tempMax" value={form.tempMax} onChange={handleChange}
                      className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40" />
                  </div>
                  {!tempValid && <p className="col-span-2 text-xs text-destructive">{t('temp.minBelowMax')}</p>}
                </div>
              )}
            </div>
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
              type="submit" disabled={!isComplete || isSubmitting}
              className={cn(
                'flex-1 h-10 px-4 rounded-lg font-semibold text-sm transition-colors',
                isComplete && !isSubmitting
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSubmitting ? t('createAsset.submitting') : t('createAsset.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
