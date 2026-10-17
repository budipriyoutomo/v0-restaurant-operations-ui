'use client'

import { useEffect, useState, useRef } from 'react'
import { QrCode, Calendar, Wrench, Package, Clock, AlertCircle, Plus, X, CheckSquare, Square, DollarSign, PlayCircle, CheckCircle2, Loader2, Building2, Camera, Lock, Info, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { StatCard } from '@/components/shared/stat-card'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { CreateAssetDialog } from '@/components/dialogs/create-asset-dialog'
import { CreateWorkOrderDialog } from '@/components/dialogs/create-work-order-dialog'
import { PMSchedulePanel } from '@/components/cmms/pm-schedule-panel'
import { CMMSAnalyticsPanel } from '@/components/cmms/cmms-analytics-panel'
import { PartsInventoryPanel } from '@/components/cmms/parts-inventory-panel'
import { AuthedImage } from '@/components/shared/authed-image'
import { QrDialog } from '@/components/cmms/qr-dialog'
import { useIssueStore } from '@/lib/store'
import { TemperaturePanel } from '@/components/ops/temperature-panel'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'
import { woPrimaryAction } from '@/lib/action-reasons'
import { ListSkeleton } from '@/components/shared/skeleton'
import { api, QueuedError } from '@/lib/api-client'
import { Asset, AssetStatus, AssetSummary, WorkOrder, WorkOrderDetail, WorkOrderStatus, WorkOrderPart } from '@/lib/types'
import { usePermissions, useMyOutlets } from '@/lib/permissions'
import { useRecordRoute } from '@/lib/use-route'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { UnlinkedAssigneeNote } from '@/components/shared/unlinked-assignee-note'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

// ---------------------------------------------------------------------------
// Asset status badge
// ---------------------------------------------------------------------------
function assetStatusColor(status: AssetStatus) {
  switch (status) {
    case 'operational': return 'bg-success/15 text-success border-success/30'
    case 'warning':     return 'bg-warning/15 text-warning border-warning/30'
    case 'maintenance': return 'bg-primary/15 text-primary border-primary/30'
    case 'critical':    return 'bg-destructive/15 text-destructive border-destructive/30'
  }
}

// ---------------------------------------------------------------------------
// PM Calendar — marks days that have a scheduled next_pm for any asset
// ---------------------------------------------------------------------------
function PMCalendar({ assets }: { assets: Asset[] }) {
  const { t, locale } = useT()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()   // 0-indexed

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Build a set of days that have an asset's nextPM this month
  const pmDayMap: Record<number, 'pm' | 'overdue'> = {}
  assets.forEach((a) => {
    if (!a.nextPM) return
    const d = new Date(a.nextPM)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      const isOverdue = d < now
      pmDayMap[day] = isOverdue ? 'overdue' : 'pm'
    }
  })

  const monthLabel = now.toLocaleString(locale === 'id' ? 'id-ID' : 'en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{t('pmCalendar.title', { month: monthLabel })}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t('pmCalendar.subtitle')}</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {t('pmCalendar.weekdays').split(',').map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
        {calendarDays.map((day) => {
          const pmType = pmDayMap[day]
          const isToday = day === now.getDate()
          return (
            <div
              key={day}
              className={cn(
                'text-[11px] rounded aspect-square flex items-center justify-center',
                pmType === 'pm'      && 'bg-primary/20 text-primary font-semibold',
                pmType === 'overdue' && 'bg-destructive/20 text-destructive font-semibold',
                !pmType && 'text-muted-foreground',
                isToday && !pmType  && 'ring-1 ring-primary/40 font-semibold text-foreground',
              )}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px]">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary/60" />{t('pmCalendar.scheduled')}</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-destructive/60" />{t('pmCalendar.overdue')}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Work Order detail drawer — slides in from right when a WO row is clicked
// ---------------------------------------------------------------------------
export function WorkOrderDetailDrawer({ woId, onClose }: { woId: string; onClose: () => void }) {
  const {
    transitionWorkOrder, toggleChecklistItem, updateWorkOrderCost, approvals, assignWorkOrder,
    vendors, parts, assignWorkOrderVendor, consumePart, addChecklistItem,
    addWorkOrderAttachment, uploadWorkOrderPhoto, loadWorkOrderParts, loadParts,
  } = useIssueStore()
  const { can } = usePermissions()
  const { t, label, status: statusText, date, dateTime } = useT()
  const [detail, setDetail] = useState<WorkOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [costForm, setCostForm] = useState({ laborHours: '', laborCost: '', partsCost: '' })
  const [savingCost, setSavingCost] = useState(false)

  // Tier 3 state
  const [woParts, setWoParts] = useState<WorkOrderPart[]>([])
  const [partForm, setPartForm] = useState({ partId: '', quantity: '1' })
  const [vendorForm, setVendorForm] = useState({ vendorId: '', slaDue: '' })
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [attachForm, setAttachForm] = useState({ fileUrl: '', caption: '' })
  const [busy, setBusy] = useState<string | null>(null)

  const refreshDetail = async () => {
    const d = await api.get<WorkOrderDetail>(`/api/work-orders/${woId}`)
    setDetail(d)
    return d
  }

  // Fetch WO detail + consumed parts on mount
  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get<WorkOrderDetail>(`/api/work-orders/${woId}`),
      loadWorkOrderParts(woId).catch(() => [] as WorkOrderPart[]),
    ])
      .then(([d, wp]) => {
        if (cancelled) return
        setDetail(d)
        setWoParts(wp)
        setCostForm({ laborHours: String(d.laborHours || ''), laborCost: String(d.laborCost || ''), partsCost: String(d.partsCost || '') })
      })
      .catch((e) => {
        // A shared link to a WO that doesn't exist or is outside the user's
        // company/outlets (the API answers 404) — Todo-Pilot §14.
        if (/^API (404|422) /.test(e instanceof Error ? e.message : '')) setNotFound(true)
        else toast.error(t('wo.loadFailed'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    if (parts.length === 0) loadParts()
    return () => { cancelled = true }
  }, [woId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConsumePart = async () => {
    if (!detail || !partForm.partId) return toast.error(t('wo.pickPart'))
    const qty = Number(partForm.quantity)
    if (!qty || qty < 1) return toast.error(t('wo.badQty'))
    setBusy('part')
    try {
      await consumePart(detail.id, partForm.partId, qty)
      const [d, wp] = await Promise.all([refreshDetail(), loadWorkOrderParts(detail.id)])
      setWoParts(wp)
      setCostForm((p) => ({ ...p, partsCost: String(d.partsCost || '') }))
      setPartForm({ partId: '', quantity: '1' })
      toast.success(t('wo.partUsed'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('wo.partFailed'))
    } finally { setBusy(null) }
  }

  const handleAssignVendor = async () => {
    if (!detail || !vendorForm.vendorId) return toast.error(t('wo.pickVendor'))
    setBusy('vendor')
    try {
      const updated = await assignWorkOrderVendor(detail.id, vendorForm.vendorId, vendorForm.slaDue || undefined)
      setDetail(updated)
      toast.success(t('wo.vendorAssigned'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('wo.vendorFailed'))
    } finally { setBusy(null) }
  }

  const handleAddChecklist = async () => {
    if (!detail || !newChecklistItem.trim()) return
    setBusy('checklist')
    try {
      await addChecklistItem(detail.id, newChecklistItem.trim(), detail.checklistItems.length)
      await refreshDetail()
      setNewChecklistItem('')
    } catch {
      toast.error(t('wo.checklistFailed'))
    } finally { setBusy(null) }
  }

  const handleAddAttachment = async () => {
    if (!detail || !attachForm.fileUrl.trim()) return toast.error(t('wo.urlRequired'))
    setBusy('attach')
    try {
      await addWorkOrderAttachment(detail.id, attachForm.fileUrl.trim(), attachForm.caption || undefined)
      await refreshDetail()
      setAttachForm({ fileUrl: '', caption: '' })
      toast.success(t('wo.attachmentAdded'))
    } catch {
      toast.error(t('wo.attachmentFailed'))
    } finally { setBusy(null) }
  }

  const handleUploadPhoto = async (fileList: FileList | null) => {
    if (!detail || !fileList || fileList.length === 0) return
    setBusy('upload')
    let queued = 0
    try {
      for (const file of Array.from(fileList)) {
        try {
          await uploadWorkOrderPhoto(detail.id, file, attachForm.caption || undefined)
        } catch (e) {
          if (e instanceof QueuedError) { queued += 1; continue }
          throw e
        }
      }
      await refreshDetail().catch(() => {})   // offline: refetch may fail, that's fine
      setAttachForm((a) => ({ ...a, caption: '' }))
      if (queued > 0) toast.message(t('wo.photosQueued', { count: queued }))
      else toast.success(t('wo.photoUploaded'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('wo.photoFailed'))
    } finally { setBusy(null) }
  }

  const linkedApproval = detail?.approvalId
    ? approvals.find(a => a.id === detail.approvalId)
    : null
  // Approvals are not all in the browser any more (Todo-Pilot §22): read this one.
  const fetchApproval = useIssueStore((st) => st.fetchApproval)
  const approvalToFetch = detail?.approvalId && !linkedApproval ? detail.approvalId : null
  useEffect(() => {
    if (approvalToFetch) fetchApproval(approvalToFetch).catch(() => {})
  }, [approvalToFetch, fetchApproval])

  const handleTransition = async (targetStatus: WorkOrderStatus) => {
    if (!detail || transitioning) return
    setTransitioning(true)
    try {
      const updated = await transitionWorkOrder(detail.id, targetStatus)
      setDetail(updated)
      toast.success(targetStatus === 'in-progress' ? t('wo.started') : t('wo.movedTo', { status: statusText(targetStatus).toLowerCase() }))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('wo.transitionFailed'))
    } finally {
      setTransitioning(false)
    }
  }

  const handleToggle = async (itemId: string, isDone: boolean) => {
    if (!detail) return
    try {
      const updated = await toggleChecklistItem(detail.id, itemId, isDone)
      setDetail(updated)
    } catch {
      toast.error(t('wo.checkFailed'))
    }
  }

  const handleSaveCost = async () => {
    if (!detail || savingCost) return
    setSavingCost(true)
    try {
      const updated = await updateWorkOrderCost(detail.id, {
        laborHours: costForm.laborHours ? Number(costForm.laborHours) : undefined,
        laborCost:  costForm.laborCost  ? Number(costForm.laborCost)  : undefined,
        partsCost:  costForm.partsCost  ? Number(costForm.partsCost)  : undefined,
      })
      setDetail(updated)
      toast.success(t('wo.costUpdated'))
    } catch {
      toast.error(t('wo.costFailed'))
    } finally {
      setSavingCost(false)
    }
  }

  const fmt = (n: number) => formatMoney(n)
  const primary = detail ? woPrimaryAction(detail, linkedApproval ?? undefined, can.manageCMMS) : null
  const isDone = detail?.status === 'completed' || detail?.status === 'cancelled'
  // Escape closes, Tab stays in the drawer, focus returns (Todo-Pilot §26)
  const drawerRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(drawerRef, onClose)

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={detail ? `${t('term.workOrder')} ${detail.number}` : t('term.workOrder')}
        className="fixed right-0 top-0 h-screen w-full sm:w-[420px] bg-background border-l border-border shadow-lg z-50 overflow-y-auto"
      >
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 mr-3">
              {loading ? (
                <div className="h-4 bg-muted rounded animate-pulse w-24 mb-2" />
              ) : (
                <p className="font-mono text-xs text-primary font-bold mb-1">{detail?.number}</p>
              )}
              <h2 className="font-bold text-base leading-snug">{detail?.title ?? (notFound ? t('term.workOrder') : '...')}</h2>
            </div>
            <button onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <X className="size-5" />
            </button>
          </div>

          {notFound && (
            <p role="alert" className="text-sm text-muted-foreground">
              {t('notFound.workOrder')}
            </p>
          )}

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-4 bg-muted rounded animate-pulse" />)}
            </div>
          )}

          {detail && (
            <>
              {/* Status + priority row */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={detail.status} />
                <PriorityBadge priority={detail.priority} />
                <span className="text-xs text-muted-foreground">{label('woType', detail.type)}</span>
                {detail.requiresApproval && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                    {t('wo.needsApproval')}
                  </span>
                )}
              </div>

              {/* Linked approval banner for on-hold WOs */}
              {detail.status === 'on-hold' && linkedApproval && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200 space-y-1">
                  <p className="text-xs font-semibold text-amber-700">{t('wo.waitingApproval')}</p>
                  <p className="text-xs text-amber-700">
                    {t('wo.stepOf', {
                      number: linkedApproval.number, step: linkedApproval.currentStepOrder, total: linkedApproval.steps.length,
                      role: (() => { const r = linkedApproval.steps.find(s => s.stepOrder === linkedApproval.currentStepOrder)?.approverRole; return r ? label('tier', r) : t('wo.approver') })(),
                    })}
                  </p>
                </div>
              )}

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs pb-4 border-b border-border">
                <div><p className="text-muted-foreground">{t('wo.asset')}</p><p className="font-semibold mt-0.5">{detail.assetName}</p></div>
                <div><p className="text-muted-foreground">{t('common.outlet')}</p><p className="font-semibold mt-0.5">{detail.outlet}</p></div>
                {/* A user, so the technician is actually notified (Todo-Pilot §17) */}
                <div className="col-span-2">
                  {can.manageCMMS && !isDone ? (
                    <>
                      <label htmlFor="wo-assignee" className="block text-muted-foreground mb-0.5">{t('wo.assignee')}</label>
                      <AssigneePicker
                        id="wo-assignee"
                        outlet={detail.outlet}
                        value={detail.assigneeUserId ?? null}
                        legacyName={detail.assignee}
                        className="w-full px-2 py-1.5 rounded-md border border-border bg-muted/20 text-xs"
                        onChange={(userId) => {
                          assignWorkOrder(detail.id, userId)
                            .then((wo) => setDetail((d) => d && { ...d, assignee: wo.assignee, assigneeUserId: wo.assigneeUserId }))
                            .catch((e) => toast.error(e instanceof Error ? e.message : t('assignee.failed')))
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">{t('wo.assignee')}</p><p className="font-semibold mt-0.5">{detail.assignee}</p>
                      <UnlinkedAssigneeNote record={detail} />
                    </>
                  )}
                </div>
                {detail.scheduledDate && <div><p className="text-muted-foreground">{t('wo.scheduled')}</p><p className="font-semibold mt-0.5">{date(detail.scheduledDate)}</p></div>}
                {detail.downtimeStart && <div><p className="text-muted-foreground">{t('wo.downtimeStart')}</p><p className="font-semibold mt-0.5">{dateTime(detail.downtimeStart)}</p></div>}
                {detail.downtimeEnd && <div><p className="text-muted-foreground">{t('wo.downtimeEnd')}</p><p className="font-semibold mt-0.5">{dateTime(detail.downtimeEnd)}</p></div>}
              </div>

              {/* Cost summary */}
              <div className="space-y-2 pb-4 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold">{t('wo.costBreakdown')}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { key: 'labor', text: t('wo.labor'), value: detail.laborCost },
                    { key: 'parts', text: t('wo.parts'), value: detail.partsCost },
                    { key: 'total', text: t('common.total'), value: detail.totalCost },
                  ].map(({ key, text, value }) => (
                    <div key={key} className={cn('p-2 rounded-md bg-muted/30', key === 'total' && 'bg-primary/5 border border-primary/20')}>
                      <p className="text-muted-foreground">{text}</p>
                      <p className={cn('font-bold mt-0.5', key === 'total' && 'text-primary')}>{fmt(value)}</p>
                    </div>
                  ))}
                </div>
                {detail.estimatedCost && (
                  <p className="text-[10px] text-muted-foreground">{t('wo.estimated', { amount: fmt(detail.estimatedCost) })}</p>
                )}

                {/* Cost edit form — managers only, non-completed */}
                {can.manageCMMS && !isDone && (
                  <details className="group">
                    <summary className="text-[11px] text-primary cursor-pointer hover:underline list-none mt-1">
                      {t('wo.updateCost')}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {[
                        { key: 'laborHours', text: t('wo.laborHours'), placeholder: '2.5' },
                        { key: 'laborCost',  text: t('wo.laborCost'), placeholder: '250000' },
                        { key: 'partsCost',  text: t('wo.partsCost'), placeholder: '150000' },
                      ].map(({ key, text, placeholder }) => (
                        <div key={key}>
                          <label htmlFor={`wo-cost-${key}`} className="block text-[10px] text-muted-foreground mb-1">{text}</label>
                          <input
                            id={`wo-cost-${key}`}
                            type="number"
                            placeholder={placeholder}
                            value={costForm[key as keyof typeof costForm]}
                            onChange={(e) => setCostForm(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full px-2 py-1 text-xs rounded border border-border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                      ))}
                      <button
                        onClick={handleSaveCost}
                        disabled={savingCost}
                        className="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-1"
                      >
                        {savingCost && <Loader2 className="size-3 animate-spin" />}
                        {t('wo.saveCost')}
                      </button>
                    </div>
                  </details>
                )}
              </div>

              {/* Spare parts consumed (Tier 3) */}
              <div className="space-y-2 pb-4 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Package className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold">{t('wo.spareParts')}</p>
                </div>
                {woParts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">{t('wo.noParts')}</p>
                ) : (
                  <div className="space-y-1">
                    {woParts.map((wp) => (
                      <div key={wp.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-muted/30">
                        <span>{wp.partName} <span className="text-muted-foreground">× {wp.quantity}</span></span>
                        <span className="font-semibold">{fmt(wp.lineCost)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {can.manageCMMS && !isDone && (
                  <div className="flex gap-1.5 pt-1">
                    <select
                      value={partForm.partId}
                      onChange={(e) => setPartForm((p) => ({ ...p, partId: e.target.value }))}
                      className="flex-1 h-7 rounded border border-border bg-muted/20 px-1.5 text-[11px]"
                    >
                      <option value="">{t('wo.pickPartOption')}</option>
                      {parts.filter((p) => p.isActive && p.stockQty > 0).map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({t('wo.stock', { qty: p.stockQty })})</option>
                      ))}
                    </select>
                    <input
                      type="number" min={1} value={partForm.quantity}
                      onChange={(e) => setPartForm((p) => ({ ...p, quantity: e.target.value }))}
                      className="w-14 h-7 rounded border border-border bg-muted/20 px-1.5 text-[11px]"
                    />
                    <button
                      onClick={handleConsumePart}
                      disabled={busy === 'part'}
                      className="px-2 h-7 rounded bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 disabled:opacity-60"
                    >
                      {busy === 'part' ? <Loader2 className="size-3 animate-spin" /> : t('wo.use')}
                    </button>
                  </div>
                )}
              </div>

              {/* Vendor / SLA (Tier 3) */}
              <div className="space-y-2 pb-4 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold">{t('wo.vendor')}</p>
                </div>
                {detail.vendorName ? (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-semibold">{detail.vendorName}</span>
                    {detail.slaDue && (
                      <span className="text-muted-foreground text-[11px]">{t('wo.slaDue', { date: date(detail.slaDue) })}</span>
                    )}
                    {detail.slaMet !== null && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-semibold border',
                        detail.slaMet
                          ? 'bg-success/15 text-success border-success/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30',
                      )}>
                        {detail.slaMet ? t('wo.slaMet') : t('wo.slaMissed')}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">{t('wo.internal')}</p>
                )}
                {can.manageCMMS && !isDone && (
                  <div className="flex gap-1.5 pt-1">
                    <select
                      value={vendorForm.vendorId}
                      onChange={(e) => setVendorForm((v) => ({ ...v, vendorId: e.target.value }))}
                      className="flex-1 h-7 rounded border border-border bg-muted/20 px-1.5 text-[11px]"
                    >
                      <option value="">{t('wo.pickVendorOption')}</option>
                      {vendors.filter((v) => v.is_active).map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                    <input
                      type="date" value={vendorForm.slaDue}
                      onChange={(e) => setVendorForm((v) => ({ ...v, slaDue: e.target.value }))}
                      className="h-7 rounded border border-border bg-muted/20 px-1.5 text-[11px]"
                    />
                    <button
                      onClick={handleAssignVendor}
                      disabled={busy === 'vendor'}
                      className="px-2 h-7 rounded bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 disabled:opacity-60"
                    >
                      {busy === 'vendor' ? <Loader2 className="size-3 animate-spin" /> : t('wo.assignVendor')}
                    </button>
                  </div>
                )}
              </div>

              {/* Checklist */}
              {(detail.checklistItems.length > 0 || (can.manageCMMS && !isDone)) && (
                <div className="space-y-2 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{t('wo.checklist')}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('wo.checklistDone', { done: detail.checklistItems.filter(i => i.isDone).length, total: detail.checklistItems.length })}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {detail.checklistItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => !isDone && handleToggle(item.id, !item.isDone)}
                        disabled={isDone}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border text-xs text-left transition-colors',
                          item.isDone
                            ? 'bg-success/5 border-success/30 text-muted-foreground'
                            : 'bg-muted/20 border-border hover:bg-muted/40',
                          isDone && 'cursor-default',
                        )}
                      >
                        {item.isDone
                          ? <CheckSquare className="size-3.5 text-success flex-shrink-0" />
                          : <Square className="size-3.5 text-muted-foreground flex-shrink-0" />}
                        <span className={cn('flex-1', item.isDone && 'line-through')}>{item.title}</span>
                        {item.doneAt && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {date(item.doneAt)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Add checklist item */}
                  {can.manageCMMS && !isDone && (
                    <div className="flex gap-1.5 pt-1">
                      <input
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklist() }}
                        placeholder={t('wo.addChecklist')}
                        className="flex-1 h-7 rounded border border-border bg-muted/20 px-2 text-[11px]"
                      />
                      <button
                        onClick={handleAddChecklist}
                        disabled={busy === 'checklist' || !newChecklistItem.trim()}
                        className="px-2 h-7 rounded border border-border text-[11px] font-semibold hover:bg-accent disabled:opacity-50"
                      >
                        {busy === 'checklist' ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              <div className="space-y-2 pb-4 border-b border-border">
                <p className="text-xs font-semibold">{t('wo.photos')}</p>
                {detail.attachments.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">{t('wo.noAttachments')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {detail.attachments.map((att) => (
                      att.isUpload ? (
                        <a
                          key={att.id}
                          href="#"
                          onClick={async (e) => { e.preventDefault(); if (att.fileUrl) window.open(await api.objectUrl(att.fileUrl), '_blank') }}
                          title={att.caption ?? ''}
                          className="group relative block aspect-square rounded overflow-hidden border border-border"
                        >
                          <AuthedImage path={att.thumbnailUrl || att.fileUrl || ''} alt={att.caption ?? t('wo.photo')} className="w-full h-full object-cover" />
                          {att.caption && (
                            <span className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate">{att.caption}</span>
                          )}
                        </a>
                      ) : (
                        <a
                          key={att.id} href={att.fileUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center aspect-square rounded border border-border bg-muted/30 text-[10px] text-primary hover:underline p-1 text-center break-all"
                        >
                          {att.caption || t('wo.link')}
                        </a>
                      )
                    ))}
                  </div>
                )}

                {/* Upload a real photo (Tier 5.1) — camera on mobile, file picker on desktop */}
                <input
                  value={attachForm.caption}
                  onChange={(e) => setAttachForm((a) => ({ ...a, caption: e.target.value }))}
                  placeholder={t('wo.captionPlaceholder')}
                  className="w-full h-7 rounded border border-border bg-muted/20 px-2 text-[11px] mt-1"
                />
                <label className="flex items-center justify-center gap-1.5 px-2 h-8 rounded-md border border-dashed border-border text-[11px] font-semibold cursor-pointer hover:bg-accent transition-colors">
                  {busy === 'upload' ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                  {busy === 'upload' ? t('wo.uploading') : t('wo.takePhoto')}
                  <input
                    type="file" accept="image/*" capture="environment" multiple
                    disabled={busy === 'upload'}
                    onChange={(e) => { handleUploadPhoto(e.target.files); e.target.value = '' }}
                    className="hidden"
                  />
                </label>

                {/* Fallback: attach an external URL (documents/links) */}
                <details className="group">
                  <summary className="text-[10px] text-muted-foreground cursor-pointer hover:underline list-none">{t('wo.linkUrl')}</summary>
                  <div className="flex gap-1.5 pt-1.5">
                    <input
                      value={attachForm.fileUrl}
                      onChange={(e) => setAttachForm((a) => ({ ...a, fileUrl: e.target.value }))}
                      placeholder="https://…"
                      className="flex-1 h-7 rounded border border-border bg-muted/20 px-2 text-[11px]"
                    />
                    <button
                      onClick={handleAddAttachment}
                      disabled={busy === 'attach'}
                      className="px-2 h-7 rounded border border-border text-[11px] font-semibold hover:bg-accent disabled:opacity-50"
                    >
                      {busy === 'attach' ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                    </button>
                  </div>
                </details>
              </div>

              {/* Next step — stays at the bottom of the screen on a phone (Todo-Pilot §15).
                  When it is not possible, the button says why before anyone taps (§23). */}
              {primary && (
                <div className="sticky bottom-0 -mx-5 px-5 py-3 bg-background/95 backdrop-blur border-t border-border z-10 space-y-1.5">
                <button
                  onClick={() => handleTransition(primary.target)}
                  disabled={transitioning || primary.reason !== null}
                  aria-describedby={primary.reason || primary.warning ? `${detail.id}-why` : undefined}
                  className={cn(
                    'w-full min-h-11 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                    primary.reason
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : primary.kind === 'complete'
                        ? 'bg-success text-white hover:bg-success/90'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    (transitioning) && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> :
                   primary.reason ? <Lock className="size-4" /> :
                   primary.kind === 'complete' ? <CheckCircle2 className="size-4" /> :
                   <PlayCircle className="size-4" />}
                  {primary.reason && primary.reason.key !== 'wo.reasonNoPermission'
                    ? t('wo.waitingForApproval')
                    : primary.kind === 'start' ? t('wo.start') : primary.kind === 'resume' ? t('wo.resume') : t('wo.markCompleted')}
                </button>
                {(primary.reason || primary.warning) && (
                  <p id={`${detail.id}-why`} className={cn('text-xs flex items-start gap-1.5', primary.reason ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400')}>
                    {primary.reason ? <Info className="size-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />}
                    {primary.reason ? t(primary.reason.key, primary.reason.params) : t(primary.warning!.key, primary.warning!.params)}
                  </p>
                )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Expandable asset detail panel (inline)
// ---------------------------------------------------------------------------
function AssetDetailPanel({ asset, onClose, onSelectWO }: { asset: Asset; onClose: () => void; onSelectWO: (woId: string) => void }) {
  const { workOrders, loadAssetHistory, loadAssetSummary } = useIssueStore()
  const liveAsset = useIssueStore((s) => s.assets.find((a) => a.id === asset.id)) ?? asset
  const { t, label, date } = useT()
  const [summary, setSummary] = useState<AssetSummary | null>(null)
  const [history, setHistory] = useState<WorkOrder[] | null>(null)

  // Server-authoritative history + cost/downtime rollup for this asset.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      loadAssetSummary(asset.id).catch(() => null),
      loadAssetHistory(asset.id).catch(() => null),
    ]).then(([s, h]) => {
      if (cancelled) return
      setSummary(s)
      setHistory(h ? h.items : null)
    })
    return () => { cancelled = true }
  }, [asset.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fall back to the store cache if the history call failed.
  const linkedWOs = history ?? workOrders.filter((wo) => wo.assetId === asset.id)
  const rp = (n: number) => formatMoney(n ?? 0)

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{asset.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {asset.number} · {asset.category} · {asset.outlet}
            {asset.purchaseCost ? ` · ${t('asset.value', { amount: rp(asset.purchaseCost) })}` : ''}
          </p>
        </div>
        <button onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {/* Maintenance rollup — GET /api/assets/{id}/summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b border-border">
          {[
            { text: t('asset.totalWo'), value: String(summary.totalWorkOrders) },
            { text: t('asset.downtime'), value: `${summary.totalDowntimeHours.toFixed(1)}h` },
            { text: t('asset.totalCost'), value: rp(summary.totalCost) },
            { text: t('asset.wo90'), value: String(summary.workOrdersLast90Days) },
          ].map(({ text, value }) => (
            <div key={text} className="p-2 rounded-md bg-muted/30">
              <p className="text-[10px] text-muted-foreground">{text}</p>
              <p className="text-sm font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
        <div>
          <p className="text-muted-foreground">{t('common.status')}</p>
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold border mt-1 inline-block', assetStatusColor(asset.status))}>
            {label('assetStatus', asset.status)}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground">{t('asset.lastPm')}</p>
          <p className="font-semibold mt-1">{date(asset.lastPM)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('asset.nextPm')}</p>
          <p className={cn('font-semibold mt-1', asset.nextPM && new Date(asset.nextPM) < new Date() ? 'text-destructive' : '')}>
            {date(asset.nextPM)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('asset.installDate')}</p>
          <p className="font-semibold mt-1">{date(asset.installDate)}</p>
        </div>
      </div>

      {asset.brand || asset.model || asset.serialNumber ? (
        <div className="grid grid-cols-3 gap-4 text-xs mb-4 pb-4 border-b border-border">
          {asset.brand     && <div><p className="text-muted-foreground">{t('asset.brand')}</p><p className="font-semibold mt-1">{asset.brand}</p></div>}
          {asset.model     && <div><p className="text-muted-foreground">{t('asset.model')}</p><p className="font-semibold mt-1">{asset.model}</p></div>}
          {asset.serialNumber && <div><p className="text-muted-foreground">{t('asset.serial')}</p><p className="font-semibold mt-1 font-mono">{asset.serialNumber}</p></div>}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold mb-2">{t('asset.workOrders', { count: linkedWOs.length })}</p>
        {linkedWOs.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('asset.noWos')}</p>
        ) : (
          <div className="space-y-1.5">
            {linkedWOs.map((wo) => (
              <button
                key={wo.id}
                onClick={() => onSelectWO(wo.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border text-xs hover:bg-muted/60 transition-colors text-left"
              >
                <span className="font-mono text-muted-foreground w-28 flex-shrink-0">{wo.number}</span>
                <span className="flex-1 font-medium truncate">{wo.title}</span>
                <PriorityBadge priority={wo.priority} />
                <StatusBadge status={wo.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Food safety temperature (Todo-Ops-Checklist Fase 2) — the store's copy, so a settings change shows at once */}
      <TemperaturePanel asset={liveAsset} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main CMMS page
// ---------------------------------------------------------------------------
export function CMMSPage() {
  useEnsureLoaded('cmms', 'vendors')
  const { assets, workOrders, cmmsLoading, outlets, pics, createAsset, createWorkOrder } = useIssueStore()
  const { can } = usePermissions()
  const { t, label, date } = useT()
  // Outlet pickers must only offer outlets this user may write to (Tier 4).
  const myOutlets = useMyOutlets()
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  // The open work order lives in the URL (/work-orders/{id}, Todo-Pilot §14).
  const woRecord = useRecordRoute()
  const selectedWOId = woRecord.recordId
  const setSelectedWOId = (id: string | null) => (id ? woRecord.open(id) : woRecord.close())
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [showAddWO, setShowAddWO] = useState(false)
  // Asset filters (moved here with the old Assets → Physical Assets tab).
  const [filterOutlet, setFilterOutlet] = useState('')
  const [filterAssetStatus, setFilterAssetStatus] = useState<AssetStatus | ''>('')
  // Work order list: open ones by default, everything on demand.
  const [woScope, setWoScope] = useState<'open' | 'all'>('open')
  const [showAllWOs, setShowAllWOs] = useState(false)

  const assetOutlets = [...new Set(assets.map((a) => a.outlet))].sort()
  const filteredAssets = assets.filter((a) =>
    (!filterOutlet || a.outlet === filterOutlet) && (!filterAssetStatus || a.status === filterAssetStatus),
  )

  // KPI derivations
  const openWOs      = workOrders.filter((wo) => wo.status !== 'completed' && wo.status !== 'cancelled')
  const listedWOs    = woScope === 'open' ? openWOs : workOrders
  const visibleWOs   = showAllWOs ? listedWOs : listedWOs.slice(0, 10)
  const overdueWOs   = workOrders.filter((wo) => {
    if (wo.status === 'completed' || wo.status === 'cancelled') return false
    return wo.scheduledDate && new Date(wo.scheduledDate) < new Date()
  })
  const pmCompliance = (() => {
    const pmWOs = workOrders.filter((wo) => wo.type === 'preventive')
    if (pmWOs.length === 0) return 0
    const done = pmWOs.filter((wo) => wo.status === 'completed').length
    return Math.round((done / pmWOs.length) * 100)
  })()

  // Downtime by outlet — hours approximated by count of completed corrective WOs
  const downtimeData = (() => {
    const map: Record<string, number> = {}
    workOrders
      .filter((wo) => wo.type === 'corrective' && wo.status === 'completed')
      .forEach((wo) => { map[wo.outlet] = (map[wo.outlet] ?? 0) + 1 })
    return Object.entries(map)
      .map(([outlet, count]) => ({ outlet: outlet.split(' ')[0], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  })()

  // Technician workload — unique assignees + their open WO count
  const techData = (() => {
    const map: Record<string, number> = {}
    openWOs.forEach((wo) => {
      if (wo.assignee && wo.assignee !== 'Unassigned') {
        map[wo.assignee] = (map[wo.assignee] ?? 0) + 1
      }
    })
    const maxJobs = Math.max(1, ...Object.values(map))
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, jobs]) => ({
        name,
        avatar: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
        jobs,
        utilization: Math.round((jobs / maxJobs) * 100),
      }))
  })()

  if (cmmsLoading && assets.length === 0 && workOrders.length === 0) return <ListSkeleton rows={5} />

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">CMMS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('cmms.subtitle')}
          </p>
        </div>
        {/* Header actions — need assets:manage / cmms:manage on the backend, so
            roles without them must not be offered a button that 403s. */}
        {(can.manageCMMS || can.manageAssets) && (
          <div className="flex items-center justify-end gap-2">
            {can.manageCMMS && <button
              onClick={() => setShowAddWO(true)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors"
            >
              <Plus className="size-3.5" /> {t('cmms.newWo')}
            </button>}
            {can.manageAssets && <button
              onClick={() => setShowAddAsset(true)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-3.5" /> {t('cmms.addAsset')}
            </button>}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title={t('cmms.totalAssets')} value={String(assets.length)} subtitle={t('cmms.registered')} icon={Package} />
        <StatCard title={t('cmms.openWos')} value={String(openWOs.length)} subtitle={t('cmms.overdueCount', { count: overdueWOs.length })} icon={Wrench} variant={overdueWOs.length > 0 ? 'warning' : undefined} />
        <StatCard title={t('cmms.pmCompliance')} value={`${pmCompliance}%`} subtitle={t('cmms.pmCompleted')} icon={Calendar} variant="success" />
        <StatCard title={t('cmms.correctiveWos')} value={String(workOrders.filter((wo) => wo.type === 'corrective').length)} subtitle={t('cmms.allTime')} icon={Clock} variant="critical" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asset table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{t('cmms.assetStatus')}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterOutlet}
                onChange={(e) => setFilterOutlet(e.target.value)}
                className="h-7 text-xs rounded-md border border-border bg-background px-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">{t('cmms.allOutlets')}</option>
                {assetOutlets.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <select
                value={filterAssetStatus}
                onChange={(e) => setFilterAssetStatus(e.target.value as AssetStatus | '')}
                className="h-7 text-xs rounded-md border border-border bg-background px-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">{t('cmms.allStatuses')}</option>
                {(['operational', 'warning', 'maintenance', 'critical'] as AssetStatus[]).map((st) => (
                  <option key={st} value={st}>{label('assetStatus', st)}</option>
                ))}
              </select>
              <button
                onClick={() => setShowQr(true)}
                className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors">
                <QrCode className="size-3" /> {t('cmms.scanQr')}
              </button>
            </div>
          </div>

          {assets.length === 0 ? (
            <div role="status" className="rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1.5 py-16 px-4 text-center">
              <p className="text-sm font-medium">{t('cmms.noAssets')}</p>
              <p className="text-xs text-muted-foreground max-w-sm">{t('cmms.noAssetsHint')}</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border flex items-center justify-center py-16 text-xs text-muted-foreground">
              {t('cmms.noAssetsMatch')}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{t('wo.asset')}</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{t('common.outlet')}</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{t('common.status')}</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{t('asset.lastPm')}</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{t('asset.nextPm')}</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{t('cmms.wos')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAssets.map((asset) => {
                    const woCount = workOrders.filter((wo) => wo.assetId === asset.id).length
                    const pmOverdue = asset.nextPM && new Date(asset.nextPM) < new Date()
                    return (
                      <tr
                        key={asset.id}
                        className={cn('hover:bg-muted/30 transition-colors cursor-pointer', selectedAsset?.id === asset.id && 'bg-accent/50')}
                        onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-muted-foreground font-mono">{asset.number}</p>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{asset.outlet}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold border', assetStatusColor(asset.status))}>
                            {label('assetStatus', asset.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{date(asset.lastPM)}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn(pmOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                            {date(asset.nextPM)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{woCount}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PM Calendar */}
        <PMCalendar assets={assets} />
      </div>

      {/* PM Schedules — create/manage recurring preventive maintenance */}
      <PMSchedulePanel />

      {/* Spare parts inventory (Tier 3) */}
      <PartsInventoryPanel />

      {/* CMMS Reliability & Cost Analytics (Tier 3) */}
      <CMMSAnalyticsPanel />

      {/* Work Orders + Downtime chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{t('cmms.workOrders')}</h3>
            <div className="flex rounded-md border border-border overflow-hidden text-[11px] font-semibold">
              {(['open', 'all'] as const).map((sc) => (
                <button
                  key={sc}
                  onClick={() => { setWoScope(sc); setShowAllWOs(false) }}
                  className={cn('px-2.5 h-6', woScope === sc ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
                >
                  {sc === 'open' ? t('cmms.openCount', { count: openWOs.length }) : t('cmms.allCount', { count: workOrders.length })}
                </button>
              ))}
            </div>
          </div>
          {listedWOs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {workOrders.length === 0 ? t('cmms.noWosYet') : t('cmms.noOpenWos')}
            </p>
          ) : (
            <div className="space-y-2">
              {visibleWOs.map((wo) => (
                <div
                  key={wo.id}
                  onClick={() => setSelectedWOId(wo.id)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <p className="text-[11px] font-mono text-muted-foreground">{wo.number}</p>
                    <p className="text-xs font-semibold mt-0.5">{wo.assetName}</p>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground truncate">{wo.outlet}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className={cn(
                      'text-[11px] bg-muted rounded px-1.5 py-0.5',
                      wo.type === 'preventive' ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {label('woType', wo.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={wo.priority} />
                    <StatusBadge status={wo.status} />
                  </div>
                  <div className="text-[11px] text-muted-foreground flex-shrink-0 hidden sm:block">
                    {wo.assignee.split(' ')[0]}
                  </div>
                </div>
              ))}
              {listedWOs.length > 10 && (
                <button
                  onClick={() => setShowAllWOs((v) => !v)}
                  className="w-full text-[11px] text-muted-foreground hover:text-foreground text-center pt-1"
                >
                  {showAllWOs ? t('cmms.showFewer') : t('cmms.showMore', { count: listedWOs.length - 10 })}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">{t('cmms.correctiveByOutlet')}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t('cmms.completedCorrective')}</p>

          {downtimeData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">{t('cmms.noCompletedCorrective')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={downtimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="outlet" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }}
                  formatter={(v: number) => [`${v}`, t('cmms.wos')]}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Technician workload */}
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold mb-2.5">{t('cmms.techWorkload')}</h4>
            {techData.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('cmms.noAssignments')}</p>
            ) : (
              <div className="space-y-2">
                {techData.map((tech) => (
                  <div key={tech.name} className="flex items-center gap-2">
                    <div className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                      {tech.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="truncate">{tech.name.split(' ')[0]}</span>
                        <span className="text-muted-foreground">{t('cmms.openJobs', { count: tech.jobs })}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${tech.utilization}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset detail panel */}
      {selectedAsset && (
        <AssetDetailPanel
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onSelectWO={(woId) => { setSelectedAsset(null); setSelectedWOId(woId) }}
        />
      )}

      {/* Work Order detail drawer */}
      {selectedWOId && (
        <WorkOrderDetailDrawer woId={selectedWOId} onClose={() => setSelectedWOId(null)} />
      )}

      {/* QR scan / print stickers (Tier 5.2) */}
      {showQr && (
        <QrDialog
          onClose={() => setShowQr(false)}
          onResolved={(r) => {
            setShowQr(false)
            // Land straight on the active work order if there is one, else the asset.
            if (r.activeWorkOrderId) {
              setSelectedAsset(null)
              setSelectedWOId(r.activeWorkOrderId)
            } else {
              const a = assets.find((x) => x.id === r.asset.id) ?? r.asset
              setSelectedAsset(a)
            }
            toast.success(t('cmms.assetToast', { name: r.asset.name }))
          }}
        />
      )}

      <CreateAssetDialog
        open={showAddAsset}
        onOpenChange={setShowAddAsset}
        outlets={myOutlets.map((o) => o.name)}
        onSubmit={async (input) => { await createAsset(input) }}
      />

      <CreateWorkOrderDialog
        open={showAddWO}
        onOpenChange={setShowAddWO}
        assets={assets}
        onSubmit={async (input) => { await createWorkOrder(input) }}
      />
    </div>
  )
}
