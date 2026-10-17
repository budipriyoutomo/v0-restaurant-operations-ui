'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Search, AlertCircle, Wrench, Calendar, User, Plus, GripVertical, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { issueModule } from '@/lib/categories'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { useMyOutlets, usePermissions } from '@/lib/permissions'
import { Issue, IssueStatus, Priority } from '@/lib/types'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateWorkOrderDialog } from '@/components/dialogs/create-work-order-dialog'
import { CreateIssueDialog } from '@/components/dialogs/create-issue-dialog'
import { UnlinkedAssigneeNote } from '@/components/shared/unlinked-assignee-note'
import { approvalThresholdsByOutlet } from '@/lib/outlet-threshold'
import { statusLabel, translate, useT, type Locale } from '@/lib/i18n'
import { SideDrawer } from '@/components/shared/side-drawer'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar, FilterSelect } from '@/components/shared/filter-menu'
import { StatusBoard, type CardDrag } from '@/components/shared/status-board'
import { useUrlState } from '@/lib/use-route'

// Theme-aware status presentation — matches the Task Center kanban.
const STATUS_META: Record<IssueStatus, { dot: string; accent: string; ring: string }> = {
  open:          { dot: 'bg-blue-500',    accent: 'border-t-blue-500',    ring: 'ring-blue-500/40' },
  assigned:      { dot: 'bg-violet-500',  accent: 'border-t-violet-500',  ring: 'ring-violet-500/40' },
  'in-progress': { dot: 'bg-amber-500',   accent: 'border-t-amber-500',   ring: 'ring-amber-500/40' },
  waiting:       { dot: 'bg-cyan-500',    accent: 'border-t-cyan-500',    ring: 'ring-cyan-500/40' },
  resolved:      { dot: 'bg-emerald-500', accent: 'border-t-emerald-500', ring: 'ring-emerald-500/40' },
  closed:        { dot: 'bg-slate-400',   accent: 'border-t-slate-400',   ring: 'ring-slate-400/40' },
  cancelled:     { dot: 'bg-rose-400',    accent: 'border-t-rose-400',    ring: 'ring-rose-400/40' },
}

// Maintenance board shows the active pipeline only — 'closed' issues drop off the board.
const COLUMN_ORDER: IssueStatus[] = ['open', 'assigned', 'in-progress', 'waiting', 'resolved']
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

