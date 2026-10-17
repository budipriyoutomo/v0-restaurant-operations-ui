'use client'

import { useEffect, useState, useRef } from 'react'
import { Search, CheckCircle2, XCircle, Clock, ShoppingCart, Megaphone, BookOpen, Package, Wrench, X, Loader2, AlertTriangle, UserCheck, Info } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { useDebounced, usePagedList } from '@/lib/use-paged-list'
import { ListSkeleton } from '@/components/shared/skeleton'
import { api } from '@/lib/api-client'
import { approvalConsequence } from '@/lib/action-reasons'
import { useOutletFilter, usePermissions } from '@/lib/permissions'
import { outletQuery } from '@/lib/outlet-filter'
import { ApprovalRequest, ApprovalStatus, ApprovalType } from '@/lib/types'
import { useRecordRoute, useUrlState } from '@/lib/use-route'
import { NotFoundView } from '@/components/shared/not-found-view'
import { useT } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { SideDrawer } from '@/components/shared/side-drawer'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar, FilterSelect } from '@/components/shared/filter-menu'
import { StatusBadge } from '@/components/shared/priority-badge'

const typeIcons: Record<ApprovalType, React.ReactNode> = {
  procurement: <ShoppingCart className="size-5" />,
  marketing: <Megaphone className="size-5" />,
  training: <BookOpen className="size-5" />,
  'asset-purchase': <Package className="size-5" />,
  maintenance: <Wrench className="size-5" />,
}


const PAGE_SIZE = 20

