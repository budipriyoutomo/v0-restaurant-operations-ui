'use client'

import { useEffect, useState, useRef } from 'react'
import { Megaphone, Plus, Clock, CheckCircle2, XCircle, Loader2, Pencil, Trash2, X, Calendar, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { useMyOutlets, useOutletFilter, usePermissions } from '@/lib/permissions'
import { Campaign, CampaignResultsInput, CampaignStatus, CampaignType, CreateCampaignInput } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'
import { api, apiErrorMessage } from '@/lib/api-client'
import { useT } from '@/lib/i18n'
import { navigate } from '@/lib/use-route'
import { recordPath } from '@/lib/routes'
import { budgetBar, formatMoney, parseMoneyInput, upliftLabel } from '@/lib/campaign'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'
import { SegmentedTabs } from '@/components/shared/segmented-tabs'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState as SharedEmptyState } from '@/components/shared/empty-state'
import { byOutlet } from '@/lib/outlet-filter'

type Tab = 'campaigns' | 'approvals' | 'issues'

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft:     'bg-muted text-muted-foreground',
  active:    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
}

const CAMPAIGN_TYPES: CampaignType[] = ['promotion', 'event', 'social-media', 'email', 'other']

export function MarketingPage() {
  useEnsureLoaded('core', 'campaigns')
  const { t, label } = useT()
  const {
    issues: allIssues, approvals: allApprovals, outlets, pics, createIssue,
    campaigns: allCampaigns, campaignsLoading, createCampaign, updateCampaign, deleteCampaign, recordCampaignResults,
  } = useIssueStore()
  // Top bar outlet filter; company-wide campaigns (no outlet) always show.
  const { outlet } = useOutletFilter()
  const issues = byOutlet(allIssues, outlet)
  const approvals = byOutlet(allApprovals, outlet)
  const campaigns = byOutlet(allCampaigns, outlet, { includeShared: true })
  // Outlet pickers must only offer outlets this user may write to (Tier 4).
  const myOutlets = useMyOutlets()
  const { can } = usePermissions()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<Tab>('campaigns')
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [resultsFor, setResultsFor] = useState<Campaign | null>(null)

  const marketingIssues = issues.filter(i => i.category === 'Marketing')
  const approvalsM = approvals.filter(a => a.type === 'marketing')

  const stats = {
    campaigns: campaigns.length,
    active:    campaigns.filter(c => c.status === 'active').length,
    pending:   approvalsM.filter(a => a.status === 'pending').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">
      <PageHeader
        title={t('marketing.title')}
        description={t('marketing.subtitle')}
        actions={<>
          {tab === 'campaigns' ? (
          can.manageCampaigns && (
            <button
              onClick={() => { setEditingCampaign(null); setShowCampaignForm(true) }}
              className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" /> {t('marketing.newCampaign')}
            </button>
          )
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> {t('marketing.newRequest')}
          </button>
        )}
      </>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={t('marketing.totalCampaigns')} value={stats.campaigns} color="text-foreground" />
        <StatCard label={label('campaignStatus', 'active')} value={stats.active}    color="text-blue-600"   />
        <StatCard label={t('assetsPage.pending')} value={stats.pending}  color="text-amber-700 dark:text-amber-400"  />
        <StatCard label={label('campaignStatus', 'completed')} value={stats.completed} color="text-success"    />
      </div>

      <SegmentedTabs label={t('nav.marketing')} value={tab} onChange={setTab} tabs={[
        { id: 'campaigns',  label: t('marketing.tab.campaigns', { count: campaigns.length }) },
        { id: 'approvals',  label: t('marketing.tab.approvals', { count: approvalsM.length }) },
        { id: 'issues',     label: t('marketing.tab.issues', { count: marketingIssues.length }) },
      ] as const} />

      {tab === 'campaigns' && <CampaignSummary refreshKey={campaigns} />}

      {tab === 'campaigns' && (
        <CampaignList
          campaigns={campaigns}
          loading={campaignsLoading}
          canManage={can.manageCampaigns}
          onEdit={c => { setEditingCampaign(c); setShowCampaignForm(true) }}
          onDelete={deleteCampaign}
          onStatusChange={(id, status) => updateCampaign(id, { status })}
          onResults={setResultsFor}
        />
      )}

      {resultsFor && (
        <ResultsDialog
          campaign={resultsFor}
          onClose={() => setResultsFor(null)}
          onSave={async (input) => { await recordCampaignResults(resultsFor.id, input); setResultsFor(null) }}
        />
      )}

      {tab === 'approvals' && (
        approvalsM.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="size-8 text-muted-foreground" />} label={t('marketing.noApprovals')} hint={t('marketing.noApprovalsHint')} />
        ) : (
          <div className="space-y-2">
            {approvalsM.map(a => (
              <button type="button" key={a.id} onClick={() => navigate(recordPath('approvals', a.id))} className="w-full text-left p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground">{a.number}</span>
                  <p className="text-sm font-semibold mt-0.5">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>{a.outlet}</span><span>·</span><span>{t('assetsPage.by', { name: a.requester })}</span>
                    {a.amount != null && <><span>·</span><span className="font-semibold text-foreground">{formatMoney(a.amount, a.currency)}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {a.status === 'pending'  && <Clock className="size-4 text-amber-700 dark:text-amber-400" />}
                  {a.status === 'approved' && <CheckCircle2 className="size-4 text-success" />}
                  {a.status === 'rejected' && <XCircle className="size-4 text-destructive" />}
                  <StatusBadge status={a.status} />
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {tab === 'issues' && (
        marketingIssues.length === 0 ? (
          <EmptyState icon={<Megaphone className="size-8 text-muted-foreground" />} label={t('marketing.noIssues')} hint={t('marketing.noIssuesHint')} />
        ) : (
          <div className="space-y-2">
            {marketingIssues.map(i => (
              <button type="button" key={i.id} onClick={() => navigate(recordPath('issues', i.id))} className="w-full text-left p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{i.number}</span>
                    <PriorityBadge priority={i.priority} />
                  </div>
                  <p className="text-sm font-semibold">{i.title}</p>
                  {i.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{i.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{i.outlet}</span><span>·</span><span>{i.assignee || t('common.unassigned')}</span>
                  </div>
                </div>
                <StatusBadge status={i.status} />
              </button>
            ))}
          </div>
        )
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultSystemKey="marketing"
        outlets={myOutlets.map(o => o.name)}
        onSubmit={async (input) => { await createIssue(input) }}
      />

      {showCampaignForm && (
        <CampaignFormModal
          campaign={editingCampaign}
          outlets={myOutlets.map(o => o.name)}
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
function CampaignList({ campaigns, loading, canManage, onEdit, onDelete, onStatusChange, onResults }: {
  campaigns: Campaign[]
  loading: boolean
  canManage: boolean
  onEdit: (c: Campaign) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CampaignStatus) => void
  onResults: (c: Campaign) => void
}) {
  const { t, label, date } = useT()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (loading && campaigns.length === 0) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (campaigns.length === 0) return <EmptyState icon={<Megaphone className="size-8 text-muted-foreground" />} label={t('marketing.noCampaigns')} hint={t('marketing.noCampaignsHint')} />

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
                <span className={cn('text-xs px-2 py-0.5 rounded-md font-semibold', STATUS_COLORS[c.status as CampaignStatus])}>{label('campaignStatus', c.status)}</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">{label('campaignType', c.type)}</span>
              </div>
            </div>
            {canManage && (
              <div className="flex gap-1">
                <button onClick={() => onEdit(c)} aria-label={t('common.edit')} className="size-10 sm:size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="size-4" /></button>
                <button onClick={() => setConfirmDelete(c.id)} aria-label={t('common.delete')} className="size-10 sm:size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="size-4" /></button>
              </div>
            )}
          </div>
          {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
          <div className="text-xs text-muted-foreground space-y-0.5">
            {c.outlet && <p>{t('training.outlet', { name: c.outlet })}</p>}
            {c.pic && <p>{t('marketing.pic', { name: c.pic })}</p>}
            {c.budget !== null && <p>{t('marketing.budgetLabel')} <span className="font-semibold text-foreground">{formatMoney(c.budget, c.currency)}</span></p>}
            {c.budget === null && c.budget_legacy && <p className="text-amber-700 dark:text-amber-400">{t('marketing.oldBudget', { text: c.budget_legacy })}</p>}
            {(c.start_date || c.end_date) && (
              <p className="flex items-center gap-1">
                <Calendar className="size-3" />
                {c.start_date ? date(c.start_date) : '?'} → {c.end_date ? date(c.end_date) : '?'}
              </p>
            )}
          </div>
          <CampaignMoney c={c} />
          {canManage && (
            <button onClick={() => onResults(c)}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted/50">
              <TrendingUp className="size-3.5" /> {c.actual_cost !== null || c.result_revenue !== null ? t('marketing.updateResults') : t('marketing.recordResults')}
            </button>
          )}
          {canManage && (
            <div className="pt-1 border-t border-border">
              <select
                value={c.status}
                onChange={e => onStatusChange(c.id, e.target.value as CampaignStatus)}
                className="w-full px-2 py-1 text-xs rounded border border-border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                {(['draft', 'active', 'completed', 'cancelled'] as const).map((st) => (
                  <option key={st} value={st}>{label('campaignStatus', st)}</option>
                ))}
              </select>
            </div>
          )}
          {confirmDelete === c.id && (
            <div className="border-t border-border pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">{t('training.deleteConfirm', { name: c.title })}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-accent">{t('common.cancel')}</button>
                <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                  className="flex-1 py-1 text-xs rounded bg-destructive text-destructive-foreground font-semibold flex items-center justify-center gap-1">
                  {deleting === c.id ? <Loader2 className="size-3 animate-spin" /> : t('common.delete')}
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
// Totals per currency — never summed across currencies (Todo-Pilot §10)
// ---------------------------------------------------------------------------
interface CampaignSummaryData {
  campaigns: number
  over_budget: number
  by_currency: Record<string, { budget: number; actual_cost: number; revenue: number }>
}

function CampaignSummary({ refreshKey }: { refreshKey: unknown }) {
  const { t } = useT()
  const [s, setS] = useState<CampaignSummaryData | null>(null)
  useEffect(() => {
    api.get<CampaignSummaryData>('/api/campaigns/summary').then(setS).catch(() => setS(null))
  }, [refreshKey])
  if (!s || s.campaigns === 0) return null
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {Object.entries(s.by_currency).map(([cur, tot]) => (
        <div key={cur} className="px-3 py-2 rounded-lg border border-border bg-muted/20 space-x-3">
          <span>{t('marketing.sumBudget')} <b>{formatMoney(tot.budget, cur)}</b></span>
          <span>{t('marketing.sumSpend')} <b>{formatMoney(tot.actual_cost, cur)}</b></span>
          <span>{t('marketing.sumRevenue')} <b>{formatMoney(tot.revenue, cur)}</b></span>
        </div>
      ))}
      {s.over_budget > 0 && (
        <div className="px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive font-medium">
          {t('marketing.overBudget', { count: s.over_budget })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Budget vs spend + results on a campaign card (Todo-Pilot §10)
// ---------------------------------------------------------------------------
function CampaignMoney({ c }: { c: Campaign }) {
  const { t, locale } = useT()
  const bar = budgetBar(c.budget, c.actual_cost, locale)
  const m = c.metrics
  const hasResults = c.result_revenue !== null || c.result_transactions !== null
  if (c.budget === null && c.actual_cost === null && !hasResults) return null
  return (
    <div className="space-y-2 text-xs">
      {(c.budget !== null || c.actual_cost !== null) && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('marketing.spend', { amount: formatMoney(c.actual_cost, c.currency) })}</span>
            <span className={cn('font-medium', bar.over ? 'text-destructive' : 'text-muted-foreground')}>{bar.label}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full rounded-full', bar.over ? 'bg-destructive' : 'bg-primary')} style={{ width: `${bar.fill}%` }} />
          </div>
        </div>
      )}
      {hasResults && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-muted/30 p-2">
          <span className="text-muted-foreground">{t('marketing.revenue')}</span>
          <span className="text-right font-semibold">{formatMoney(c.result_revenue, c.currency)} <span className={cn('font-normal', (m.revenue_uplift_pct ?? 0) < 0 ? 'text-destructive' : 'text-success')}>{m.revenue_uplift_pct !== null && upliftLabel(m.revenue_uplift_pct)}</span></span>
          <span className="text-muted-foreground">{t('marketing.transactions')}</span>
          <span className="text-right font-semibold">{c.result_transactions ?? '—'} <span className={cn('font-normal', (m.transaction_uplift_pct ?? 0) < 0 ? 'text-destructive' : 'text-success')}>{m.transaction_uplift_pct !== null && upliftLabel(m.transaction_uplift_pct)}</span></span>
          {m.cost_per_transaction !== null && <><span className="text-muted-foreground">{t('marketing.costPerTx')}</span><span className="text-right">{formatMoney(m.cost_per_transaction, c.currency)}</span></>}
          {m.revenue_per_rupiah !== null && <><span className="text-muted-foreground">{t('marketing.revenuePerSpent')}</span><span className="text-right">{m.revenue_per_rupiah}×</span></>}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Spend & results dialog — entered by hand for now (Todo-Pilot §10)
// ---------------------------------------------------------------------------
function ResultsDialog({ campaign: c, onClose, onSave }: {
  campaign: Campaign
  onClose: () => void
  onSave: (input: CampaignResultsInput) => Promise<void>
}) {
  const { t, date } = useT()
  const canRecordResults = c.status === 'active' || c.status === 'completed'
  const str = (n: number | null) => (n === null ? '' : String(n))
  const [f, setF] = useState({
    actual_cost: str(c.actual_cost), result_transactions: str(c.result_transactions), result_revenue: str(c.result_revenue),
    baseline_transactions: str(c.baseline_transactions), baseline_revenue: str(c.baseline_revenue),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true); setError(null)
    const input: CampaignResultsInput = { actual_cost: parseMoneyInput(f.actual_cost) }
    if (canRecordResults) {
      input.result_transactions = parseMoneyInput(f.result_transactions)
      input.result_revenue = parseMoneyInput(f.result_revenue)
      input.baseline_transactions = parseMoneyInput(f.baseline_transactions)
      input.baseline_revenue = parseMoneyInput(f.baseline_revenue)
    }
    try { await onSave(input) } catch (e) { setError(apiErrorMessage(e)); setBusy(false) }
  }

  const field = (key: keyof typeof f, label: string, money: boolean, disabled = false) => (
    <label className="block space-y-1">
      <span className="text-xs font-semibold">{label}</span>
      <input inputMode="numeric" value={f[key]} disabled={disabled}
        onChange={(e) => setF((x) => ({ ...x, [key]: e.target.value }))}
        className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 disabled:opacity-50" />
      {money && parseMoneyInput(f[key]) !== null && <span className="text-xs text-muted-foreground">{formatMoney(parseMoneyInput(f[key]), c.currency)}</span>}
    </label>
  )

  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" className="w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold">{t('marketing.resultsTitle', { title: c.title })}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="size-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
        </div>
        {field('actual_cost', t('marketing.actualSpend', { currency: c.currency }), true)}
        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold">{t('marketing.during')}{c.start_date && ` (${date(c.start_date)} → ${c.end_date ? date(c.end_date) : '?'})`}</p>
          {!canRecordResults && <p className="text-xs text-muted-foreground">{t('marketing.resultsLater')}</p>}
          <div className="grid grid-cols-2 gap-3">
            {field('result_transactions', t('marketing.transactions'), false, !canRecordResults)}
            {field('result_revenue', t('marketing.revenueCur', { currency: c.currency }), true, !canRecordResults)}
          </div>
          <p className="text-xs font-semibold pt-1">{t('marketing.baseline')}</p>
          <div className="grid grid-cols-2 gap-3">
            {field('baseline_transactions', t('marketing.transactions'), false, !canRecordResults)}
            {field('baseline_revenue', t('marketing.revenueCur', { currency: c.currency }), true, !canRecordResults)}
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-9 rounded-lg border border-border text-sm">{t('common.cancel')}</button>
          <button onClick={save} disabled={busy} className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
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
  const { t, label } = useT()
  const [form, setForm] = useState({
    title:       campaign?.title       ?? '',
    type:        campaign?.type        ?? 'other',
    description: campaign?.description ?? '',
    outlet:      campaign?.outlet      ?? '',
    budget:      campaign?.budget != null ? String(campaign.budget) : '',
    currency:    campaign?.currency    ?? 'IDR',
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
        budget:      parseMoneyInput(form.budget),
        currency:    form.currency,
        start_date:  form.start_date || undefined,
        end_date:    form.end_date || undefined,
        pic:         form.pic || undefined,
      })
    } catch (e) {
      setError(apiErrorMessage(e))
      setLoading(false)
    }
  }

  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
          <h2 className="text-base font-semibold">{campaign ? t('marketing.editCampaign') : t('marketing.newCampaign')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="size-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          <div>
            <label htmlFor="campaign-title" className="block text-xs font-semibold mb-1">{t('marketing.campaignTitle')}</label>
            <input id="campaign-title" type="text" placeholder={t('marketing.titlePlaceholder')} value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            />
          </div>
          <div>
            <label htmlFor="campaign-type" className="block text-xs font-semibold mb-1">{t('common.type')}</label>
            <select id="campaign-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CampaignType }))}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            >
              {CAMPAIGN_TYPES.map((v) => (
                <option key={v} value={v}>{label('campaignType', v)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="campaign-description" className="block text-xs font-semibold mb-1">{t('common.description')}</label>
            <input id="campaign-description" type="text" placeholder={t('training.descriptionPlaceholder')} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            />
          </div>
          <div>
            <label htmlFor="campaign-outlet" className="block text-xs font-semibold mb-1">{t('common.outlet')}</label>
            <select id="campaign-outlet" value={form.outlet} onChange={e => setForm(f => ({ ...f, outlet: e.target.value }))}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            >
              <option value="">{t('cmms.allOutlets')}</option>
              {outlets.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="campaign-budget" className="block text-xs font-semibold mb-1">{t('marketing.budget')}</label>
            <div className="flex gap-2">
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="px-2 py-2 rounded-md border border-border bg-muted/20 text-sm">
                <option value="IDR">IDR</option>
                <option value="MYR">MYR</option>
              </select>
              <input id="campaign-budget" type="text" inputMode="numeric" placeholder="5000000" value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                className="flex-1 px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {parseMoneyInput(form.budget) !== null && (
              <p className="text-xs text-muted-foreground mt-1">{formatMoney(parseMoneyInput(form.budget), form.currency)}</p>
            )}
            {campaign?.budget_legacy && campaign.budget === null && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{t('marketing.oldBudgetShort', { text: campaign.budget_legacy })}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="campaign-start" className="block text-xs font-semibold mb-1">{t('marketing.startDate')}</label>
              <input id="campaign-start" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              />
            </div>
            <div>
              <label htmlFor="campaign-end" className="block text-xs font-semibold mb-1">{t('marketing.endDate')}</label>
              <input id="campaign-end" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
              />
            </div>
          </div>
          <div>
            <label htmlFor="campaign-pic" className="block text-xs font-semibold mb-1">{t('marketing.picLabel')}</label>
            <input id="campaign-pic" type="text" placeholder="Ahmad Razif" value={form.pic}
              onChange={e => setForm(f => ({ ...f, pic: e.target.value }))}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-accent">{t('common.cancel')}</button>
            <button type="submit" disabled={!form.title.trim() || loading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold',
                form.title.trim() && !loading ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : campaign ? t('procurement.saveChanges') : t('marketing.createCampaign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-2xl border border-border bg-card">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function EmptyState({ icon, label, hint }: { icon: React.ReactElement; label: string; hint: string }) {
  return (
    <SharedEmptyState icon={icon} title={label} description={hint} />
  )
}
