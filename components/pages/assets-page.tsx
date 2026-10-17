'use client'

import { useState } from 'react'
import { Package, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { issueModule } from '@/lib/categories'
import { useMyOutlets } from '@/lib/permissions'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { useT } from '@/lib/i18n'
import { navigate } from '@/lib/use-route'
import { recordPath } from '@/lib/routes'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'
import { formatMoney } from '@/lib/money'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { SegmentedTabs } from '@/components/shared/segmented-tabs'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState as SharedEmptyState } from '@/components/shared/empty-state'

type Tab = 'requests' | 'approvals'

const rp = (n: number) => formatMoney(n ?? 0)

// ---------------------------------------------------------------------------
// Asset Purchase — requests to buy/replace an asset and their approvals.
// Physical assets live in CMMS (Todo-Pilot §6); this page is the purchasing
// side only.
// ---------------------------------------------------------------------------
export function AssetsPage() {
  // Aggregates every issue/task/approval: loads them all when opened (Todo-Pilot §22)
  useEnsureLoaded('core')
  const { issues, approvals, pics, createIssue, categories } = useIssueStore()
  // Outlet pickers must only offer outlets this user may write to (Tier 4).
  const myOutlets = useMyOutlets()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<Tab>('requests')
  const { t, label, date } = useT()

  const requests   = issues.filter((i) => issueModule(i, categories) === 'asset_purchase')
  const approvalsA = approvals.filter((a) => a.type === 'asset-purchase')

  const purchaseStats = {
    total:    requests.length,
    pending:  approvalsA.filter((a) => a.status === 'pending').length,
    approved: approvalsA.filter((a) => a.status === 'approved').length,
    rejected: approvalsA.filter((a) => a.status === 'rejected').length,
  }

  const tabDefs: { id: Tab; label: string; count: number }[] = [
    { id: 'requests',  label: t('assetsPage.tabRequests'),  count: requests.length },
    { id: 'approvals', label: t('assetsPage.tabApprovals'), count: approvalsA.length },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <PageHeader
        title={t('assetsPage.title')}
        description={t('assetsPage.subtitle')}
        actions={<>
          <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> {t('assetsPage.new')}
        </button>
      </>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={t('assetsPage.total')} value={purchaseStats.total}    color="text-foreground" />
        <StatCard label={t('assetsPage.pending')} value={purchaseStats.pending}  color="text-amber-700 dark:text-amber-400"  />
        <StatCard label={label('approvalStatus', 'approved')} value={purchaseStats.approved} color="text-success"    />
        <StatCard label={label('approvalStatus', 'rejected')} value={purchaseStats.rejected} color="text-destructive" />
      </div>

      {/* Tabs */}
      <SegmentedTabs label={t('nav.assets')} value={tab} onChange={setTab}
        tabs={tabDefs.map((td) => ({ id: td.id, label: <>{td.label} <span className="text-muted-foreground tabular-nums">{td.count}</span></> }))} />

      {/* Tab: Asset Requests */}
      {tab === 'requests' && (
        requests.length === 0 ? (
          <EmptyState icon={Package} message={t('assetsPage.noRequests')} hint={t('assetsPage.noRequestsHint')} />
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <button type="button" key={r.id} onClick={() => navigate(recordPath('issues', r.id))} className="w-full text-left p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{r.number}</span>
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <p className="text-sm font-semibold">{r.title}</p>
                  {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{r.outlet}</span>
                    <span>·</span>
                    <span>{r.assignee || t('common.unassigned')}</span>
                    {r.dueDate && <><span>·</span><span>{t('assetsPage.neededBy', { date: date(r.dueDate) })}</span></>}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </button>
            ))}
          </div>
        )
      )}

      {/* Tab: Approvals */}
      {tab === 'approvals' && (
        approvalsA.length === 0 ? (
          <EmptyState icon={CheckCircle2} message={t('assetsPage.noApprovals')} hint={t('assetsPage.noApprovalsHint')} />
        ) : (
          <div className="space-y-2">
            {approvalsA.map((a) => (
              <button type="button" key={a.id} onClick={() => navigate(recordPath('approvals', a.id))} className="w-full text-left p-4 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{a.number}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-md font-semibold text-muted-foreground">{t('assetsPage.assetTag')}</span>
                  </div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>{a.outlet}</span>
                    <span>·</span>
                    <span>{t('assetsPage.by', { name: a.requester })}</span>
                    {a.amount != null && <><span>·</span><span className="font-semibold text-foreground">{rp(a.amount)}</span></>}
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

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultSystemKey="asset_purchase"
        outlets={myOutlets.map((o) => o.name)}
        onSubmit={async (input) => { await createIssue(input) }}
      />

    </div>
  )
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-2xl border border-border bg-card">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, message, hint }: { icon: React.ElementType; message: string; hint: string }) {
  return (
    <SharedEmptyState icon={Icon} title={message} description={hint} />
  )
}
