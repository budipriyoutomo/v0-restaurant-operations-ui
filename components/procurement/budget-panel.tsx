'use client'

import { useEffect, useState } from 'react'
import { Wallet, AlertTriangle, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { BudgetStatusEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

const rp = (n: number) => 'Rp ' + (n ?? 0).toLocaleString('id-ID')

function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function BudgetPanel() {
  const { outlets, loadBudgetStatus, createBudget, loadMasterData } = useIssueStore()
  const { can } = usePermissions()

  const [period, setPeriod] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [rows, setRows] = useState<BudgetStatusEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ outletId: '', amount: '' })
  const [saving, setSaving] = useState(false)

  const refresh = () => {
    setLoading(true)
    loadBudgetStatus(period).then(setRows).catch(() => setRows([])).finally(() => setLoading(false))
  }
  useEffect(() => { refresh() }, [period]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (outlets.length === 0) loadMasterData() }, [outlets.length, loadMasterData])

  const handleCreate = async () => {
    if (!form.outletId) return toast.error('Pilih outlet')
    const amt = Number(form.amount)
    if (!amt || amt < 0) return toast.error('Nominal tidak valid')
    setSaving(true)
    try {
      await createBudget(form.outletId, period, amt)
      toast.success('Anggaran disimpan')
      setForm({ outletId: '', amount: '' }); setShowForm(false)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error && e.message.includes('409') ? 'Anggaran outlet ini sudah ada untuk periode tsb' : String(e))
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Anggaran vs Realisasi</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Biaya WO selesai + PO per outlet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border">
            <button onClick={() => setPeriod((p) => shiftPeriod(p, -1))} className="p-1 hover:bg-accent"><ChevronLeft className="size-3.5" /></button>
            <span className="text-xs font-mono px-1.5">{period}</span>
            <button onClick={() => setPeriod((p) => shiftPeriod(p, 1))} className="p-1 hover:bg-accent"><ChevronRight className="size-3.5" /></button>
          </div>
          {can.manageMasterData && (
            <button onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
              <Plus className="size-3.5" /> Set anggaran
            </button>
          )}
        </div>
      </div>

      {showForm && can.manageMasterData && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/20 p-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">Outlet</span>
            <select value={form.outletId} onChange={(e) => setForm((f) => ({ ...f, outletId: e.target.value }))}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs">
              <option value="">— outlet —</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-muted-foreground">Anggaran {period} (IDR)</span>
            <input type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="h-8 w-40 rounded-md border border-border bg-background px-2 text-xs" />
          </label>
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
            {saving && <Loader2 className="size-3.5 animate-spin" />} Simpan
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-6">Memuat…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border flex items-center justify-center py-8 text-xs text-muted-foreground">
          Belum ada anggaran untuk {period}.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.budgetId} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">{r.outlet}</span>
                {r.overBudget ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive"><AlertTriangle className="size-3.5" /> Over budget</span>
                ) : r.warning ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-warning"><AlertTriangle className="size-3.5" /> Mendekati plafon</span>
                ) : null}
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={cn('h-full rounded-full',
                  r.overBudget ? 'bg-destructive' : r.warning ? 'bg-warning' : 'bg-success')}
                  style={{ width: `${Math.min(100, r.pct)}%` }} />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                <span>{rp(r.spent)} / {rp(r.amount)} ({r.pct}%)</span>
                <span className={cn(r.remaining < 0 && 'text-destructive font-semibold')}>Sisa {rp(r.remaining)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                WO {rp(r.spentWorkOrders)} · PO {rp(r.spentPurchaseOrders)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