export function MaintenanceModulePage() {
  useEnsureLoaded('core', 'cmms')
  const { issues, updateIssueStatus, workOrders, assets, pics, createWorkOrder, createIssue, categories } = useIssueStore()
  const { can } = usePermissions()
  const { t, label, status, date, locale } = useT()
  const myOutlets = useMyOutlets()
  // Id only — the drawer reads the store's latest copy (status, closureBlockers).
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIssue = selectedId ? issues.find((i) => i.id === selectedId) ?? null : null
  const setSelectedIssue = (issue: Issue | null) => setSelectedId(issue?.id ?? null)
  const [showReport, setShowReport] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | null>(null)
  const [showCreateWO, setShowCreateWO] = useState(false)
  // Phones: the status tab, in the URL so refresh and Back keep it
  const [shownStatus, setShownStatus] = useUrlState('status', null)

  // Every category of the maintenance module (Maintenance, HVAC, …), whatever its name (P1).
  const maintenanceIssues = issues.filter((i) => issueModule(i, categories) === 'maintenance')

  const filtered = maintenanceIssues.filter((i) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      i.number.toLowerCase().includes(q) ||
      i.title.toLowerCase().includes(q) ||
      i.outlet.toLowerCase().includes(q)
    const matchesPriority = !filterPriority || i.priority === filterPriority
    return matchesSearch && matchesPriority
  })

  const byStatus = COLUMN_ORDER.map((id) => ({
    id,
    ...STATUS_META[id],
    label: status(id),
    items: filtered.filter((i) => i.status === id),
  }))

  const stats = {
    total:    maintenanceIssues.length,
    critical: maintenanceIssues.filter((i) => i.priority === 'critical').length,
    overdue:  maintenanceIssues.filter((i) => i.slaBreach && i.status !== 'resolved' && i.status !== 'closed').length,
  }

  // Work orders linked to the currently selected issue
  const linkedWOs = selectedIssue
    ? workOrders.filter((wo) => wo.issueId === selectedIssue.id)
    : []

  const hasFilters = !!searchQuery || !!filterPriority

  function handleDrop(issueId: string, target: IssueStatus) {
    const issue = maintenanceIssues.find((i) => i.id === issueId)
    if (issue && issue.status !== target) {
      const why = moveBlockedReason(issue, target, locale)
      if (why) toast.error(why)
      else updateIssueStatus(issueId, target)
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title={t('maintenance.title')}
        description={t('maintenance.subtitle')}
        actions={<button
          onClick={() => setShowReport(true)}
          // Phones: floating, thumb-sized and always on screen (Todo-Pilot §15)
          className="flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors fixed bottom-20 right-4 z-30 h-14 px-5 rounded-full shadow-lg text-sm sm:static sm:h-10 sm:px-4 sm:rounded-lg sm:shadow-sm"
        >
          <Plus className="size-4" /> {t('maintenance.report')}
        </button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t('maintenance.totalIssues')}</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t('maintenance.critical')}</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t('maintenance.slaBreached')}</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.overdue}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('maintenance.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-transparent bg-muted/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-colors"
          />
        </div>

        <FilterBar>
          <FilterSelect label={t('issues.priorityFilter')} allLabel={t('common.all')} value={filterPriority}
            options={PRIORITIES.map((p) => ({ value: p, label: label('priority', p) }))}
            onChange={setFilterPriority} />
          {hasFilters && (
            <button
              onClick={() => { setSearchQuery(''); setFilterPriority(null) }}
              className="flex items-center gap-1 h-10 sm:h-9 px-3 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="size-3" /> {t('tasks.clear')}
            </button>
          )}
        </FilterBar>
      </div>

      {/* Empty state */}
      {maintenanceIssues.length === 0 && (
        <EmptyState icon={Wrench} title={t('maintenance.empty')} description={t('maintenance.emptyHint')} />
      )}

      {/* Kanban on a wide screen; status tabs + one list on a phone */}
      {maintenanceIssues.length > 0 && (
        <StatusBoard
          label={t('maintenance.title')}
          columns={byStatus}
          getId={(issue) => issue.id}
          value={COLUMN_ORDER.includes(shownStatus as IssueStatus) ? shownStatus as IssueStatus : null}
          onValueChange={setShownStatus}
          onDrop={can.updateIssueStatus ? handleDrop : undefined}
          emptyText={t('maintenance.noIssues')}
          dropHereText={t('tasks.dropHere')}
          renderCard={(issue, drag) => (
            <IssueCard
              issue={issue}
              woCount={workOrders.filter((wo) => wo.issueId === issue.id).length}
              isSelected={selectedIssue?.id === issue.id}
              drag={drag}
              onSelect={() => setSelectedIssue(issue)}
            />
          )}
        />
      )}

      {/* Detail Panel */}
      {selectedIssue && (
        <SideDrawer
          label={`${t('term.issue')} ${selectedIssue.number}`}
          number={selectedIssue.number}
          title={selectedIssue.title}
          closeLabel={t('common.close')}
          onClose={() => setSelectedIssue(null)}
        >
            {/* Status + Priority */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">{t('common.status')}</span>
                {can.updateIssueStatus && !LOCKED_STATUSES.includes(selectedIssue.status) ? (
                  <select
                    value={selectedIssue.status}
                    onChange={(e) => updateIssueStatus(selectedIssue.id, e.target.value as IssueStatus)}
                    className="h-9 text-sm border border-border rounded-lg px-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {COLUMN_ORDER.map((id) => (
                      <option key={id} value={id} disabled={id !== selectedIssue.status && !!moveBlockedReason(selectedIssue, id)}>
                        {status(id)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <StatusBadge status={selectedIssue.status} />
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">{t('common.priority')}</span>
                <PriorityBadge priority={selectedIssue.priority} />
              </div>
            </div>

            {/* Meta */}
            <div className="border-t border-border pt-4 space-y-3 text-xs">
              <div>
                <p className="text-muted-foreground font-medium mb-1">{t('common.description')}</p>
                <p className="text-foreground leading-relaxed">{selectedIssue.description || '—'}</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <span className="font-semibold">{selectedIssue.assignee || t('common.unassigned')}</span>
                </div>
                <UnlinkedAssigneeNote record={selectedIssue} />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('maintenance.due', { date: date(selectedIssue.dueDate) })}</span>
              </div>
              {selectedIssue.slaBreach && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-4" />
                  <span className="font-semibold">{t('maintenance.slaBreached')}</span>
                </div>
              )}
            </div>

            {/* Issue reference */}
            <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs">
              <p className="text-blue-700 dark:text-blue-300 font-medium">{t('maintenance.issueRef')}</p>
              <p className="text-blue-700 dark:text-blue-300 font-mono font-bold mt-0.5">{selectedIssue.number}</p>
              <p className="text-blue-600 dark:text-blue-400 mt-0.5">{selectedIssue.outlet}</p>
            </div>

            {/* ----------------------------------------------------------------
                Linked Work Orders
            ----------------------------------------------------------------- */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <p className="text-xs font-semibold">
                  {t('maintenance.workOrders')}
                  <span className="ml-1.5 text-muted-foreground font-normal">({linkedWOs.length})</span>
                </p>
                {can.manageCMMS && (
                  <button
                    onClick={() => setShowCreateWO(true)}
                    className="flex items-center gap-1 px-2.5 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="size-3" /> {t('maintenance.createWo')}
                  </button>
                )}
              </div>

              {linkedWOs.length === 0 ? (
                <div className="text-center py-6 rounded-md border border-dashed border-border">
                  <Wrench className="size-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{t('maintenance.noWos')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {can.manageCMMS ? t('maintenance.noWosManager') : t('maintenance.noWosStaff')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedWOs.map((wo) => (
                    <div
                      key={wo.id}
                      className="p-3 rounded-2xl border border-border bg-card text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-muted-foreground">{wo.number}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            'px-2 py-0.5 rounded-md text-xs font-semibold',
                            wo.type === 'preventive' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            {label('woType', wo.type)}
                          </span>
                          <StatusBadge status={wo.status} />
                        </div>
                      </div>
                      <p className="font-medium line-clamp-1">{wo.title}</p>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="truncate">{wo.assetName}</span>
                        <span className="flex-shrink-0 ml-2">{wo.assignee}</span>
                      </div>
                      {wo.scheduledDate && (
                        <p className="text-muted-foreground">{t('maintenance.scheduled')} <span>{date(wo.scheduledDate)}</span></p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
        </SideDrawer>
      )}

      {/* Create Work Order dialog — pre-linked to selected issue */}
      <CreateWorkOrderDialog
        open={showCreateWO}
        onOpenChange={setShowCreateWO}
        assets={assets}
        defaultIssueId={selectedIssue?.id}
        defaultIssueNumber={selectedIssue?.number}
        onSubmit={async (input) => { await createWorkOrder(input) }}
      />

      <CreateIssueDialog
        open={showReport}
        onOpenChange={setShowReport}
        defaultSystemKey="maintenance"
        outlets={myOutlets.map((o) => o.name)}
        approvalThresholds={approvalThresholdsByOutlet(myOutlets)}
        assets={assets}
        onSubmit={async (input) => { await createIssue(input) }}
      />
    </div>
  )
}

// Board moves mirror the API's Issue lifecycle (Todo-Pilot §1–2): a resolved
// Issue is closed or reopened from the Issues page, and nothing reaches
// `resolved` while a Task / WO / Approval of it is still open.
const LOCKED_STATUSES: IssueStatus[] = ['resolved', 'closed', 'cancelled']

function moveBlockedReason(issue: Issue, target: IssueStatus, locale: Locale = 'en'): string | null {
  if (LOCKED_STATUSES.includes(issue.status)) {
    return translate(locale, 'maintenance.lockedMove', { number: issue.number, status: statusLabel(locale, issue.status) })
  }
  if (target === 'resolved' && issue.closureBlockers.length > 0) {
    return translate(locale, 'maintenance.openWork', { number: issue.number, list: issue.closureBlockers.map((b) => b.number).join(', ') })
  }
  return null
}

function IssueCard({
  issue,
  woCount,
  isSelected,
  drag,
  onSelect,
}: {
  issue: Issue
  woCount: number
  isSelected: boolean
  drag: CardDrag
  onSelect: () => void
}) {
  const { t } = useT()
  return (
    <div
      draggable={drag.draggable}
      onClick={onSelect}
      onDragStart={drag.onDragStart}
      onDragEnd={drag.onDragEnd}
      className={cn(
        'group rounded-lg border bg-card p-3 transition-all hover:shadow-md',
        drag.draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isSelected ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border hover:border-primary/40',
        drag.dragging && 'opacity-50 ring-2 ring-primary rotate-1',
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <Wrench className={cn(
          'size-4 mt-0.5 flex-shrink-0',
          issue.priority === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
        )} />
        <h4 className="font-medium text-sm leading-snug line-clamp-2 flex-1">{issue.title}</h4>
        {drag.draggable && <GripVertical className="size-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />}
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-primary font-semibold">{issue.number}</span>
          <PriorityBadge priority={issue.priority} />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="size-3 flex-shrink-0" />
          <span className="truncate">{issue.assignee || t('common.unassigned')}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="truncate">{issue.outlet}</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {issue.slaBreach && issue.status !== 'resolved' && (
              <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 font-medium">
                <AlertCircle className="size-3" /> SLA
              </span>
            )}
            {woCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Wrench className="size-3" />{woCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
