'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Trash2, Loader2, Package, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { CreatePartInput } from '@/lib/types'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import { EmptyState as SharedEmptyState } from '@/components/shared/empty-state'

const EMPTY: CreatePartInput = {
  sku: '', name: '', category: 'General', unit: 'pcs',
  unitCost: 0, stockQty: 0, reorderLevel: 0, isActive: true,
}

function fmtRp(v: number): string {
  return formatMoney(v ?? 0)
}

export function PartsInventoryPanel() {
  const { parts, partsLoading, loadParts, createPart, updatePart, deletePart } = useIssueStore()
  const { can } = usePermissions()
  const { t } = useT()

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreatePartInput>(EMPTY)

  useEffect(() => { loadParts() }, [loadParts])

  const lowCount = parts.filter((p) => p.lowStock && p.isActive).length

  async function handleSave() {
    if (!form.sku.trim()) return toast.error(t('parts.skuRequired'))
    if (!form.name.trim()) return toast.error(t('parts.nameRequired'))
    setSaving(true)
    try {
      await createPart(form)
      toast.success(t('parts.added'))
      setForm(EMPTY)
      setShowForm(false)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function restock(id: string, current: number) {
    const val = prompt(t('parts.setStock'), String(current))
    if (val === null) return
    const n = Number(val)
    if (Number.isNaN(n) || n < 0) return toast.error(t('parts.badQty'))
    try {
      await updatePart(id, { stockQty: n })
      toast.success(t('parts.stockUpdated'))
    } catch (e) {
      toast.error(String(e))
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t('parts.confirmDelete', { name }))) return
    try {
      await deletePart(id)
      toast.success(t('parts.deleted'))
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">{t('parts.title')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('parts.subtitle')}
            </p>
          </div>
          {lowCount > 0 && (
            <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold border bg-warning/15 text-warning border-warning/30">
              <AlertTriangle className="size-3" /> {t('parts.lowStock', { count: lowCount })}
            </span>
          )}
        </div>
        {can.manageCMMS && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            {showForm ? t('common.close') : t('parts.newPart')}
          </button>
        )}
      </div>

      {showForm && can.manageCMMS && (
        <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">{t('parts.sku')}</span>
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            <span className="font-semibold text-muted-foreground">{t('parts.name')}</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">{t('parts.unit')}</span>
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">{t('parts.unitCost')}</span>
            <input type="number" min={0} value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">{t('parts.initialStock')}</span>
            <input type="number" min={0} value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">{t('parts.reorderLevel')}</span>
            <input type="number" min={0} value={form.reorderLevel}
              onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
          </label>
          <div className="flex items-end justify-end sm:col-span-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {saving && <Loader2 className="size-3.5 animate-spin" />} {t('common.save')}
            </button>
          </div>
        </div>
      )}

      {partsLoading ? (
        <p className="text-xs text-muted-foreground text-center py-6">{t('parts.loading')}</p>
      ) : parts.length === 0 ? (
        <SharedEmptyState title={t('parts.empty')} className="py-10 text-sm" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2.5 font-semibold">{t('parts.sku')}</th>
                <th className="text-left py-2.5 font-semibold">{t('parts.name')}</th>
                <th className="text-right py-2.5 font-semibold">{t('parts.price')}</th>
                <th className="text-right py-2.5 font-semibold">{t('parts.stock')}</th>
                <th className="text-right py-2.5 font-semibold">{t('parts.reorder')}</th>
                <th className="py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parts.map((p) => (
                <tr key={p.id} className={cn('hover:bg-accent/40 transition-colors', !p.isActive && 'opacity-50')}>
                  <td className="py-2.5 font-mono">{p.sku}</td>
                  <td className="py-2.5 font-semibold">{p.name}</td>
                  <td className="py-2.5 text-right text-muted-foreground">{fmtRp(p.unitCost)}</td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => can.manageCMMS && restock(p.id, p.stockQty)}
                      className={cn('font-semibold', p.lowStock ? 'text-warning' : 'text-foreground', can.manageCMMS && 'hover:underline')}>
                      {p.stockQty} {p.unit}
                    </button>
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground">{p.reorderLevel}</td>
                  <td className="py-2.5 text-right">
                    {can.manageCMMS && (
                      <button onClick={() => handleDelete(p.id, p.name)}
                        className="size-9 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title={t('common.delete')} aria-label={t('common.delete')}>
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
