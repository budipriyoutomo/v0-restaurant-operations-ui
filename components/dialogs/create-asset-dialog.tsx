'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AssetStatus, CreateAssetInput } from '@/lib/types'

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
}

export function CreateAssetDialog({ open, onOpenChange, outlets, onSubmit }: CreateAssetDialogProps) {
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

  const isComplete = form.name.trim() && form.category.trim() && form.outlet.trim()

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
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create asset')
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
          <h2 className="text-lg font-bold">Register New Asset</h2>
          <button onClick={() => !isSubmitting && onOpenChange(false)} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Asset Name <span className="text-destructive">*</span></label>
            <input
              type="text" name="name" placeholder="e.g. AC Unit Level 2 — Kitchen"
              value={form.name} onChange={handleChange} autoFocus
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Category — free text with datalist suggestions */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Category <span className="text-destructive">*</span></label>
            <input
              type="text" name="category" list="category-suggestions"
              placeholder="e.g. AC Unit, Refrigerator…"
              value={form.category} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Outlet */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Outlet <span className="text-destructive">*</span></label>
            {outlets.length > 0 ? (
              <select name="outlet" value={form.outlet} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {outlets.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type="text" name="outlet" placeholder="Enter outlet name"
                value={form.outlet} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Brand / Model — two columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Brand</label>
              <input
                type="text" name="brand" placeholder="e.g. Daikin"
                value={form.brand} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Model</label>
              <input
                type="text" name="model" placeholder="e.g. FTKM25UV"
                value={form.model} onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Serial Number</label>
            <input
              type="text" name="serialNumber" placeholder="Manufacturer serial number"
              value={form.serialNumber} onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
            />
          </div>

          {/* Dates — Install / Last PM / Next PM */}
          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Maintenance Schedule</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-muted-foreground">Install Date</label>
                <input type="date" name="installDate" value={form.installDate} onChange={handleChange}
                  className="w-full px-2 py-1.5 rounded-md border border-border bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-muted-foreground">Last PM</label>
                <input type="date" name="lastPM" value={form.lastPM} onChange={handleChange}
                  className="w-full px-2 py-1.5 rounded-md border border-border bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-muted-foreground">Next PM</label>
                <input type="date" name="nextPM" value={form.nextPM} onChange={handleChange}
                  className="w-full px-2 py-1.5 rounded-md border border-border bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
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
              type="submit" disabled={!isComplete || isSubmitting}
              className={cn(
                'flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors',
                isComplete && !isSubmitting
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSubmitting ? 'Registering…' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
