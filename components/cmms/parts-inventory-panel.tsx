'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Trash2, Loader2, Package, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { CreatePartInput } from '@/lib/types'
import { cn } from '@/lib/utils'

const EMPTY: CreatePartInput = {
  sku: '', name: '', category: 'General', unit: 'pcs',
  unitCost: 0, stockQty: 0, reorderLevel: 0, isActive: true,
}

function fmtRp(v: number): string {
  return 'Rp ' + (v ?? 0).toLocaleString('id-ID')
}

export function PartsInventoryPanel() {
  const { parts, partsLoading, loadParts, createPart, updatePart, deletePart } = useIssueStore()
  const { can } = usePermissions()

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreatePartInput>(EMPTY)

  useEffect(() => { loadParts() }, [loadParts])

  const lowCount = parts.filter((p) => p.lowStock && p.isActive).length

  async function handleSave() {
    if (!form.sku.trim()) return toast.error('SKU wajib diisi')
    if (!form.name.trim()) return toast.error('Nama part wajib diisi')
    setSaving(true)
    try {
      await createPart(form)
      toast.success('Part ditambahkan')
      setForm(EMPTY)
      setShowForm(false)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function restock(id: string, current: number) {
    const val = prompt('Set jumlah stok baru:', String(current))
    if (val === null) return
    const n = Number(val)
    if (Number.isNaN(n) || n < 0) return toast.error('Jumlah tidak valid')
    try {
      await updatePart(id, { stockQty: n })
      toast.success('Stok diperbarui')
    } catch (e) {
      toast.error(String(e))
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus part "${name}"?`)) return
    try {
      await deletePart(id)
      toast.success('Part dihapus')
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
            <h3 className="text-sm font-semibold">Spare Parts & Inventory</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stok suku cadang — konsumsi di work order mengurangi stok & mengisi parts_cost otomatis
            </p>
          </div>
          {lowCount > 0 && (
            <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold border bg-warning/15 text-warning border-warning/30">
              <AlertTriangle className="size-3" /> {lowCount} stok menipis
            </span>
          )}
        </div>
        {can.manageAssets && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            {showForm ? 'Tutup' : 'Part baru'}
          </button>
        )}
      </div>

      {showForm && can.manageAssets && (
        <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">SKU</span>
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            <span className="font-semibold text-muted-foreground">Nama</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">Satuan</span>
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">Harga satuan (IDR)</span>
            <input type="number" min={0} value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">Stok awal</span>
            <input type="number" min={0} value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">Batas reorder</span>
            <input type="number" min={0} value={form.reorderLevel}
              onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs" />
          </label>
          <div className="flex items-end justify-end sm:col-span-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
              {saving && <Loader2 className="size-3.5 animate-spin" />} Simpan
            </button>
          </div>
        </div>
      )}

      {partsLoading ? (
        <p className="text-xs text-muted-foreground text-center py-6">Memuat inventory…</p>
      ) : parts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border flex items-center justify-center py-10 text-xs text-muted-foreground">
          Belum ada suku cadang.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 font-semibold">SKU</th>
                <th className="text-left py-2 font-semibold">Nama</th>
                <th className="text-right py-2 font-semibold">Harga</th>
                <th className="text-right py-2 font-semibold">Stok</th>
                <th className="text-right py-2 font-semibold">Reorder</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parts.map((p) => (
                <tr key={p.id} className={cn('hover:bg-accent/40 transition-colors', !p.isActive && 'opacity-50')}>
                  <td className="py-2 font-mono">{p.sku}</td>
                  <td className="py-2 font-semibold">{p.name}</td>
                  <td className="py-2 text-right text-muted-foreground">{fmtRp(p.unitCost)}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => can.manageAssets && restock(p.id, p.stockQty)}
                      className={cn('font-semibold', p.lowStock ? 'text-warning' : 'text-foreground', can.manageAssets && 'hover:underline')}>
                      {p.stockQty} {p.unit}
                    </button>
                  </td>
                  <td className="py-2 text-right text-muted-foreground">{p.reorderLevel}</td>
                  <td className="py-2 text-right">
                    {can.manageAssets && (
                      <button onClick={() => handleDelete(p.id, p.name)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Hapus">
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
