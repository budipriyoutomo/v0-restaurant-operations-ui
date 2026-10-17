'use client'

import { useState, useRef } from 'react'
import { ShoppingCart, Plus, Clock, CheckCircle2, XCircle, Building2, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { PurchasingPanel } from '@/components/procurement/purchasing-panel'
import { BudgetPanel } from '@/components/procurement/budget-panel'
import { useMyOutlets, usePermissions } from '@/lib/permissions'
import { ApprovalRequest, Issue, Vendor, CreateVendorInput } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { useT } from '@/lib/i18n'
import { navigate } from '@/lib/use-route'
import { recordPath } from '@/lib/routes'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'
import { formatMoney } from '@/lib/money'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

type Tab = 'requests' | 'purchasing' | 'budget' | 'approvals' | 'vendors'

export function ProcurementPage() {
  useEnsureLoaded('core', 'vendors')
  const { issues, approvals, outlets, pics, createIssue, vendors, vendorsLoading, createVendor, updateVendor, deleteVendor } = useIssueStore()
  // Outlet pickers must only offer outlets this user may write to (Tier 4).
  const myOutlets = useMyOutlets()
  const { can, canViewPage } = usePermissions()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<Tab>('requests')
  const { t, label } = useT()
  const [showVendorForm, setShowVendorForm] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)

  const requests   = issues.filter(i => i.category === 'Procurement')
  const approvalsP = approvals.filter(a => a.type === 'procurement')
  const activeVendors = vendors.filter(v => v.is_active)

  const stats = {
    total:    requests.length,
    pending:  approvalsP.filter(a => a.status === 'pending').length,
    approved: approvalsP.filter(a => a.status === 'approved').length,
    rejected: approvalsP.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('procurement.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('procurement.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {tab === 'vendors' ? (
            can.manageVendors && (
              <button
                onClick={() => { setEditingVendor(null); setShowVendorForm(true) }}
                className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-4" /> {t('procurement.addVendor')}
              </button>
            )
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" /> {t('procurement.newRequest')}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={t('assetsPage.total')} value={stats.total}           color="text-foreground"  />
        <StatCard label={t('assetsPage.pending')} value={stats.pending}         color="text-amber-700"   />
        <StatCard label={label('approvalStatus', 'approved')} value={stats.approved}        color="text-success"      />
        <StatCard label={t('procurement.activeVendors')} value={activeVendors.length}  color="text-primary"      />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'requests',   label: t('procurement.tab.requests', { count: requests.length }) },
          { id: 'purchasing', label: t('procurement.tab.purchasing') },
          { id: 'budget',     label: t('procurement.tab.budget') },
          { id: 'approvals',  label: t('procurement.tab.approvals', { count: approvalsP.length }) },
          { id: 'vendors',    label: t('procurement.tab.vendors', { count: activeVendors.length }) },
        ] as const).filter(td =>
          // Budgets and vendors are separate modules a role may not hold.
          (td.id !== 'budget' || canViewPage('budgets')) && (td.id !== 'vendors' || canViewPage('vendors'))
        ).map(td => (
          <button
            key={td.id}
            onClick={() => setTab(td.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === td.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {td.label}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <IssueList issues={requests} emptyLabel={t('procurement.noRequests')} emptyHint={t('procurement.noRequestsHint')} />
      )}
      {tab === 'purchasing' && (
        <PurchasingPanel />
      )}
      {tab === 'budget' && (
        <BudgetPanel />
      )}
      {tab === 'approvals' && (
        <ApprovalList approvals={approvalsP} />
      )}
      {tab === 'vendors' && (
        <VendorList
          vendors={vendors}
          loading={vendorsLoading}
          canManage={can.manageVendors}
          onEdit={(v) => { setEditingVendor(v); setShowVendorForm(true) }}
          onDelete={deleteVendor}
          onToggleActive={(v) => updateVendor(v.id, { is_active: !v.is_active })}
        />
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultSystemKey="procurement"
        outlets={myOutlets.map(o => o.name)}
        onSubmit={async (input) => { await createIssue(input) }}
      />

      {showVendorForm && (
        <VendorFormModal
          vendor={editingVendor}
          outlets={myOutlets.map(o => o.name)}
          onClose={() => setShowVendorForm(false)}
          onSubmit={async (data) => {
            if (editingVendor) {
              await updateVendor(editingVendor.id, data)
            } else {
              await createVendor(data as CreateVendorInput)
            }
            setShowVendorForm(false)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function IssueList({ issues, emptyLabel, emptyHint }: { issues: Issue[]; emptyLabel: string; emptyHint: string }) {
  const { t, date } = useT()
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
        <ShoppingCart className="size-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">{emptyLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">{emptyHint}</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <button type="button" key={issue.id} onClick={() => navigate(recordPath('issues', issue.id))} className="w-full text-left p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-muted-foreground">{issue.number}</span>
              <PriorityBadge priority={issue.priority} />
            </div>
            <p className="text-sm font-semibold">{issue.title}</p>
            {issue.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{issue.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span>{issue.outlet}</span><span>·</span><span>{issue.assignee || t('common.unassigned')}</span>
              {issue.dueDate && <><span>·</span><span>{t('procurement.due', { date: date(issue.dueDate) })}</span></>}
            </div>
          </div>
          <StatusBadge status={issue.status} />
        </button>
      ))}
    </div>
  )
}

function ApprovalList({ approvals }: { approvals: ApprovalRequest[] }) {
  const { t, label } = useT()
  if (approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
        <CheckCircle2 className="size-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">{t('procurement.noApprovals')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('procurement.noApprovalsHint')}</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {approvals.map((a) => (
        <button type="button" key={a.id} onClick={() => navigate(recordPath('approvals', a.id))} className="w-full text-left p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-muted-foreground">{a.number}</span>
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-semibold text-muted-foreground">{label('approvalType', a.type)}</span>
            </div>
            <p className="text-sm font-semibold">{a.title}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
              <span>{a.outlet}</span><span>·</span><span>{t('assetsPage.by', { name: a.requester })}</span>
              {a.amount != null && <><span>·</span><span className="font-semibold text-foreground">{formatMoney(a.amount, a.currency)}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {a.status === 'pending'  && <Clock className="size-4 text-amber-700" />}
            {a.status === 'approved' && <CheckCircle2 className="size-4 text-success" />}
            {a.status === 'rejected' && <XCircle className="size-4 text-destructive" />}
            <StatusBadge status={a.status} />
          </div>
        </button>
      ))}
    </div>
  )
}

function VendorList({ vendors, loading, canManage, onEdit, onDelete, onToggleActive }: {
  vendors: Vendor[]
  loading: boolean
  canManage: boolean
  onEdit: (v: Vendor) => void
  onDelete: (id: string) => void
  onToggleActive: (v: Vendor) => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { t } = useT()

  if (loading && vendors.length === 0) {
    return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }
  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
        <Building2 className="size-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">{t('procurement.noVendors')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('procurement.noVendorsHint')}</p>
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try { await onDelete(id) } finally { setDeleting(null); setConfirmDelete(null) }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {vendors.map(v => (
        <div key={v.id} className={cn('p-4 rounded-xl border bg-card shadow-sm space-y-2', !v.is_active && 'opacity-50')}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{v.name}</p>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">{v.category}</span>
            </div>
            {canManage && (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => onEdit(v)} aria-label={t('common.edit')} className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Pencil className="size-3" />
                </button>
                <button onClick={() => setConfirmDelete(v.id)} aria-label={t('common.delete')} className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="size-3" />
                </button>
              </div>
            )}
          </div>
          {v.contact_name  && <p className="text-xs text-muted-foreground">{t('procurement.contact', { name: v.contact_name })}</p>}
          {v.contact_phone && <p className="text-xs text-muted-foreground">{v.contact_phone}</p>}
          {v.contact_email && <p className="text-xs text-muted-foreground truncate">{v.contact_email}</p>}
          {v.outlet        && <p className="text-xs text-muted-foreground">{t('procurement.outlet', { name: v.outlet })}</p>}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', v.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
              {v.is_active ? t('procurement.active') : t('procurement.inactive')}
            </span>
            {canManage && (
              <button onClick={() => onToggleActive(v)} className="text-[10px] text-muted-foreground hover:text-foreground underline">
                {v.is_active ? t('procurement.deactivate') : t('procurement.activate')}
              </button>
            )}
          </div>
          {confirmDelete === v.id && (
            <div className="border-t border-border pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">{t('procurement.removeConfirm', { name: v.name })}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-accent">{t('common.cancel')}</button>
                <button
                  onClick={() => handleDelete(v.id)}
                  disabled={deleting === v.id}
                  className="flex-1 py-1 text-xs rounded bg-destructive text-destructive-foreground font-semibold flex items-center justify-center gap-1"
                >
                  {deleting === v.id ? <Loader2 className="size-3 animate-spin" /> : t('procurement.remove')}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function VendorFormModal({ vendor, outlets, onClose, onSubmit }: {
  vendor: Vendor | null
  outlets: string[]
  onClose: () => void
  onSubmit: (data: Partial<CreateVendorInput>) => Promise<void>
}) {
  const [form, setForm] = useState({
    name:          vendor?.name          ?? '',
    category:      vendor?.category      ?? 'General',
    contact_name:  vendor?.contact_name  ?? '',
    contact_phone: vendor?.contact_phone ?? '',
    contact_email: vendor?.contact_email ?? '',
    address:       vendor?.address       ?? '',
    outlet:        vendor?.outlet        ?? '',
    notes:         vendor?.notes         ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useT()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        name:          form.name.trim(),
        category:      form.category || 'General',
        contact_name:  form.contact_name  || undefined,
        contact_phone: form.contact_phone || undefined,
        contact_email: form.contact_email || undefined,
        address:       form.address       || undefined,
        outlet:        form.outlet        || undefined,
        notes:         form.notes         || undefined,
      })
    } catch (e) {
      setError(String(e).replace(/Error: API \d+ [^:]+: /, ''))
      setLoading(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label htmlFor={`vendor-${key}`} className="block text-xs font-semibold mb-1">{label}</label>
      <input
        id={`vendor-${key}`}
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  )

  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{vendor ? t('procurement.editVendor') : t('procurement.addVendor')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="size-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          {field(t('procurement.vendorName'), 'name', 'text', 'PT Supplier Jaya')}
          <div>
            <label htmlFor="vendor-category" className="block text-xs font-semibold mb-1">{t('common.category')}</label>
            <input
              id="vendor-category"
              type="text"
              placeholder={t('procurement.vendorCategoryPlaceholder')}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {field(t('procurement.contactPerson'), 'contact_name', 'text', 'Ahmad Razif')}
          {field(t('procurement.phone'), 'contact_phone', 'tel', '+62 812 3456 7890')}
          {field(t('common.email'), 'contact_email', 'email', 'ahmad@supplier.com')}
          {field(t('procurement.address'), 'address', 'text', 'Jl. Sudirman No. 1, Jakarta')}
          <div>
            <label htmlFor="vendor-outlet" className="block text-xs font-semibold mb-1">{t('common.outlet')}</label>
            <select
              id="vendor-outlet"
              value={form.outlet}
              onChange={e => setForm(f => ({ ...f, outlet: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">{t('cmms.allOutlets')}</option>
              {outlets.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {field(t('common.notes'), 'notes', 'text', t('procurement.notesPlaceholder'))}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-accent">{t('common.cancel')}</button>
            <button
              type="submit"
              disabled={!form.name.trim() || loading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold',
                form.name.trim() && !loading ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : vendor ? t('procurement.saveChanges') : t('procurement.addVendor')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
