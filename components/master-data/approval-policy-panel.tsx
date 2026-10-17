'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Trash2, Loader2, GitBranch, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { ApprovalType, ApproverRole, CreateApprovalPolicyInput, PolicyStep } from '@/lib/types'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import { EmptyState as SharedEmptyState } from '@/components/shared/empty-state'

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
  return formatMoney(v)
}

export function ApprovalPolicyPanel() {
  const { t, label } = useT()
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
      <SharedEmptyState title={t('policy.adminOnly')} className="py-16 text-sm" />
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
    if (form.steps.length === 0) return toast.error(t('policy.minOneStep'))
    if (form.minAmount != null && form.maxAmount != null && form.minAmount > form.maxAmount) {
      return toast.error(t('policy.minGtMax'))
    }
    setSaving(true)
    try {
      // renumber steps 1..n to be safe
      const steps: PolicyStep[] = form.steps.map((s, i) => ({ order: i + 1, role: s.role }))
      await createApprovalPolicy({ ...form, steps })
      toast.success(t('policy.created'))
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
    if (!confirm(t('policy.confirmDelete', { type: label('approvalType', type) }))) return
    try {
      await deleteApprovalPolicy(id)
      toast.success(t('policy.deleted'))
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">{t('policy.title')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('policy.subtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? t('common.close') : t('policy.new')}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">{t('policy.type')}</span>
              <select
                value={form.approvalType}
                onChange={(e) => setForm({ ...form, approvalType: e.target.value as ApprovalType })}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              >
                {APPROVAL_TYPES.map((at) => <option key={at} value={at}>{label('approvalType', at)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">{t('policy.min')}</span>
              <input
                type="number"
                min={0}
                value={form.minAmount ?? ''}
                onChange={(e) => setForm({ ...form, minAmount: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder={t('policy.emptyInfinite')}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">{t('policy.max')}</span>
              <input
                type="number"
                min={0}
                value={form.maxAmount ?? ''}
                onChange={(e) => setForm({ ...form, maxAmount: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder={t('policy.emptyInfinite')}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">{t('policy.outletOptional')}</span>
              <select
                value={form.outlet ?? ''}
                onChange={(e) => setForm({ ...form, outlet: e.target.value || null })}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="">{t('common.allOutlets')}</option>
                {outlets.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            </label>
          </div>

          {/* Steps builder */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">{t('policy.chain')}</span>
            <div className="flex flex-wrap items-center gap-2">
              {form.steps.map((s, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                  <select
                    value={s.role}
                    onChange={(e) => setStepRole(idx, e.target.value as ApproverRole)}
                    aria-label={`${t('policy.chain')} ${idx + 1}`}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{label('tier', r)}</option>)}
                  </select>
                  {form.steps.length > 1 && (
                    <button onClick={() => removeStep(idx)} aria-label={t('policy.removeStep')} className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  )}
                  {idx < form.steps.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                </div>
              ))}
              <button onClick={addStep} className="flex items-center gap-1 px-2 h-9 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-accent">
                <Plus className="size-3" /> {t('policy.addStep')}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={resetForm} className="px-3 h-9 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {t('policy.save')}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {policiesLoading ? (
        <p className="text-xs text-muted-foreground text-center py-6">{t('policy.loading')}</p>
      ) : approvalPolicies.length === 0 ? (
        <SharedEmptyState title={t('policy.empty')} className="py-10 text-sm" />
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                <th className="text-left px-4 py-3.5 font-semibold">{t('policy.colType')}</th>
                <th className="text-left px-4 py-3.5 font-semibold">{t('policy.range')}</th>
                <th className="text-left px-4 py-3.5 font-semibold">{t('common.outlet')}</th>
                <th className="text-left px-4 py-3.5 font-semibold">{t('policy.chain')}</th>
                <th className="text-left px-4 py-3.5 font-semibold">{t('common.status')}</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {approvalPolicies.map((p) => (
                <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-4 py-3.5 font-semibold">{label('approvalType', p.approvalType)}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{fmtAmount(p.minAmount)} – {fmtAmount(p.maxAmount)}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{p.outlet ?? t('policy.all')}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {p.steps.map((s) => label('tier', s.role)).join(' → ')}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => toggleActive(p.id, p.isActive)}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs font-semibold border cursor-pointer hover:opacity-80',
                        p.isActive
                          ? 'bg-success/15 text-success border-success/30'
                          : 'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {p.isActive ? t('pm.active') : t('pm.inactive')}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(p.id, p.approvalType)}
                      className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title={t('policy.delete')}
                      aria-label={t('policy.delete')}
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
