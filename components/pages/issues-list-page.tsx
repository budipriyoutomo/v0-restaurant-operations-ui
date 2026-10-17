'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, AlertTriangle, X, CheckSquare, CheckCircle2, Sparkles, ChevronLeft, ChevronRight, ChevronDown, Lock, Ban, RotateCcw, RefreshCw, Wrench, Clock, Camera, XCircle, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { useDebounced, usePagedList } from '@/lib/use-paged-list'
import { ListSkeleton } from '@/components/shared/skeleton'
import { apiErrorMessage } from '@/lib/api-client'
import { useMyOutlets, useOutletFilter, usePermissions } from '@/lib/permissions'
import type { CategoryModule, CategorySystemKey, Issue, IssueStatus } from '@/lib/types'
import { activeCategories } from '@/lib/categories'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'
import { approvalThresholdsByOutlet } from '@/lib/outlet-threshold'
import { approvalBadge, linkedWorkOrder, slaState } from '@/lib/issue-card'
import { closeBlockedReason } from '@/lib/action-reasons'
import { runWithUndo } from '@/lib/undo'
import { pagePath, recordPath } from '@/lib/routes'
import { navigate, useRecordRoute, useRoute, useUrlState } from '@/lib/use-route'
import { NotFoundView } from '@/components/shared/not-found-view'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { IssuePhotos } from '@/components/shared/issue-photos'
import { IssueComments } from '@/components/shared/issue-comments'
import { useT, type MessageKey } from '@/lib/i18n'
import { UnlinkedAssigneeNote } from '@/components/shared/unlinked-assignee-note'
import { SideDrawer } from '@/components/shared/side-drawer'
import { EmptyState } from '@/components/shared/empty-state'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar, FilterOptions, FilterSelect } from '@/components/shared/filter-menu'

const PAGE_SIZE = 12

// Saved views (Todo-Pilot §6): QA & Compliance, Guest Service and IT Support are
// the Issues list pinned to one category module (P1: every category in it, e.g.
// Compliance + Food Safety), not separate half-built modules.
// Their page ids stay, so the existing per-module permissions still apply.
export type IssueViewId = 'qa' | 'guest-service' | 'it-support'

// Title & description: t('issues.view.<id>.title|description').
const ISSUE_VIEWS: Record<IssueViewId, { module: CategoryModule; systemKey: CategorySystemKey }> = {
  qa:              { module: 'compliance',    systemKey: 'compliance' },
  'guest-service': { module: 'guest_service', systemKey: 'guest_service' },
  'it-support':    { module: 'it_support',    systemKey: 'it_support' },
}