export function ApprovalCenterPage() {
  useEnsureLoaded('users')
  const { approvals, decideApproval, currentUser, delegateApproval, escalateStaleApprovals, allUsers, upsertApprovals, fetchApproval } = useIssueStore()
  const listVersion = useIssueStore((s) => s.listVersion)
  const { can } = usePermissions()
  const { t, label, date, locale } = useT()
  const rupiah = (n: number) => formatMoney(n)
  // The open request and the filters live in the URL (Todo-Pilot §14): email
  // and WhatsApp link straight to /approvals/{id}. Derived from the store so the
  // drawer always shows the latest steps after a decision or delegation.
  const record = useRecordRoute()
  const selectedApproval = record.recordId ? approvals.find((a) => a.id === record.recordId) ?? null : null
  // A request opened from WhatsApp may not be on the current page: read it (Todo-Pilot §22).
  const [missingId, setMissingId] = useState<string | null>(null)
  const cachedSelected = !!selectedApproval
  useEffect(() => {
    if (!record.recordId || cachedSelected) return
    const id = record.recordId
    fetchApproval(id).then((found) => { if (!found) setMissingId(id) }).catch(() => {})
  }, [record.recordId]) // eslint-disable-line react-hooks/exhaustive-deps
  const setSelectedApproval = (a: ApprovalRequest | null) => (a ? record.open(a.id) : record.close())
  // Escape closes, Tab stays in the drawer, focus returns to the card (Todo-Pilot §26)
  const [searchParam, setSearchQuery] = useUrlState('q')
  const searchQuery = searchParam ?? ''
  const [filterTypeParam, setFilterType] = useUrlState('type')
  const filterType = filterTypeParam as ApprovalType | null
  const [filterStatus, setFilterStatus] = useUrlState('status', 'pending')
  const [isDeciding, setIsDeciding] = useState(false)
  const [decisionComment, setDecisionComment] = useState('')
  // First tap picks a decision and shows what it will do; "Yes" sends it (Todo-Pilot §23).
  const [pendingDecision, setPendingDecision] = useState<'approved' | 'rejected' | null>(null)
  useEffect(() => { setPendingDecision(null) }, [selectedApproval?.id, selectedApproval?.currentStepOrder])
  const [delegateTo, setDelegateTo] = useState('')
  const [isDelegating, setIsDelegating] = useState(false)
  const [isEscalating, setIsEscalating] = useState(false)

  // Only manager/admin can hold an approval step, so those are the valid delegates.
  const delegateCandidates = allUsers.filter(
    (u) => u.is_active && (u.approval_tier === 'manager' || u.approval_tier === 'admin') && u.id !== currentUser?.id,
  )

  const handleDelegate = async () => {
    if (!selectedApproval || !delegateTo || isDelegating) return
    const target = allUsers.find((u) => u.id === delegateTo)
    if (!target) return
    setIsDelegating(true)
    try {
      // Send the target's role too, so the active step's required role matches
      // the delegate and they are actually able to decide it.
      await delegateApproval(selectedApproval.id, { toUserId: target.id, toRole: target.approval_tier })
      setDelegateTo('')
      toast.success(t('approvals.delegated', { name: target.name }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('approvals.delegateFailed'))
    } finally {
      setIsDelegating(false)
    }
  }

  const handleEscalate = async () => {
    if (isEscalating) return
    setIsEscalating(true)
    try {
      const count = await escalateStaleApprovals()
      if (count > 0) {
        toast.success(t('approvals.escalated', { count }))
      } else {
        toast.message(t('approvals.nothingStuck'))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('approvals.escalateFailed'))
    } finally {
      setIsEscalating(false)
    }
  }

  // Filtered and paged by the server (Todo-Pilot §22).
  const debouncedSearch = useDebounced(searchQuery)
  const [page, setPage] = useState(1)
  const { outlet } = useOutletFilter()            // top bar outlet filter
  const filterKey = [debouncedSearch, filterType, filterStatus, outlet].join('|')
  useEffect(() => { setPage(1) }, [filterKey])
  const list = usePagedList<ApprovalRequest>('/api/approvals',
    { q: debouncedSearch.trim(), type: filterType, status: filterStatus, outlet },
    { page, pageSize: PAGE_SIZE, onItems: upsertApprovals })
  const filteredApprovals = (list.ids ?? []).map((id) => approvals.find((a) => a.id === id)).filter((a): a is ApprovalRequest => !!a)
  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE))

  // Header counts per status — X-Total-Count of a one-row page each.
  const [statusCounts, setStatusCounts] = useState<Record<ApprovalStatus, number> | null>(null)
  useEffect(() => {
    let live = true
    const statuses: ApprovalStatus[] = ['pending', 'approved', 'rejected']
    const o = outletQuery(outlet)
    Promise.all(statuses.map((st) => api.getPage<ApprovalRequest>(`/api/approvals?status=${st}&limit=1${o ? `&${o}` : ''}`).then((r) => r.total)))
      .then(([pending, approved, rejected]) => { if (live) setStatusCounts({ pending, approved, rejected }) })
      .catch(() => {})
    return () => { live = false }
  }, [listVersion, outlet])
  const noneAtAll = statusCounts !== null && statusCounts.pending + statusCounts.approved + statusCounts.rejected === 0

  const stats = [
    { label: label('approvalStatus', 'pending'), count: statusCounts?.pending ?? '—', color: 'text-amber-700 dark:text-amber-400' },
    { label: label('approvalStatus', 'approved'), count: statusCounts?.approved ?? '—', color: 'text-green-700 dark:text-green-400' },
    { label: label('approvalStatus', 'rejected'), count: statusCounts?.rejected ?? '—', color: 'text-red-600' },
  ]

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedApproval || isDeciding) return
    setIsDeciding(true)
    try {
      await decideApproval(selectedApproval.id, decision, decisionComment || undefined)
      // Refresh selectedApproval from updated store
      const refreshed = useIssueStore.getState().approvals.find(a => a.id === selectedApproval.id)
      // More steps remain → the panel stays open on the updated request.
      if (!refreshed || refreshed.status !== 'pending') setSelectedApproval(null)
      setDecisionComment('')
      const isLastStep = refreshed?.status !== 'pending'
      toast.success(
        isLastStep
          ? (decision === 'approved' ? t('approvals.fullyApproved') : t('approvals.rejectedToast'))
          : t('approvals.stepApproved', { step: selectedApproval.currentStepOrder }),
      )
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      const detail = message.match(/"detail":\s*"([^"]+)"/)?.[1]
      toast.error(
        message.includes('API 403')
          ? t('approvals.notAuthorised')
          : `${t('approvals.decisionFailed')}${detail ? `: ${detail}` : '.'}`,
      )
    } finally {
      setIsDeciding(false)
    }
  }

  if (record.recordId && !selectedApproval && missingId === record.recordId) {
    return (
      <NotFoundView
        title={t('notFound.approvalTitle')}
        message={t('notFound.approvalText')}
        backTo="/approvals"
        backLabel={t('notFound.backToApprovals')}
      />
    )
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title={t('approvals.title')}
        description={t('approvals.subtitle')}
        actions={can.runSystemJobs && (
          <button
            onClick={handleEscalate}
            disabled={isEscalating}
            title={t('approvals.escalateTitle')}
            className="flex items-center gap-1.5 px-4 h-10 rounded-lg border border-border bg-card text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
          >
            {isEscalating ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
            {t('approvals.escalate')}
          </button>
        )}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl border border-border bg-card">
            <p className="text-xs font-medium text-muted-foreground mb-1">{stat.label}</p>
            <p className={cn('text-2xl font-bold tabular-nums', stat.color)}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters — one card, dropdown filters */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('approvals.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-transparent bg-muted/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-colors"
          />
        </div>

        <FilterBar>
          <FilterSelect label={t('approvals.statusFilter')} allLabel={t('common.all')} value={filterStatus}
            options={(['pending', 'approved', 'rejected'] as ApprovalStatus[]).map((s) => ({ value: s, label: label('approvalStatus', s) }))}
            onChange={setFilterStatus} />
          <FilterSelect label={t('approvals.typeFilter')} allLabel={t('common.all')} value={filterType}
            options={(['procurement', 'marketing', 'training', 'asset-purchase', 'maintenance'] as ApprovalType[]).map((type) => (
              { value: type, label: label('approvalType', type), icon: typeIcons[type] }))}
            onChange={setFilterType} />
        </FilterBar>
      </div>

      {/* Approvals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {list.ids === null ? (
          <div className="lg:col-span-2 2xl:col-span-3"><ListSkeleton rows={4} className="p-0 sm:p-0" /></div>
        ) : filteredApprovals.length === 0 ? (
          // Nothing at all yet: say where approvals come from (Todo-Pilot §24)
          <EmptyState className="lg:col-span-2 2xl:col-span-3" icon={CheckCircle2}
            title={t('approvals.noneFound')} description={noneAtAll ? t('approvals.emptyHint') : undefined} />
        ) : (
          filteredApprovals.map((approval) => (
            <div
              key={approval.id}
              onClick={() => setSelectedApproval(approval)}
              className={cn(
                'p-4 sm:p-5 rounded-xl border bg-card cursor-pointer transition-[border-color,box-shadow] hover:shadow-sm',
                selectedApproval?.id === approval.id ? 'border-primary ring-2 ring-primary/15' : 'border-border hover:border-primary/40'
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0">{typeIcons[approval.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-primary font-bold mb-1">{approval.number}</p>
                    <h3 className="font-semibold text-sm line-clamp-2">{approval.title}</h3>
                  </div>
                </div>
                <Clock className="size-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mb-2">
                <span className="bg-muted px-2 py-0.5 rounded-md font-medium text-foreground/80">{label('approvalType', approval.type)}</span>
                <span>{approval.requester}</span>
                {approval.amount != null && <span className="font-semibold text-foreground">{rupiah(approval.amount)}</span>}
              </div>

              <div className="flex items-center justify-between text-xs">
                <StatusBadge status={approval.status} />
                <span className="text-muted-foreground">{date(approval.requestedDate)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approval Detail Side Drawer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3.5 h-9 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/50 disabled:opacity-40">{t('common.prev')}</button>
          <span className="text-sm text-muted-foreground">{t('common.pageOf', { page, total: totalPages })}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3.5 h-9 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/50 disabled:opacity-40">{t('common.next')}</button>
        </div>
      )}

      {selectedApproval && (
        <SideDrawer
          label={`${t('term.approval')} ${selectedApproval.number}`}
          number={selectedApproval.number}
          title={<span className="flex items-start gap-2"><span className="text-amber-700 dark:text-amber-400 mt-1 flex-shrink-0">{typeIcons[selectedApproval.type]}</span>{selectedApproval.title}</span>}
          closeLabel={t('common.close')}
          onClose={() => setSelectedApproval(null)}
        >
              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">{t('common.type')}</span>
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{label('approvalType', selectedApproval.type)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">{t('common.status')}</span>
                  <StatusBadge status={selectedApproval.status} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">{t('common.description')}</p>
                <p className="text-sm text-foreground leading-relaxed">{selectedApproval.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{t('approvals.requester')}</p>
                  <p className="text-sm font-semibold text-foreground">{selectedApproval.requester}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{t('common.outlet')}</p>
                  <p className="text-sm font-semibold text-foreground">{selectedApproval.outlet}</p>
                </div>
              </div>

              {selectedApproval.amount && (
                <div className="space-y-2 pb-6 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('common.amount')}</p>
                  <p className="text-xl font-bold text-foreground">
                    {rupiah(Number(selectedApproval.amount))}
                  </p>
                </div>
              )}

              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">{t('approvals.requestedDate')}</span>
                  <span className="text-sm">{date(selectedApproval.requestedDate)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">
                    {selectedApproval.purchaseRequestId ? t('approvals.purchaseRequest') : t('approvals.linkedIssue')}
                  </span>
                  <span className="text-sm font-mono font-bold text-primary">
                    {selectedApproval.issueNumber ?? (selectedApproval.purchaseRequestId ? 'PR' : '—')}
                  </span>
                </div>
              </div>

              {/* Escalation banner (Tier 3) */}
              {selectedApproval.escalated && selectedApproval.status === 'pending' && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                  <AlertTriangle className="size-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-destructive">{t('approvals.escalatedBanner')}</p>
                    <p className="text-xs text-destructive/80 mt-0.5">
                      {t('approvals.escalatedText')}
                    </p>
                  </div>
                </div>
              )}

              {/* Step timeline — only shown for multi-step approvals */}
              {selectedApproval.steps.length > 0 && (
                <div className="space-y-3 pb-6 border-b border-border">
                  <p className="text-sm font-semibold">{t('approvals.steps')}</p>
                  <div className="space-y-2">
                    {selectedApproval.steps.map((step, idx) => {
                      const isActive = selectedApproval.status === 'pending' && step.stepOrder === selectedApproval.currentStepOrder
                      return (
                        <div key={step.id} className="flex items-start gap-3">
                          {/* Step connector line */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className={cn(
                              'size-6 rounded-full flex items-center justify-center text-xs font-bold ring-2',
                              step.status === 'approved' ? 'bg-green-500 text-white ring-green-200' :
                              step.status === 'rejected' ? 'bg-red-500 text-white ring-red-200' :
                              isActive ? 'bg-amber-400 text-white ring-amber-200 animate-pulse' :
                              'bg-muted text-muted-foreground ring-border',
                            )}>
                              {step.status === 'approved' ? <CheckCircle2 className="size-3" /> :
                               step.status === 'rejected' ? <XCircle className="size-3" /> :
                               step.stepOrder}
                            </div>
                            {idx < selectedApproval.steps.length - 1 && (
                              <div className={cn(
                                'w-px h-6 mt-1',
                                step.status === 'approved' ? 'bg-green-300' : 'bg-border',
                              )} />
                            )}
                          </div>
                          <div className="flex-1 pt-0.5 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold">{label('tier', step.approverRole)}</p>
                              <span className={cn(
                                'text-xs font-semibold px-2 py-0.5 rounded-md capitalize flex-shrink-0',
                                step.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300' :
                                step.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' :
                                isActive ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                                'bg-muted text-muted-foreground',
                              )}>
                                {isActive ? t('approvals.activeStep') : label('approvalStatus', step.status)}
                              </span>
                            </div>
                            {step.decidedAt && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {step.decidedBy ?? t('approvals.unknown')} · {date(step.decidedAt)}
                              </p>
                            )}
                            {step.comment && (
                              <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{step.comment}"</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Decision area */}
              {(() => {
                if (selectedApproval.status !== 'pending') {
                  return (
                    <div className={cn(
                      'p-4 rounded-md border space-y-1',
                      selectedApproval.status === 'approved' ? 'bg-green-100/50 border-green-200 dark:bg-green-950/30 dark:border-green-900' : 'bg-red-100/50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
                    )}>
                      <p className={cn('text-sm font-semibold', selectedApproval.status === 'approved' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                        {t('approvals.hasBeen', { status: label('approvalStatus', selectedApproval.status).toLowerCase() })}
                      </p>
                    </div>
                  )
                }

                // For multi-step: only the user whose role matches the active step can decide
                const activeStep = selectedApproval.steps.length > 0
                  ? selectedApproval.steps.find(s => s.stepOrder === selectedApproval.currentStepOrder)
                  : null
                const userRole = currentUser?.approval_tier
                const canDecideStep = can.approve && (
                  activeStep == null || activeStep.approverRole === userRole
                )

                return (
                  <>
                    <div className={cn(
                      'p-4 rounded-md border space-y-1',
                      canDecideStep ? 'bg-blue-100/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900' : 'bg-muted/30 border-border',
                    )}>
                      <p className={cn('text-sm font-semibold', canDecideStep ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground')}>
                        {canDecideStep
                          ? activeStep ? t('approvals.yourTurn', { step: activeStep.stepOrder, role: label('tier', activeStep.approverRole) }) : t('approvals.pendingYours')
                          : activeStep ? t('approvals.waitingFor', { role: label('tier', activeStep.approverRole) }) : t('approvals.awaiting')}
                      </p>
                      {!canDecideStep && (
                        <p className="text-xs text-muted-foreground">
                          {t('approvals.onlyRole', { role: activeStep ? label('tier', activeStep.approverRole) : 'manager/admin' })}
                        </p>
                      )}
                    </div>

                    {canDecideStep && (
                      <div className="space-y-3 pt-4 border-t border-border">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                            {t('approvals.comment')} <span className="font-normal">{t('common.optional')}</span>
                          </label>
                          <textarea
                            value={decisionComment}
                            onChange={(e) => setDecisionComment(e.target.value)}
                            rows={2}
                            placeholder={t('approvals.commentPlaceholder')}
                            className="w-full px-3 py-2 text-xs rounded-md border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Decision bar stays at the bottom of the screen on a phone (Todo-Pilot §15) */}
                    {canDecideStep && (
                        <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-t border-border z-10 flex flex-col gap-2">
                          {pendingDecision ? (
                            <>
                              <p role="status" className="text-xs text-foreground flex items-start gap-1.5">
                                <Info className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                                {(() => { const r = approvalConsequence(selectedApproval, pendingDecision); return t(r.key, r.params) })()}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setPendingDecision(null)}
                                  disabled={isDeciding}
                                  className="flex-1 min-h-11 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted/50 disabled:opacity-60"
                                >
                                  {t('common.cancel')}
                                </button>
                                <button
                                  onClick={() => handleDecision(pendingDecision)}
                                  disabled={isDeciding}
                                  className={cn(
                                    'flex-1 min-h-11 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed',
                                    pendingDecision === 'approved' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700',
                                  )}
                                >
                                  {isDeciding && <Loader2 className="size-4 animate-spin" />}
                                  {pendingDecision === 'approved' ? t('approvals.confirmApprove') : t('approvals.confirmRejectButton')}
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                          <button
                            onClick={() => setPendingDecision('approved')}
                            className="w-full min-h-11 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="size-4" />
                            {activeStep && activeStep.stepOrder < selectedApproval.steps.length
                              ? t('approvals.approveStep', { step: activeStep.stepOrder })
                              : t('approvals.approve')}
                          </button>
                          <button
                            onClick={() => setPendingDecision('rejected')}
                            className="w-full min-h-11 px-4 py-2.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-950 transition-colors flex items-center justify-center gap-2"
                          >
                            <XCircle className="size-4" />
                            {t('approvals.reject')}
                          </button>
                            </>
                          )}
                        </div>
                    )}

                    {/* Delegation (Tier 3) — any manager/admin can hand the active step over */}
                    {can.approve && (
                      <div className="space-y-2 pt-4 border-t border-border">
                        <label className="block text-xs font-semibold text-muted-foreground">
                          {t('approvals.delegateLabel')}
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={delegateTo}
                            onChange={(e) => setDelegateTo(e.target.value)}
                            className="flex-1 h-9 rounded-lg border border-border bg-muted/20 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            <option value="">{t('approvals.pickApprover')}</option>
                            {delegateCandidates.map((u) => (
                              <option key={u.id} value={u.id}>{u.name} ({u.role_name})</option>
                            ))}
                          </select>
                          <button
                            onClick={handleDelegate}
                            disabled={isDelegating || !delegateTo}
                            className="px-3 h-9 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isDelegating ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                            {t('approvals.delegate')}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('approvals.delegateHint')}
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
        </SideDrawer>
      )}
    </div>
  )
}
