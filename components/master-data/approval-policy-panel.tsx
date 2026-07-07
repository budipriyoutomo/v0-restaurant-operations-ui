'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Trash2, Loader2, GitBranch, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { ApprovalType, ApproverRole, CreateApprovalPolicyInput, PolicyStep } from '@/lib/types'
import { cn } from '@/lib/utils'

const APPROVAL_TYPES: ApprovalType[] = ['maintenance', 'procurement', 'marketing', 'training', 'asset-purchase']
const ROLES: ApproverRole[] = ['staff', 'manager', 'admin']

const EMPTY_FORM: CreateApprovalPolicyInput = {
  approvalType: 'maintenance',
  minAmount: null,
  maxAmount: null,
  steps: [{ order: 1, role: 'manager' }],
  outlet: null,
  isActive: true,
}

function fmtAmount(v: number | null): string {
  if (v === null || v === undefined) return '∞'
  return 'Rp ' + v.toLocaleString('id-ID')
}

export function ApprovalPolicyPanel() {
  const { approvalPolicies, policiesLoading, outlets, loadApprovalPolicies, createApprovalPolicy, updateApprovalPolicy, deleteApprovalPolicy } =
    useIssueStore()
  const { can } = usePermissions()

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreateApprovalPolicyInput>(EMPTY_FORM)

  useEffect(() => {
    loadApprovalPolicies()
  }, [loadApprovalPolicies])

  if (!can.manageMasterData) {
    return (
      <div className="rounded-xl border border-dashed border-border flex items-center justify-center py-16 text-xs text-muted-foreground">
        Hanya admin yang dapat mengelola approval policy.
      </div>
    )
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  function setStepRole(idx: number, role: ApproverRole) {
    setForm((f) => ({ ...f, steps: f.steps.map((s, i) => (i === idx ? { ...s, role } : s)) }))
  }

  function addStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, { order: f.steps.length + 1, role: 'admin' }] }))
  }

  function removeStep(idx: number) {
    setForm((f) => {
      const steps = f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }))
      return { ...f, steps: steps.length ? steps : [{ order: 1, role: 'manager' }] }
    })
  }

  async function handleSave() {
    if (form.steps.length === 0) return toast.error('Minimal 1 langkah approval')
    if (form.minAmount != null && form.maxAmount != null && form.minAmount > form.maxAmount) {
      return toast.error('Nominal minimum tidak boleh lebih besar dari maksimum')
    }
    setSaving(true)
    try {
      // renumber steps 1..n to be safe
      const steps: PolicyStep[] = form.steps.map((s, i) => ({ order: i + 1, role: s.role }))
      await createApprovalPolicy({ ...form, steps })
      toast.success('Approval policy dibuat')
      resetForm()
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await updateApprovalPolicy(id, { isActive: !isActive })
    } catch (e) {
      toast.error(String(e))
    }
  }

  async function handleDelete(id: string, type: string) {
    if (!confirm(`Hapus policy "${type}"?`)) return
    try {
      await deleteApprovalPolicy(id)
      toast.success('Policy dihapus')
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Approval Policies</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Menentukan rantai langkah approval berdasarkan tipe + nominal. Tanpa policy → default 2 langkah (manager → admin).
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? 'Tutup' : 'Policy baru'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">Tipe approval</span>
              <select
                value={form.approvalType}
                onChange={(e) => setForm({ ...form, approvalType: e.target.value as ApprovalType })}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                {APPROVAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">Nominal min (IDR)</span>
              <input
                type="number"
                min={0}
                value={form.minAmount ?? ''}
                onChange={(e) => setForm({ ...form, minAmount: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder="kosong = ∞"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">Nominal max (IDR)</span>
              <input
                type="number"
                min={0}
                value={form.maxAmount ?? ''}
                onChange={(e) => setForm({ ...form, maxAmount: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder="kosong = ∞"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">Outlet (opsional)</span>
              <select
                value={form.outlet ?? ''}
                onChange={(e) => setForm({ ...form, outlet: e.target.value || null })}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="">Semua outlet</option>
                {outlets.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            </label>
          </div>

          {/* Steps builder */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Rantai langkah</span>
            <div className="flex flex-wrap items-center gap-2">
              {form.steps.map((s, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">{idx + 1}.</span>
                  <select
                    value={s.role}
                    onChange={(e) => setStepRole(idx, e.target.value as ApproverRole)}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {form.steps.length > 1 && (
                    <button onClick={() => removeStep(idx)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  )}
                  {idx < form.steps.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                </div>
              ))}
              <button onClick={addStep} className="flex items-center gap-1 px-2 h-8 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:bg-accent">
                <Plus className="size-3" /> langkah
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={resetForm} className="px-3 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors">
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Simpan policy
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {policiesLoading ? (
        <p className="text-xs text-muted-foreground text-center py-6">Memuat policy…</p>
      ) : approvalPolicies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border flex items-center justify-center py-10 text-xs text-muted-foreground">
          Belum ada policy — sistem memakai default 2 langkah (manager → admin).
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-semibold">Tipe</th>
                <th className="text-left px-4 py-2.5 font-semibold">Rentang nominal</th>
                <th className="text-left px-4 py-2.5 font-semibold">Outlet</th>
                <th className="text-left px-4 py-2.5 font-semibold">Rantai langkah</th>
                <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {approvalPolicies.map((p) => (
                <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-4 py-2.5 font-semibold">{p.approvalType}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtAmount(p.minAmount)} – {fmtAmount(p.maxAmount)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.outlet ?? 'Semua'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {p.steps.map((s) => s.role).join(' → ')}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleActive(p.id, p.isActive)}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[11px] font-semibold border cursor-pointer hover:opacity-80',
                        p.isActive
                          ? 'bg-success/15 text-success border-success/30'
                          : 'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {p.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(p.id, p.approvalType)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Hapus policy"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
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