export function IssuesListPage({ view }: { view?: IssueViewId } = {}) {
  const viewDef = view ? ISSUE_VIEWS[view] : undefined
  const {
    issues, tasks, approvals, workOrders, outlets, pics, assets, createIssue, updateIssueStatus,
    cancelIssue, reopenIssue, reviseApproval, bulkCloseIssues, assignIssue,
    uploadIssuePhoto, loadIssuePhotos, loadIssueComments, addIssueComment, resolveQr, currentUser,
    upsertIssues, fetchIssue, loadIssueChildren, categories,
  } = useIssueStore()
  // Outlet pickers must only offer outlets this user may write to (Tier 4).
  const myOutlets = useMyOutlets()
  const { can, canViewPage } = usePermissions()
  const { t, label, date, relative } = useT()

  // The open issue and the filters live in the URL (Todo-Pilot §14), except
  // when this list is a tab inside another page (QA, Guest Service).
  const routed = !view || view === 'it-support'
  const { page: routePage } = useRoute()
  const record = useRecordRoute(routed)
  // Keep only the id: the drawer must show the store's latest copy, since
  // closureBlockers change whenever a Task / WO / Approval moves.
  const selectedId = record.recordId
  const selectedIssue = selectedId ? issues.find((i) => i.id === selectedId) ?? null : null
  // An issue opened by link may not be on the current page: read it (and its
  // tasks / approval / work orders) from the server (Todo-Pilot §22).
  const [missingId, setMissingId] = useState<string | null>(null)
  const cached = !!selectedIssue
  useEffect(() => {
    if (!selectedId) return
    let live = true
    if (!cached) fetchIssue(selectedId).then((found) => { if (live && !found) setMissingId(selectedId) }).catch(() => {})
    loadIssueChildren({ id: selectedId }).catch(() => {})
    return () => { live = false }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps
  const setSelectedIssue = (issue: Issue | null) => (issue ? record.open(issue.id) : record.close())
  const [lifecycleAction, setLifecycleAction] = useState<'cancel' | 'reopen' | 'revise' | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [actionAmount, setActionAmount] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [searchQueryParam, setSearchQuery] = useUrlState('q', null, routed)
  const searchQuery = searchQueryParam ?? ''
  const [filterPriority, setFilterPriority] = useUrlState('priority', null, routed)
  const [filterCategoryParam, setFilterCategory] = useUrlState('category', null, routed)
  const filterCategory = filterCategoryParam   // category name (master data)
  const [hideFinishedParam, setHideFinished] = useUrlState('open', null, routed)
  const hideFinished = hideFinishedParam === '1'
  // "Siap ditutup" (Todo-Pilot §18 / UX-5): finished work waiting for the close.
  const [readyParam, setReadyOnly] = useUrlState('ready', null, routed)
  const readyOnly = readyParam === '1'
  // Drill-down from the GM outlet comparison (Todo-Pilot §25).
  const [filterOutlet, setFilterOutlet] = useUrlState('outlet', null, routed)
  // The top bar's outlet filter; an outlet in the URL (a drill-down link) wins.
  const { outlet: globalOutlet, setOutlet: setGlobalOutlet } = useOutletFilter()
  const outlet = filterOutlet ?? globalOutlet
  const [lateParam, setLateOnly] = useUrlState('late', null, routed)
  const lateOnly = lateParam === '1'
  const [confirmBulkClose, setConfirmBulkClose] = useState(false)
  const [bulkClosing, setBulkClosing] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  // Roles that cannot manage issues get the quick report (Todo-Pilot §20).
  const quickReport = !can.updateIssueStatus
  // The full form offers assets: load CMMS only then, not for every visit (Todo-Pilot §22).
  useEnsureLoaded(...(createOpen && !quickReport ? (['cmms'] as const) : []))
  // "Lapor" from the phone's bottom navigation: /issues?new=1 opens the form
  // once, then the flag leaves the URL so Back/refresh don't reopen it (§19).
  const [newFlag, setNewFlag] = useUrlState('new', null, routed)
  useEffect(() => {
    if (newFlag === '1') { setCreateOpen(true); setNewFlag(null) }
  }, [newFlag]) // eslint-disable-line react-hooks/exhaustive-deps
  const [page, setPage] = useState(1)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

  // Filters and paging run on the server (Todo-Pilot §22); the rows go into the
  // store cache so a status change or reassignment updates the card at once.
  const debouncedSearch = useDebounced(searchQuery)
  const category = viewDef ? null : filterCategory
  const viewModule = viewDef?.module ?? null
  const filterKey = [debouncedSearch, filterPriority, category, viewModule, hideFinished, readyOnly, outlet, lateOnly].join('|')
  useEffect(() => { setPage(1) }, [filterKey])
  const list = usePagedList<Issue>('/api/issues', {
    q: debouncedSearch.trim(), priority: filterPriority, category, module: viewModule, active: hideFinished, ready: readyOnly,
    outlet, late: lateOnly,
  }, { page, pageSize: PAGE_SIZE, onItems: upsertIssues })
  const pagedIssues = (list.ids ?? []).map((id) => issues.find((i) => i.id === id)).filter((i): i is Issue => !!i)
  const totalCount = list.total
  const hasFilters = Boolean(searchQuery || filterPriority || filterCategory || hideFinished || readyOnly || outlet || lateOnly)
  const noIssuesYet = list.ids !== null && totalCount === 0 && !hasFilters
  const clearFilters = () => {
    setSearchQuery(null); setFilterPriority(null); setFilterCategory(null); setHideFinished(null); setReadyOnly(null)
    setFilterOutlet(null); setLateOnly(null); setGlobalOutlet(null)
  }
  // "Close all" acts on the ready issues shown on this page.
  const readyIds = pagedIssues.filter((i) => i.readyToClose).map((i) => i.id)

  const runBulkClose = async () => {
    if (bulkClosing || readyIds.length === 0) return
    setBulkClosing(true)
    try {
      const { closed, failed } = await bulkCloseIssues(readyIds)
      if (closed.length > 0) toast.success(t('issues.bulkClosed', { count: closed.length }))
      for (const f of failed) toast.error(`${f.number ?? t('term.issue')}: ${f.reason}`)
      setConfirmBulkClose(false)
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setBulkClosing(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const priorities = ['critical', 'high', 'medium', 'low']

  const linkedTasks = selectedIssue ? tasks.filter((t) => t.issueId === selectedIssue.id) : []
  const linkedApproval = selectedIssue ? approvals.find((a) => a.issueId === selectedIssue.id) : undefined
  // Only loaded for roles that can read CMMS; the closure blockers list still names it otherwise.
  const linkedWorkOrders = selectedIssue ? workOrders.filter((w) => w.issueId === selectedIssue.id) : []

  const handleCreate = async (input: Parameters<typeof createIssue>[0]) => {
    const created = await createIssue(input)
    if (!quickReport) {        // the quick report shows its own confirmation
      const parts: string[] = [t('issues.created')]
      if (created.taskIds.length > 0) parts.push(t('issues.createdTask'))
      if (created.approvalId) parts.push(t('issues.createdApproval'))
      toast.success(parts.join(' '))
    }
    setPage(1)
    return created
  }

  const closeDrawer = () => {
    setSelectedIssue(null)
    setStatusDropdownOpen(false)
    setLifecycleAction(null)
  }

  const openAction = (action: 'cancel' | 'reopen' | 'revise') => {
    setLifecycleAction(action)
    setActionReason('')
    setActionAmount(action === 'revise' && linkedApproval?.amount != null ? String(linkedApproval.amount) : '')
  }

  const runAction = async () => {
    if (!selectedIssue || !lifecycleAction || actionBusy) return
    setActionBusy(true)
    try {
      if (lifecycleAction === 'cancel') {
        await cancelIssue(selectedIssue.id, actionReason.trim())
        toast.success(t('issues.cancelledToast'))
      } else if (lifecycleAction === 'reopen') {
        await reopenIssue(selectedIssue.id, actionReason.trim())
        toast.success(t('issues.reopenedToast'))
      } else {
        await reviseApproval(selectedIssue.id, Math.round(Number(actionAmount)), actionReason.trim())
        toast.success(t('issues.revisedToast'))
      }
      setLifecycleAction(null)
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setActionBusy(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPage(1)
  }

  const handlePriorityFilter = (p: string | null) => {
    setFilterPriority(p)
    setPage(1)
  }

  // A link to an issue that doesn't exist or is outside the user's company /
  // outlets — the API answered 404.
  if (selectedId && !selectedIssue && missingId === selectedId) {
    return (
      <NotFoundView
        title={t('notFound.issueTitle')}
        message={t('notFound.issueText')}
        backTo={pagePath(routePage)}
        backLabel={t('notFound.backToList')}
      />
    )
  }

  const newButton = (
    <button
      onClick={() => setCreateOpen(true)}
      // Phones: floating, thumb-sized and always on screen (Todo-Pilot §15)
      className="flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors fixed bottom-20 right-4 z-30 h-14 px-5 rounded-full shadow-lg text-sm sm:static sm:h-10 sm:px-4 sm:rounded-lg sm:shadow-sm"
    >
      <Plus className="size-4" /> {t('issues.new')}
    </button>
  )

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {routed ? (
        <PageHeader
          title={view ? t(`issues.view.${view}.title`) : t('issues.title')}
          description={view ? `${t(`issues.view.${view}.description`)} ${t('issues.savedViewSuffix')}` : t('issues.subtitle')}
          actions={newButton}
        />
      ) : (
        // A tab inside another module page: that page already has the title.
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground max-w-2xl">{t(`issues.view.${view}.description`)} {t('issues.savedViewSuffix')}</p>
          {newButton}
        </div>
      )}

      {/* Search and Filters — one card, chips instead of raw checkboxes */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('issues.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-transparent bg-muted/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-colors"
          />
        </div>

        <FilterBar>
          <FilterSelect label={t('issues.priorityFilter')} allLabel={t('common.all')} value={filterPriority}
            options={priorities.map((p) => ({ value: p, label: label('priority', p) }))}
            onChange={handlePriorityFilter} />
          {!viewDef && (
            <FilterSelect label={t('issues.categoryFilter')} allLabel={t('common.all')} value={filterCategory}
              options={activeCategories(categories).map(({ name: c }) => ({ value: c, label: label('category', c) }))}
              onChange={(c) => { setFilterCategory(c); setPage(1) }} />
          )}
          <FilterOptions label={t('common.filterOptions')} items={[
            { label: t('issues.hideFinished'), checked: hideFinished, onChange: (on) => { setHideFinished(on ? '1' : null); setPage(1) } },
            { label: t('issues.readyOnly'), checked: readyOnly, onChange: (on) => { setReadyOnly(on ? '1' : null); setPage(1); setConfirmBulkClose(false) } },
          ]} />
        </FilterBar>
      </div>

        {/* Bulk close of finished work (Todo-Pilot §18) */}
        {readyOnly && can.updateIssueStatus && readyIds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 text-sm dark:bg-emerald-950/30 dark:border-emerald-900">
            <span className="text-emerald-800 dark:text-emerald-400">
              {readyIds.length === 1 ? t('issues.bulkHintOne') : t('issues.bulkHintMany', { count: readyIds.length })}
            </span>
            {confirmBulkClose ? (
              <>
                <button
                  onClick={runBulkClose}
                  disabled={bulkClosing}
                  className="px-3.5 h-9 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60"
                >
                  {readyIds.length === 1 ? t('issues.bulkConfirmOne') : t('issues.bulkConfirmMany', { count: readyIds.length })}
                </button>
                <button onClick={() => setConfirmBulkClose(false)} disabled={bulkClosing} className="px-3.5 h-9 rounded-lg border border-border bg-card font-medium">
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmBulkClose(true)}
                className="px-3.5 h-9 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
              >
                {t('issues.closeAll', { count: readyIds.length })}
              </button>
            )}
          </div>
        )}


      {/* Issues count + pagination info */}
      {/* Filters that came from a link (GM view) have no control of their own: show them as removable chips. */}
      {(filterOutlet || lateOnly) && (
        <div className="flex flex-wrap gap-2">
          {filterOutlet && (
            <button onClick={() => setFilterOutlet(null)}
              className="inline-flex items-center gap-1 min-h-8 px-3 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              {t('issues.chipOutlet', { outlet: filterOutlet })} <X className="size-3" aria-hidden="true" />
            </button>
          )}
          {lateOnly && (
            <button onClick={() => setLateOnly(null)}
              className="inline-flex items-center gap-1 min-h-8 px-3 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 text-xs font-medium hover:bg-red-200">
              {t('issues.chipLate')} <X className="size-3" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {totalCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {t('issues.showing', { from: (currentPage - 1) * PAGE_SIZE + 1, to: Math.min(currentPage * PAGE_SIZE, totalCount), total: totalCount })}
        </p>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {list.ids === null ? (
          <div className="lg:col-span-2 2xl:col-span-3"><ListSkeleton rows={4} className="p-0 sm:p-0" /></div>
        ) : pagedIssues.length === 0 ? (
          // Empty states say what to do next (Todo-Pilot §24).
          noIssuesYet ? (
            <EmptyState
              className="lg:col-span-2 2xl:col-span-3"
              icon={Inbox}
              title={t('issues.emptyTitle')}
              description={t('issues.emptyHint')}
              action={
                <button onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
                  <Plus className="size-4" /> {t('issues.createFirst')}
                </button>
              }
            />
          ) : (
            <EmptyState
              className="lg:col-span-2 2xl:col-span-3 bg-card"
              icon={Search}
              title={hasFilters ? t('issues.noMatch') : t('issues.noneFound')}
              action={hasFilters && (
                <button onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted/50">
                  <X className="size-4" /> {t('issues.clearFilters')}
                </button>
              )}
            />
          )
        ) : (
          pagedIssues.map((issue) => {
            const taskCount = issue.taskIds.length
            const sla = slaState(issue)
            const appr = approvalBadge(issue.approval ?? approvals.find((a) => a.issueId === issue.id))
            const wo = linkedWorkOrder(issue, workOrders)
            const open = () => setSelectedIssue(issue)
            return (
              <div
                key={issue.id}
                role="button"
                tabIndex={0}
                // Named by number + title; badges are the description (Todo-Pilot §26).
                aria-labelledby={`card-${issue.id}-number card-${issue.id}-title`}
                aria-describedby={`card-${issue.id}-meta`}
                onClick={open}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                className={cn(
                  'p-4 sm:p-5 rounded-xl border bg-card cursor-pointer transition-[border-color,box-shadow] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  selectedIssue?.id === issue.id ? 'border-primary ring-2 ring-primary/15' : 'border-border hover:border-primary/40'
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p id={`card-${issue.id}-number`} className="font-mono text-xs text-primary font-bold mb-1">{issue.number}</p>
                    <h3 id={`card-${issue.id}-title`} className="font-semibold text-sm line-clamp-2">{issue.title}</h3>
                  </div>
                  <PriorityBadge priority={issue.priority} />
                </div>

                <div id={`card-${issue.id}-meta`}>
                <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap text-xs text-muted-foreground mb-3">
                  <span className="bg-muted px-2 py-0.5 rounded-md font-medium text-foreground/80">{label('category', issue.category)}</span>
                  <span>{issue.outlet}</span>
                  {sla.kind === 'breached' && (
                    <span className="bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <AlertTriangle className="size-3" /> {sla.days === 1 ? t('issues.slaOverdueOne') : t('issues.slaOverdue', { n: sla.days })}
                    </span>
                  )}
                  {sla.kind === 'today' && (
                    <span className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <Clock className="size-3" /> {t('issues.slaToday')}
                    </span>
                  )}
                  {sla.kind === 'left' && (
                    <span className={cn('flex items-center gap-1', sla.days === 1 && 'text-amber-800 dark:text-amber-400 font-medium')}>
                      <Clock className="size-3" /> {sla.days === 1 ? t('issues.slaLeftOne') : t('issues.slaLeft', { n: sla.days })}
                    </span>
                  )}
                  {issue.readyToClose && (
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> {t('issues.readyBadge')}
                    </span>
                  )}
                </div>

                {(appr || wo) && (
                  <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
                    {appr?.kind === 'pending' && (
                      <span className={cn('px-2 py-0.5 rounded font-medium flex items-center gap-1',
                        appr.escalated ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300')}>
                        <CheckCircle2 className="size-3" /> {t('issues.approvalStep', { step: appr.step, total: appr.total })}
                      </span>
                    )}
                    {appr?.kind === 'rejected' && (
                      <span className="bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                        <XCircle className="size-3" /> {t('issues.approvalRejected')}
                      </span>
                    )}
                    {appr?.kind === 'approved' && (
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> {t('issues.approvalApproved')}
                      </span>
                    )}
                    {wo && (
                      <span className="bg-muted px-2 py-0.5 rounded flex items-center gap-1 text-muted-foreground">
                        <Wrench className="size-3" /> <span className="font-mono">{wo.number}</span> · {label('woStatus', wo.status)}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <StatusBadge status={issue.status} />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {taskCount > 0 && (
                      <span className="flex items-center gap-1"><CheckSquare className="size-3" /> {taskCount}</span>
                    )}
                    {(issue.photoCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1"><Camera className="size-3" /> {issue.photoCount}</span>
                    )}
                    <span title={date(issue.createdDate)}>{issue.createdAt ? relative(issue.createdAt) : date(issue.createdDate)}</span>
                  </div>
                </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3.5 h-9 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="size-4" /> {t('common.prev')}
          </button>
          <span className="text-sm text-muted-foreground">{t('common.pageOf', { page: currentPage, total: totalPages })}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3.5 h-9 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('common.next')} <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* Issue Detail Side Drawer */}
      {selectedIssue && (
        <SideDrawer
          label={`${t('term.issue')} ${selectedIssue.number}`}
          number={selectedIssue.number}
          title={selectedIssue.title}
          closeLabel={t('common.close')}
          onClose={closeDrawer}
        >

              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">{t('common.status')}</span>
                  <StatusBadge status={selectedIssue.status} />
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">{t('common.priority')}</span>
                  <PriorityBadge priority={selectedIssue.priority} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">{t('issueDrawer.description')}</p>
                <p className="text-sm text-foreground leading-relaxed">{selectedIssue.description}</p>
              </div>

              <IssuePhotos issueId={selectedIssue.id} count={selectedIssue.photoCount ?? 0} load={loadIssuePhotos} />
              <IssueComments issueId={selectedIssue.id} load={loadIssueComments} add={addIssueComment} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{t('common.outlet')}</p>
                  <p className="text-sm font-semibold text-foreground">{selectedIssue.outlet}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{t('common.category')}</p>
                  <p className="text-sm font-semibold text-foreground">{label('category', selectedIssue.category)}</p>
                </div>
                <div className="col-span-2">
                  {/* A user, so they are actually notified (Todo-Pilot §17) */}
                  {can.updateIssueStatus && !FINAL_STATUSES.includes(selectedIssue.status) ? (
                    <>
                      <label htmlFor="issue-assignee" className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{t('issueDrawer.assignedTo')}</label>
                      <AssigneePicker
                        id="issue-assignee"
                        outlet={selectedIssue.outlet}
                        value={selectedIssue.assigneeUserId ?? null}
                        legacyName={selectedIssue.assignee}
                        onChange={(userId) => {
                          assignIssue(selectedIssue.id, userId).catch((e) => toast.error(apiErrorMessage(e)))
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{t('issueDrawer.assignedTo')}</p>
                      <p className="text-sm font-semibold text-foreground">{selectedIssue.assignee}</p>
                      <UnlinkedAssigneeNote record={selectedIssue} />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">{t('common.createdDate')}</span>
                  <span className="text-sm">{date(selectedIssue.createdDate)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">{t('common.dueDate')}</span>
                  <span className="text-sm">{date(selectedIssue.dueDate)}</span>
                </div>
              </div>

              {(linkedTasks.length > 0 || linkedApproval || linkedWorkOrders.length > 0) && (
                <div className="space-y-3 pb-6 border-b border-border">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" /> {t('issueDrawer.linkedRecords')}
                  </p>
                  {linkedTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 border border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckSquare className="size-3.5 text-primary flex-shrink-0" />
                        <span className="text-xs font-mono font-bold text-primary truncate">{task.number}</span>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))}
                  {linkedApproval && (
                    <LinkedRow to={canViewPage('approvals') ? recordPath('approvals', linkedApproval.id) : null}>
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="size-3.5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
                        <span className="text-xs font-mono font-bold text-primary truncate">{linkedApproval.number}</span>
                      </div>
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                        linkedApproval.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                        linkedApproval.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      )}>
                        {label('approvalStatus', linkedApproval.status)}
                      </span>
                    </LinkedRow>
                  )}
                  {linkedWorkOrders.map((wo) => (
                    <LinkedRow key={wo.id} to={canViewPage('cmms') ? recordPath('cmms', wo.id) : null}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Wrench className="size-3.5 text-blue-600 flex-shrink-0" />
                        <span className="text-xs font-mono font-bold text-primary truncate">{wo.number}</span>
                      </div>
                      <StatusBadge status={wo.status} />
                    </LinkedRow>
                  ))}
                </div>
              )}

              {selectedIssue.slaBreach && (
                <div className="p-4 rounded-md bg-red-100/50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 space-y-2">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="size-4" /> {t('issueDrawer.slaBreached')}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400">{t('issueDrawer.slaText')}</p>
                </div>
              )}

              {selectedIssue.readyToClose && (
                <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-400 flex items-start gap-2">
                  <CheckCircle2 className="size-4 flex-shrink-0" />
                  <span>{t('issueDrawer.readyText')}</span>
                </div>
              )}

              {selectedIssue.closureBlockers.length > 0 && !FINAL_STATUSES.includes(selectedIssue.status) && (
                <div className="p-4 rounded-md bg-amber-100/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                    <Lock className="size-4" /> {t('issueDrawer.blockedTitle')}
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-400">{t('issueDrawer.blockedText')}</p>
                  <ul className="space-y-1">
                    {selectedIssue.closureBlockers.map((b) => (
                      <li key={b.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-amber-900 dark:text-amber-400">{b.number}</span>
                        <span className="text-amber-800 dark:text-amber-400">{t(`blocker.${b.type}` as MessageKey)} · {label(b.type === 'work_order' ? 'woStatus' : b.type === 'approval' ? 'approvalStatus' : 'status', b.status)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {can.updateIssueStatus && !FINAL_STATUSES.includes(selectedIssue.status) && (
                <div className="flex flex-col gap-2 pt-6 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('issueDrawer.updateStatus')}</p>
                  <div className="relative">
                    <button
                      onClick={() => setStatusDropdownOpen((o) => !o)}
                      aria-haspopup="listbox"
                      aria-expanded={statusDropdownOpen}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-md border border-border text-sm font-semibold bg-background hover:bg-muted/50 transition-colors"
                    >
                      <StatusBadge status={selectedIssue.status} />
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </button>
                    {statusDropdownOpen && (
                      <div role="listbox" aria-label={t('issueDrawer.updateStatus')} className="absolute left-0 right-0 top-full mt-1 z-10 rounded-md border border-border bg-popover shadow-md overflow-hidden">
                        {statusOptions(selectedIssue.status).map((s) => {
                          const blocked = CLOSING_STATUSES.includes(s) && selectedIssue.closureBlockers.length > 0
                          return (
                            <button
                              key={s}
                              role="option"
                              aria-selected={selectedIssue.status === s}
                              disabled={blocked}
                              aria-describedby={blocked ? `${selectedIssue.id}-blocked` : undefined}
                              onClick={() => {
                                setStatusDropdownOpen(false)
                                if (s === selectedIssue.status) return
                                const issueId = selectedIssue.id
                                // A closed Issue cannot be reopened: a few seconds to undo (Todo-Pilot §23).
                                if (s === 'closed') {
                                  runWithUndo({
                                    message: t('issues.closingOne', { number: selectedIssue.number }),
                                    undoLabel: t('common.undo'),
                                    run: () => updateIssueStatus(issueId, 'closed'),
                                    onUndo: () => toast.info(t('issues.closeUndone')),
                                  })
                                } else {
                                  updateIssueStatus(issueId, s)
                                }
                              }}
                              className={cn(
                                'w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                                selectedIssue.status === s && 'bg-muted'
                              )}
                            >
                              <StatusBadge status={s} />
                              {blocked && <Lock className="size-3.5 text-muted-foreground" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  {closeBlockedReason(selectedIssue.closureBlockers) && (
                    <p id={`${selectedIssue.id}-blocked`} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Lock className="size-3.5 mt-0.5 shrink-0" />
                      {(() => { const r = closeBlockedReason(selectedIssue.closureBlockers)!; return t(r.key, r.params) })()}
                    </p>
                  )}
                </div>
              )}

              {can.updateIssueStatus && (
                <div className="flex flex-col gap-2">
                  {lifecycleAction === null ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedIssue.status === 'waiting' && linkedApproval?.status === 'rejected' && (
                        <button onClick={() => openAction('revise')} className="flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted/50">
                          <RefreshCw className="size-3.5" /> {t('issueDrawer.reviseCost')}
                        </button>
                      )}
                      {selectedIssue.status === 'resolved' && (
                        <button onClick={() => openAction('reopen')} className="flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted/50">
                          <RotateCcw className="size-3.5" /> {t('issueDrawer.reopen')}
                        </button>
                      )}
                      {!FINAL_STATUSES.includes(selectedIssue.status) && (
                        <button onClick={() => openAction('cancel')} className="flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40">
                          <Ban className="size-3.5" /> {t('issueDrawer.cancelIssue')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 rounded-2xl border border-border bg-card">
                      <p className="text-xs font-semibold">
                        {lifecycleAction === 'cancel' && t('issueDrawer.cancelConfirm')}
                        {lifecycleAction === 'reopen' && t('issueDrawer.reopenConfirm')}
                        {lifecycleAction === 'revise' && t('issueDrawer.reviseConfirm')}
                      </p>
                      {lifecycleAction === 'revise' && (
                        <input
                          type="number" min={0} value={actionAmount}
                          onChange={(e) => setActionAmount(e.target.value)}
                          placeholder={t('issueDrawer.revisedAmount')}
                          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                        />
                      )}
                      <textarea
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        rows={2}
                        placeholder={lifecycleAction === 'reopen' ? t('issueDrawer.reasonRequired') : t('issueDrawer.reasonOptional')}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setLifecycleAction(null)} disabled={actionBusy} className="px-3.5 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted/50">
                          {t('common.back')}
                        </button>
                        <button
                          onClick={runAction}
                          disabled={
                            actionBusy
                            || (lifecycleAction === 'reopen' && !actionReason.trim())
                            || (lifecycleAction === 'revise' && (actionAmount === '' || Number(actionAmount) < 0))
                          }
                          className={cn(
                            'px-3.5 h-9 rounded-lg text-sm font-semibold disabled:opacity-50',
                            lifecycleAction === 'cancel' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          )}
                        >
                          {actionBusy ? t('common.saving') : t('common.confirm')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
        </SideDrawer>
      )}

      <CreateIssueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        outlets={myOutlets.map((o) => o.name)}
        approvalThresholds={approvalThresholdsByOutlet(myOutlets)}
        assets={assets}
        defaultSystemKey={viewDef?.systemKey}
        onSubmit={handleCreate}
        quick={quickReport}
        whatsappOptIn={Boolean(currentUser?.whatsapp_number)}
        onUploadPhoto={(issueId, file) => uploadIssuePhoto(issueId, file)}
        resolveQr={resolveQr}
      />
    </div>
  )
}

// Lifecycle rules mirrored from the API (Todo-Pilot §1–2): closed/cancelled are
// final, a resolved Issue can only be closed (or reopened via its own action),
// and resolved/closed need every derived record finished.
const FINAL_STATUSES: IssueStatus[] = ['closed', 'cancelled']
const CLOSING_STATUSES: IssueStatus[] = ['resolved', 'closed']

function statusOptions(current: IssueStatus): IssueStatus[] {
  if (current === 'resolved') return ['resolved', 'closed']
  return ['open', 'assigned', 'in-progress', 'waiting', 'resolved', 'closed']
}

// A linked record in the Issue drawer; opens that record when the user may view
// its page (Todo-Pilot §14).
function LinkedRow({ to, children }: { to: string | null; children: React.ReactNode }) {
  const cls = 'w-full flex items-center justify-between p-2.5 rounded-md bg-muted/30 border border-border'
  if (!to) return <div className={cls}>{children}</div>
  return (
    <button type="button" onClick={() => navigate(to)} className={cn(cls, 'text-left hover:bg-muted/60 transition-colors')}>
      {children}
    </button>
  )
}
