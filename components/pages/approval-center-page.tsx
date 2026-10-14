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
import { usePermissions } from '@/lib/permissions'
import { ApprovalRequest, ApprovalStatus, ApprovalType } from '@/lib/types'
import { useRecordRoute, useUrlState } from '@/lib/use-route'
import { NotFoundView } from '@/components/shared/not-found-view'
import { useT } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

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
  const drawerRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(drawerRef, () => setSelectedApproval(null), !!selectedApproval)
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
  const filterKey = [debouncedSearch, filterType, filterStatus].join('|')
  useEffect(() => { setPage(1) }, [filterKey])
  const list = usePagedList<ApprovalRequest>('/api/approvals',
    { q: debouncedSearch.trim(), type: filterType, status: filterStatus },
    { page, pageSize: PAGE_SIZE, onItems: upsertApprovals })
  const filteredApprovals = (list.ids ?? []).map((id) => approvals.find((a) => a.id === id)).filter((a): a is ApprovalRequest => !!a)
  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE))

  // Header counts per status — X-Total-Count of a one-row page each.
  const [statusCounts, setStatusCounts] = useState<Record<ApprovalStatus, number> | null>(null)
  useEffect(() => {
    let live = true
    const statuses: ApprovalStatus[] = ['pending', 'approved', 'rejected']
    Promise.all(statuses.map((st) => api.getPage<ApprovalRequest>(`/api/approvals?status=${st}&limit=1`).then((r) => r.total)))
      .then(([pending, approved, rejected]) => { if (live) setStatusCounts({ pending, approved, rejected }) })
      .catch(() => {})
    return () => { live = false }
  }, [listVersion])
  const noneAtAll = statusCounts !== null && statusCounts.pending + statusCounts.approved + statusCounts.rejected === 0

  const stats = [
    { label: label('approvalStatus', 'pending'), count: statusCounts?.pending ?? '—', color: 'text-amber-700' },
    { label: label('approvalStatus', 'approved'), count: statusCounts?.approved ?? '—', color: 'text-green-700' },
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('approvals.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('approvals.subtitle')}</p>
        </div>
        {can.runSystemJobs && (
          <button
            onClick={handleEscalate}
            disabled={isEscalating}
            title={t('approvals.escalateTitle')}
            className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-60"
          >
            {isEscalating ? <Loader2 className="size-3.5 animate-spin" /> : <AlertTriangle className="size-3.5" />}
            {t('approvals.escalate')}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-4 rounded-lg border border-border bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{stat.label}</p>
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('approvals.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground py-1">{t('approvals.statusFilter')}</span>
          {([['pending', label('approvalStatus', 'pending')], ['approved', label('approvalStatus', 'approved')], ['rejected', label('approvalStatus', 'rejected')], [null, t('common.all')]] as [ApprovalStatus | null, string][]).map(([status, text]) => (
            <button
              key={text}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                filterStatus === status ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {text}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground py-1">{t('approvals.typeFilter')}</span>
          {(['procurement', 'marketing', 'training', 'asset-purchase', 'maintenance'] as ApprovalType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5',
                filterType === type ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {typeIcons[type]}
              {label('approvalType', type)}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {list.ids === null ? (
          <div className="lg:col-span-2"><ListSkeleton rows={4} className="p-0 sm:p-0" /></div>
        ) : filteredApprovals.length === 0 ? (
          <div role="status" className="lg:col-span-2 p-12 rounded-lg border border-border text-center space-y-1.5">
            <p className="text-muted-foreground">{t('approvals.noneFound')}</p>
            {/* Nothing at all yet: say where approvals come from (Todo-Pilot §24) */}
            {noneAtAll && <p className="text-xs text-muted-foreground max-w-md mx-auto">{t('approvals.emptyHint')}</p>}
          </div>
        ) : (
          filteredApprovals.map((approval) => (
            <div
              key={approval.id}
              onClick={() => setSelectedApproval(approval)}
              className={cn(
                'p-5 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                selectedApproval?.id === approval.id ? 'bg-primary/10 border-primary shadow-md' : 'bg-muted/20 border-border hover:bg-muted/40'
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-amber-700 mt-0.5 flex-shrink-0">{typeIcons[approval.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-primary font-bold mb-1">{approval.number}</p>
                    <h3 className="font-semibold text-sm line-clamp-2">{approval.title}</h3>
                  </div>
                </div>
                <Clock className="size-5 text-amber-700 flex-shrink-0 mt-0.5" />
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mb-2">
                <span className="bg-muted px-2 py-0.5 rounded">{label('approvalType', approval.type)}</span>
                <span>{approval.requester}</span>
                {approval.amount != null && <span className="font-semibold text-foreground">{rupiah(approval.amount)}</span>}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={cn(
                  'px-2 py-0.5 rounded font-medium capitalize',
                  approval.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                  approval.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                )}>
                  {label('approvalStatus', approval.status)}
                </span>
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
            className="px-3 h-9 rounded-md border border-border text-sm font-medium hover:bg-muted/50 disabled:opacity-40">{t('common.prev')}</button>
          <span className="text-sm text-muted-foreground">{t('common.pageOf', { page, total: totalPages })}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 h-9 rounded-md border border-border text-sm font-medium hover:bg-muted/50 disabled:opacity-40">{t('common.next')}</button>
        </div>
      )}

      {selectedApproval && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedApproval(null)} />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${t('term.approval')} ${selectedApproval.number}`}
            className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-background border-l border-border shadow-lg z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 mr-2">
                  <div className="text-amber-700 mt-1 flex-shrink-0">{typeIcons[selectedApproval.type]}</div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-primary font-bold mb-1">{selectedApproval.number}</p>
                    <h2 className="font-bold text-lg leading-snug">{selectedApproval.title}</h2>
                  </div>
                </div>
                <button onClick={() => setSelectedApproval(null)} aria-label={t('common.close')} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{t('common.type')}</span>
                  <span className="text-sm font-semibold text-amber-700">{label('approvalType', selectedApproval.type)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{t('common.status')}</span>
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-semibold capitalize',
                    selectedApproval.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    selectedApproval.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                  )}>
                    {label('approvalStatus', selectedApproval.status)}
                  </span>
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
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{t('approvals.requestedDate')}</span>
                  <span className="text-sm">{date(selectedApproval.requestedDate)}</span>
                </div>
                <div className="flex items-center justify-between">
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
                    <p className="text-[11px] text-destructive/80 mt-0.5">
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
                              'size-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2',
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
                                'text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize flex-shrink-0',
                                step.status === 'approved' ? 'bg-green-100 text-green-800' :
                                step.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                isActive ? 'bg-amber-100 text-amber-800' :
                                'bg-muted text-muted-foreground',
                              )}>
                                {isActive ? t('approvals.activeStep') : label('approvalStatus', step.status)}
                              </span>
                            </div>
                            {step.decidedAt && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {step.decidedBy ?? t('approvals.unknown')} · {date(step.decidedAt)}
                              </p>
                            )}
                            {step.comment && (
                              <p className="text-[10px] text-muted-foreground italic mt-0.5 truncate">"{step.comment}"</p>
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
                      selectedApproval.status === 'approved' ? 'bg-green-100/50 border-green-200' : 'bg-red-100/50 border-red-200'
                    )}>
                      <p className={cn('text-sm font-semibold', selectedApproval.status === 'approved' ? 'text-green-700' : 'text-red-700')}>
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
                      canDecideStep ? 'bg-blue-100/50 border-blue-200' : 'bg-muted/30 border-border',
                    )}>
                      <p className={cn('text-sm font-semibold', canDecideStep ? 'text-blue-700' : 'text-muted-foreground')}>
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
                                  className="flex-1 min-h-11 px-4 py-2.5 rounded-md border border-border text-sm font-semibold hover:bg-muted/50 disabled:opacity-60"
                                >
                                  {t('common.cancel')}
                                </button>
                                <button
                                  onClick={() => handleDecision(pendingDecision)}
                                  disabled={isDeciding}
                                  className={cn(
                                    'flex-1 min-h-11 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed',
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
                            className="w-full min-h-11 px-4 py-2.5 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="size-4" />
                            {activeStep && activeStep.stepOrder < selectedApproval.steps.length
                              ? t('approvals.approveStep', { step: activeStep.stepOrder })
                              : t('approvals.approve')}
                          </button>
                          <button
                            onClick={() => setPendingDecision('rejected')}
                            className="w-full min-h-11 px-4 py-2.5 rounded-md bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
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
                            className="flex-1 h-9 rounded-md border border-border bg-muted/20 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            <option value="">{t('approvals.pickApprover')}</option>
                            {delegateCandidates.map((u) => (
                              <option key={u.id} value={u.id}>{u.name} ({u.role_name})</option>
                            ))}
                          </select>
                          <button
                            onClick={handleDelegate}
                            disabled={isDelegating || !delegateTo}
                            className="px-3 h-9 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isDelegating ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                            {t('approvals.delegate')}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {t('approvals.delegateHint')}
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
