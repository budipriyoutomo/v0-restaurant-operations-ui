'use client'

import { useState } from 'react'
import { Megaphone, Plus, Clock, CheckCircle2, XCircle, Loader2, Pencil, Trash2, X, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { Campaign, CampaignStatus, CampaignType, CreateCampaignInput } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'

type Tab = 'campaigns' | 'approvals' | 'issues'

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft:     'bg-muted text-muted-foreground',
  active:    'bg-blue-100 text-blue-700',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
}

const TYPE_LABELS: Record<CampaignType, string> = {
  promotion:    'Promotion',
  event:        'Event',
  'social-media': 'Social Media',
  email:        'Email',
  other:        'Other',
}

export function MarketingPage() {
  const {
    issues, approvals, outlets, pics, createIssue,
    campaigns, campaignsLoading, createCampaign, updateCampaign, deleteCampaign,
  } = useIssueStore()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<Tab>('campaigns')
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  const marketingIssues = issues.filter(i => i.category === 'Marketing')
  const approvalsM = approvals.filter(a => a.type === 'marketing')

  const stats = {
    campaigns: campaigns.length,
    active:    campaigns.filter(c => c.status === 'active').length,
    pending:   approvalsM.filter(a => a.status === 'pending').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing</h1>
          <p className="text-sm text-muted-foreground mt-1">Campaign management, promotions, and marketing initiative approvals</p>
        </div>
        {tab === 'campaigns' ? (
          <button
            onClick={() => { setEditingCampaign(null); setShowCampaignForm(true) }}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> New Campaign
          </button>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> New Marketing Request
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Campaigns" value={stats.campaigns} color="text-foreground" />
        <StatCard label="Active"          value={stats.active}    color="text-blue-600"   />
        <StatCard label="Pending Approval" value={stats.pending}  color="text-amber-600"  />
        <StatCard label="Completed"       value={stats.completed} color="text-success"    />
      </div>

      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'campaigns',  label: `Campaigns (${campaigns.length})` },
          { id: 'approvals',  label: `Approvals (${approvalsM.length})` },
          { id: 'issues',     label: `Issues (${marketingIssues.length})` },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' && (
        <CampaignList
          campaigns={campaigns}
          loading={campaignsLoading}
          onEdit={c => { setEditingCampaign(c); setShowCampaignForm(true) }}
          onDelete={deleteCampaign}
          onStatusChange={(id, status) => updateCampaign(id, { status })}
        />
      )}

      {tab === 'approvals' && (
        approvalsM.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="size-8 text-muted-foreground" />} label="No marketing approvals" hint="Approvals appear when a marketing request is submitted with approval enabled." />
        ) : (
          <div className="space-y-2">
            {approvalsM.map(a => (
              <div key={a.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-mono text-muted-foreground">{a.number}</span>
                  <p className="text-sm font-semibold mt-0.5">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span>{a.outlet}</span><span>·</span><span>By: {a.requester}</span>
                    {a.amount && <><span>·</span><span className="font-semibold text-foreground">{a.amount}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {a.status === 'pending'  && <Clock className="size-4 text-amber-500" />}
                  {a.status === 'approved' && <CheckCircle2 className="size-4 text-success" />}
                  {a.status === 'rejected' && <XCircle className="size-4 text-destructive" />}
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'issues' && (
        marketingIssues.length === 0 ? (
          <EmptyState icon={<Megaphone className="size-8 text-muted-foreground" />} label="No marketing issues" hint="Create a marketing request to get started." />
        ) : (
          <div className="space-y-2">
            {marketingIssues.map(i => (
              <div key={i.id} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-muted-foreground">{i.number}</span>
                    <PriorityBadge priority={i.priority} />
                  </div>
                  <p className="text-sm font-semibold">{i.title}</p>
                  {i.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{i.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>{i.outlet}</span><span>·</span><span>{i.assignee || 'Unassigned'}</span>
                  </div>
                </div>
                <StatusBadge status={i.status} />
              </div>
            ))}
          </div>
        )
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultCategory="Marketing"
        outlets={outlets.map(o => o.name)}
        assignees={['Unassigned', ...pics.map(p => p.name)]}
        onSubmit={async (input) => { await createIssue(input) }}
      />

      {showCampaignForm && (
        <CampaignFormModal
          campaign={editingCampaign}
          outlets={outlets.map(o => o.name)}
          onClose={() => setShowCampaignForm(false)}
          onSubmit={async (data) => {
            if (editingCampaign) {
              await updateCampaign(editingCampaign.id, data)
            } else {
              await createCampaign(data as CreateCampaignInput)
            }
            setShowCampaignForm(false)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campaign list
// ---------------------------------------------------------------------------
function CampaignList({ campaigns, loading, onEdit, onDelete, onStatusChange }: {
  campaigns: Campaign[]
  loading: boolean
  onEdit: (c: Campaign) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CampaignStatus) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (loading && campaigns.length === 0) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (campaigns.length === 0) return <EmptyState icon={<Megaphone className="size-8 text-muted-foreground" />} label="No campaigns yet" hint="Create your first campaign to track marketing initiatives." />

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try { await onDelete(id) } finally { setDeleting(null); setConfirmDelete(null) }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {campaigns.map(c => (
        <div key={c.id} className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">{c.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold', STATUS_COLORS[c.status as CampaignStatus])}>{c.status}</span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">{TYPE_LABELS[c.type as CampaignType] ?? c.type}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onEdit(c)} className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="size-3" /></button>
              <button onClick={() => setConfirmDelete(c.id)} className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="size-3" /></button>
            </div>
          </div>
          {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
          <div className="text-xs text-muted-foreground space-y-0.5">
            {c.outlet && <p>Outlet: {c.outlet}</p>}
            {c.pic && <p>PIC: {c.pic}</p>}
            {c.budget && <p>Budget: <span className="font-semibold text-foreground">{c.budget}</span></p>}
            {(c.start_date || c.end_date) && (
              <p className="flex items-center gap-1">
                <Calendar className="size-3" />
                {c.start_date ?? '?'} → {c.end_date ?? '?'}
              </p>
            )}
          </div>
          <div className="pt-1 border-t border-border">
            <select
              value={c.status}
              onChange={e => onStatusChange(c.id, e.target.value as CampaignStatus)}
              className="w-full px-2 py-1 text-xs rounded border border-border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {confirmDelete === c.id && (
            <div className="border-t border-border pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">Delete <strong>{c.title}</strong>?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-accent">Cancel</button>
                <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                  className="flex-1 py-1 text-xs rounded bg-destructive text-destructive-foreground font-semibold flex items-center justify-center gap-1">
                  {deleting === c.id ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campaign form modal
// ---------------------------------------------------------------------------
function CampaignFormModal({ campaign, outlets, onClose, onSubmit }: {
  campaign: Campaign | null
  outlets: string[]
  onClose: () => void
  onSubmit: (data: Partial<CreateCampaignInput>) => Promise<void>
}) {
  const [form, setForm] = useState({
    title:       campaign?.title       ?? '',
    type:        campaign?.type        ?? 'other',
    description: campaign?.description ?? '',
    outlet:      campaign?.outlet      ?? '',
    budget:      campaign?.budget      ?? '',
    start_date:  campaign?.start_date  ?? '',
    end_date:    campaign?.end_date    ?? '',
    pic:         campaign?.pic         ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        title:       form.title.trim(),
        type:        (form.type as CampaignType) || 'other',
        description: form.description || undefined,
        outlet:      form.outlet || undefined,
        budget:      form.budget || undefined,
        start_date:  form.start_date || undefined,
        end_date:    form.end_date || undefined,
        pic:         form.pic || undefined,
      })
    } catch (e) {
      setError(String(e).replace(/Error: API \d+ [^:]+: /, ''))
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button onClick={onClose} className="size-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          <div>
            <label className="block text-xs font-semibold mb-1">Campaign Title *</label>
            <input type="text" placeholder="Ramadan Promo 2026" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CampaignType }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {(Object.entries(TYPE_LABELS) as [CampaignType, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Description</label>
            <input type="text" placeholder="Brief description…" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Outlet</label>
            <select value={form.outlet} onChange={e => setForm(f => ({ ...f, outlet: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Outlets</option>
              {outlets.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Budget</label>
            <input type="text" placeholder="RM 5,000" value={form.budget}
              onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">PIC (Person in Charge)</label>
            <input type="text" placeholder="Ahmad Razif" value={form.pic}
              onChange={e => setForm(f => ({ ...f, pic: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-accent">Cancel</button>
            <button type="submit" disabled={!form.title.trim() || loading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold',
                form.title.trim() && !loading ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : campaign ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function EmptyState({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
      {icon}
      <p className="text-sm font-medium mt-3">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  )
}
