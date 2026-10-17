'use client'

import { useEffect, useState, useRef } from 'react'
import { Package, Plus, X, CheckSquare, Square, DollarSign, PlayCircle, CheckCircle2, Loader2, Building2, Camera, Lock, Info, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { AuthedImage } from '@/components/shared/authed-image'
import { useIssueStore } from '@/lib/store'
import { woPrimaryAction } from '@/lib/action-reasons'
import { api, QueuedError } from '@/lib/api-client'
import { WorkOrderDetail, WorkOrderStatus, WorkOrderPart } from '@/lib/types'
import { usePermissions } from '@/lib/permissions'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { UnlinkedAssigneeNote } from '@/components/shared/unlinked-assignee-note'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import { SideDrawer } from '@/components/shared/side-drawer'

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
  return (
    <SideDrawer
      label={detail ? `${t('term.workOrder')} ${detail.number}` : t('term.workOrder')}
      number={loading ? <span className="inline-block h-4 w-24 rounded bg-muted animate-pulse align-middle" /> : detail?.number}
      title={detail?.title ?? (notFound ? t('term.workOrder') : '…')}
      closeLabel={t('common.close')}
      onClose={onClose}
    >
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
                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold">
                    {t('wo.needsApproval')}
                  </span>
                )}
              </div>

              {/* Linked approval banner for on-hold WOs */}
              {detail.status === 'on-hold' && linkedApproval && (
                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-1">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t('wo.waitingApproval')}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
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
                  <p className="text-xs text-muted-foreground">{t('wo.estimated', { amount: fmt(detail.estimatedCost) })}</p>
                )}

                {/* Cost edit form — managers only, non-completed */}
                {can.manageCMMS && !isDone && (
                  <details className="group">
                    <summary className="text-xs text-primary cursor-pointer hover:underline list-none mt-1">
                      {t('wo.updateCost')}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {[
                        { key: 'laborHours', text: t('wo.laborHours'), placeholder: '2.5' },
                        { key: 'laborCost',  text: t('wo.laborCost'), placeholder: '250000' },
                        { key: 'partsCost',  text: t('wo.partsCost'), placeholder: '150000' },
                      ].map(({ key, text, placeholder }) => (
                        <div key={key}>
                          <label htmlFor={`wo-cost-${key}`} className="block text-xs text-muted-foreground mb-1">{text}</label>
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
                  <p className="text-xs text-muted-foreground">{t('wo.noParts')}</p>
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
                      className="flex-1 h-9 rounded-lg border border-border bg-muted/20 px-1.5 text-xs"
                    >
                      <option value="">{t('wo.pickPartOption')}</option>
                      {parts.filter((p) => p.isActive && p.stockQty > 0).map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({t('wo.stock', { qty: p.stockQty })})</option>
                      ))}
                    </select>
                    <input
                      type="number" min={1} value={partForm.quantity}
                      onChange={(e) => setPartForm((p) => ({ ...p, quantity: e.target.value }))}
                      className="w-14 h-9 rounded-lg border border-border bg-muted/20 px-1.5 text-xs"
                    />
                    <button
                      onClick={handleConsumePart}
                      disabled={busy === 'part'}
                      className="px-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
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
                      <span className="text-muted-foreground text-xs">{t('wo.slaDue', { date: date(detail.slaDue) })}</span>
                    )}
                    {detail.slaMet !== null && (
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-md font-semibold border',
                        detail.slaMet
                          ? 'bg-success/15 text-success border-success/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30',
                      )}>
                        {detail.slaMet ? t('wo.slaMet') : t('wo.slaMissed')}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('wo.internal')}</p>
                )}
                {can.manageCMMS && !isDone && (
                  <div className="flex gap-1.5 pt-1">
                    <select
                      value={vendorForm.vendorId}
                      onChange={(e) => setVendorForm((v) => ({ ...v, vendorId: e.target.value }))}
                      className="flex-1 h-9 rounded-lg border border-border bg-muted/20 px-1.5 text-xs"
                    >
                      <option value="">{t('wo.pickVendorOption')}</option>
                      {vendors.filter((v) => v.is_active).map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                    <input
                      type="date" value={vendorForm.slaDue}
                      onChange={(e) => setVendorForm((v) => ({ ...v, slaDue: e.target.value }))}
                      className="h-9 rounded-lg border border-border bg-muted/20 px-1.5 text-xs"
                    />
                    <button
                      onClick={handleAssignVendor}
                      disabled={busy === 'vendor'}
                      className="px-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                    >
                      {busy === 'vendor' ? <Loader2 className="size-3 animate-spin" /> : t('wo.assignVendor')}
                    </button>
                  </div>
                )}
              </div>

              {/* Checklist */}
              {(detail.checklistItems.length > 0 || (can.manageCMMS && !isDone)) && (
                <div className="space-y-2 pb-4 border-b border-border">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs font-semibold">{t('wo.checklist')}</p>
                    <p className="text-xs text-muted-foreground">
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
                          <span className="text-xs text-muted-foreground flex-shrink-0">
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
                        className="flex-1 h-9 rounded-lg border border-border bg-muted/20 px-2 text-xs"
                      />
                      <button
                        onClick={handleAddChecklist}
                        disabled={busy === 'checklist' || !newChecklistItem.trim()}
                        className="px-2 h-9 rounded-lg border border-border text-sm font-medium hover:bg-accent disabled:opacity-50"
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
                  <p className="text-xs text-muted-foreground">{t('wo.noAttachments')}</p>
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
                            <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs px-1.5 py-0.5 truncate">{att.caption}</span>
                          )}
                        </a>
                      ) : (
                        <a
                          key={att.id} href={att.fileUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center aspect-square rounded border border-border bg-muted/30 text-xs text-primary hover:underline p-1 text-center break-all"
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
                  className="w-full h-9 rounded-lg border border-border bg-muted/20 px-2 text-xs mt-1"
                />
                <label className="flex items-center justify-center gap-1.5 px-2 h-9 rounded-lg border border-dashed border-border text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
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
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:underline list-none">{t('wo.linkUrl')}</summary>
                  <div className="flex gap-1.5 pt-1.5">
                    <input
                      value={attachForm.fileUrl}
                      onChange={(e) => setAttachForm((a) => ({ ...a, fileUrl: e.target.value }))}
                      placeholder="https://…"
                      className="flex-1 h-9 rounded-lg border border-border bg-muted/20 px-2 text-xs"
                    />
                    <button
                      onClick={handleAddAttachment}
                      disabled={busy === 'attach'}
                      className="px-2 h-9 rounded-lg border border-border text-sm font-medium hover:bg-accent disabled:opacity-50"
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
    </SideDrawer>
  )
}
