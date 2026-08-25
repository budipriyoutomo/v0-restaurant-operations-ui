'use client'

import { useEffect, useState } from 'react'
import { QrCode, Calendar, Wrench, Package, Clock, AlertCircle, Plus, X, CheckSquare, Square, DollarSign, PlayCircle, CheckCircle2, Loader2, Building2, Camera } from 'lucide-react'
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
import { api, QueuedError } from '@/lib/api-client'
import { Asset, AssetStatus, AssetSummary, WorkOrder, WorkOrderDetail, WorkOrderStatus, WorkOrderPart } from '@/lib/types'
import { usePermissions, useMyOutlets } from '@/lib/permissions'
import { cn } from '@/lib/utils'

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

  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">PM Schedule — {monthLabel}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Preventive maintenance calendar</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
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
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary/60" />Scheduled</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-destructive/60" />Overdue</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Work Order detail drawer — slides in from right when a WO row is clicked
// ---------------------------------------------------------------------------
function WorkOrderDetailDrawer({ woId, onClose }: { woId: string; onClose: () => void }) {
  const {
    transitionWorkOrder, toggleChecklistItem, updateWorkOrderCost, approvals,
    vendors, parts, assignWorkOrderVendor, consumePart, addChecklistItem,
    addWorkOrderAttachment, uploadWorkOrderPhoto, loadWorkOrderParts, loadParts,
  } = useIssueStore()
  const { can } = usePermissions()
  const [detail, setDetail] = useState<WorkOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
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
      .catch(() => toast.error('Failed to load work order details.'))
      .finally(() => { if (!cancelled) setLoading(false) })
    if (parts.length === 0) loadParts()
    return () => { cancelled = true }
  }, [woId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConsumePart = async () => {
    if (!detail || !partForm.partId) return toast.error('Pilih part dulu')
    const qty = Number(partForm.quantity)
    if (!qty || qty < 1) return toast.error('Jumlah tidak valid')
    setBusy('part')
    try {
      await consumePart(detail.id, partForm.partId, qty)
      const [d, wp] = await Promise.all([refreshDetail(), loadWorkOrderParts(detail.id)])
      setWoParts(wp)
      setCostForm((p) => ({ ...p, partsCost: String(d.partsCost || '') }))
      setPartForm({ partId: '', quantity: '1' })
      toast.success('Part dipakai — stok & parts cost diperbarui')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memakai part')
    } finally { setBusy(null) }
  }

  const handleAssignVendor = async () => {
    if (!detail || !vendorForm.vendorId) return toast.error('Pilih vendor dulu')
    setBusy('vendor')
    try {
      const updated = await assignWorkOrderVendor(detail.id, vendorForm.vendorId, vendorForm.slaDue || undefined)
      setDetail(updated)
      toast.success('Vendor ditugaskan')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menugaskan vendor')
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
      toast.error('Gagal menambah item checklist')
    } finally { setBusy(null) }
  }

  const handleAddAttachment = async () => {
    if (!detail || !attachForm.fileUrl.trim()) return toast.error('URL wajib diisi')
    setBusy('attach')
    try {
      await addWorkOrderAttachment(detail.id, attachForm.fileUrl.trim(), attachForm.caption || undefined)
      await refreshDetail()
      setAttachForm({ fileUrl: '', caption: '' })
      toast.success('Lampiran ditambahkan')
    } catch {
      toast.error('Gagal menambah lampiran')
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
      if (queued > 0) toast.message(`${queued} foto akan diunggah saat online`)
      else toast.success('Foto diunggah')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengunggah foto')
    } finally { setBusy(null) }
  }

  const linkedApproval = detail?.approvalId
    ? approvals.find(a => a.id === detail.approvalId)
    : null

  const NEXT_STATUS: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
    scheduled: 'in-progress',
    'on-hold': 'in-progress',
    'in-progress': 'completed',
  }

  const handleTransition = async (targetStatus: WorkOrderStatus) => {
    if (!detail || transitioning) return
    setTransitioning(true)
    try {
      const updated = await transitionWorkOrder(detail.id, targetStatus)
      setDetail(updated)
      toast.success(`Work order ${targetStatus === 'in-progress' ? 'started' : targetStatus}.`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Transition failed.')
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
      toast.error('Failed to update checklist item.')
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
      toast.success('Cost updated.')
    } catch {
      toast.error('Failed to update cost.')
    } finally {
      setSavingCost(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
  const nextStatus = detail ? NEXT_STATUS[detail.status as WorkOrderStatus] : undefined
  const isDone = detail?.status === 'completed' || detail?.status === 'cancelled'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-[420px] bg-background border-l border-border shadow-lg z-50 overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 mr-3">
              {loading ? (
                <div className="h-4 bg-muted rounded animate-pulse w-24 mb-2" />
              ) : (
                <p className="font-mono text-xs text-primary font-bold mb-1">{detail?.number}</p>
              )}
              <h2 className="font-bold text-base leading-snug">{detail?.title ?? '...'}</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <X className="size-5" />
            </button>
          </div>

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
                <span className="text-xs text-muted-foreground">{detail.type}</span>
                {detail.requiresApproval && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
                    Needs Approval
                  </span>
                )}
              </div>

              {/* Linked approval banner for on-hold WOs */}
              {detail.status === 'on-hold' && linkedApproval && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200 space-y-1">
                  <p className="text-xs font-semibold text-amber-700">Waiting for approval</p>
                  <p className="text-xs text-amber-600">
                    {linkedApproval.number} · Step {linkedApproval.currentStepOrder} of {linkedApproval.steps.length}
                    {' '}— {linkedApproval.steps.find(s => s.stepOrder === linkedApproval.currentStepOrder)?.approverRole ?? 'approver'}
                  </p>
                </div>
              )}

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs pb-4 border-b border-border">
                <div><p className="text-muted-foreground">Asset</p><p className="font-semibold mt-0.5">{detail.assetName}</p></div>
                <div><p className="text-muted-foreground">Outlet</p><p className="font-semibold mt-0.5">{detail.outlet}</p></div>
                <div><p className="text-muted-foreground">Assignee</p><p className="font-semibold mt-0.5">{detail.assignee}</p></div>
                {detail.scheduledDate && <div><p className="text-muted-foreground">Scheduled</p><p className="font-semibold mt-0.5 font-mono">{detail.scheduledDate}</p></div>}
                {detail.downtimeStart && <div><p className="text-muted-foreground">Downtime start</p><p className="font-semibold mt-0.5 font-mono">{new Date(detail.downtimeStart).toLocaleString()}</p></div>}
                {detail.downtimeEnd && <div><p className="text-muted-foreground">Downtime end</p><p className="font-semibold mt-0.5 font-mono">{new Date(detail.downtimeEnd).toLocaleString()}</p></div>}
              </div>

              {/* Cost summary */}
              <div className="space-y-2 pb-4 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold">Cost Breakdown</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { label: 'Labor', value: detail.laborCost },
                    { label: 'Parts', value: detail.partsCost },
                    { label: 'Total', value: detail.totalCost },
                  ].map(({ label, value }) => (
                    <div key={label} className={cn('p-2 rounded-md bg-muted/30', label === 'Total' && 'bg-primary/5 border border-primary/20')}>
                      <p className="text-muted-foreground">{label}</p>
                      <p className={cn('font-bold mt-0.5', label === 'Total' && 'text-primary')}>{fmt(value)}</p>
                    </div>
                  ))}
                </div>
                {detail.estimatedCost && (
                  <p className="text-[10px] text-muted-foreground">Estimated: {fmt(detail.estimatedCost)}</p>
                )}

                {/* Cost edit form — managers only, non-completed */}
                {can.manageAssets && !isDone && (
                  <details className="group">
                    <summary className="text-[11px] text-primary cursor-pointer hover:underline list-none mt-1">
                      Update cost…
                    </summary>
                    <div className="mt-2 space-y-2">
                      {[
                        { key: 'laborHours', label: 'Labor Hours', placeholder: '2.5' },
                        { key: 'laborCost',  label: 'Labor Cost (Rp)', placeholder: '250000' },
                        { key: 'partsCost',  label: 'Parts Cost (Rp)', placeholder: '150000' },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
                          <input
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
                        Save Cost
                      </button>
                    </div>
                  </details>
                )}
              </div>

              {/* Spare parts consumed (Tier 3) */}
              <div className="space-y-2 pb-4 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Package className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold">Spare Parts</p>
                </div>
                {woParts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Belum ada part dipakai.</p>
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
                {can.manageAssets && !isDone && (
                  <div className="flex gap-1.5 pt-1">
                    <select
                      value={partForm.partId}
                      onChange={(e) => setPartForm((p) => ({ ...p, partId: e.target.value }))}
                      className="flex-1 h-7 rounded border border-border bg-muted/20 px-1.5 text-[11px]"
                    >
                      <option value="">— pilih part —</option>
                      {parts.filter((p) => p.isActive && p.stockQty > 0).map((p) => (
                        <option key={p.id} value={p.id}>{p.name} (stok {p.stockQty})</option>
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
                      {busy === 'part' ? <Loader2 className="size-3 animate-spin" /> : 'Pakai'}
                    </button>
                  </div>
                )}
              </div>

              {/* Vendor / SLA (Tier 3) */}
              <div className="space-y-2 pb-4 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold">Vendor Eksternal</p>
                </div>
                {detail.vendorName ? (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-semibold">{detail.vendorName}</span>
                    {detail.slaDue && (
                      <span className="text-muted-foreground font-mono text-[11px]">SLA: {detail.slaDue}</span>
                    )}
                    {detail.slaMet !== null && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-semibold border',
                        detail.slaMet
                          ? 'bg-success/15 text-success border-success/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30',
                      )}>
                        {detail.slaMet ? 'SLA terpenuhi' : 'SLA terlewat'}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Dikerjakan internal.</p>
                )}
                {can.manageAssets && !isDone && (
                  <div className="flex gap-1.5 pt-1">
                    <select
                      value={vendorForm.vendorId}
                      onChange={(e) => setVendorForm((v) => ({ ...v, vendorId: e.target.value }))}
                      className="flex-1 h-7 rounded border border-border bg-muted/20 px-1.5 text-[11px]"
                    >
                      <option value="">— pilih vendor —</option>
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
                      {busy === 'vendor' ? <Loader2 className="size-3 animate-spin" /> : 'Tugaskan'}
                    </button>
                  </div>
                )}
              </div>

              {/* Checklist */}
              {(detail.checklistItems.length > 0 || (can.manageAssets && !isDone)) && (
                <div className="space-y-2 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Checklist</p>
                    <p className="text-[10px] text-muted-foreground">
                      {detail.checklistItems.filter(i => i.isDone).length}/{detail.checklistItems.length} done
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
                            {new Date(item.doneAt).toLocaleDateString()}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Add checklist item */}
                  {can.manageAssets && !isDone && (
                    <div className="flex gap-1.5 pt-1">
                      <input
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklist() }}
                        placeholder="Tambah item checklist…"
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
                <p className="text-xs font-semibold">Foto & Lampiran</p>
                {detail.attachments.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Belum ada lampiran.</p>
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
                          <AuthedImage path={att.thumbnailUrl || att.fileUrl || ''} alt={att.caption ?? 'foto'} className="w-full h-full object-cover" />
                          {att.caption && (
                            <span className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate">{att.caption}</span>
                          )}
                        </a>
                      ) : (
                        <a
                          key={att.id} href={att.fileUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center aspect-square rounded border border-border bg-muted/30 text-[10px] text-primary hover:underline p-1 text-center break-all"
                        >
                          {att.caption || 'link'}
                        </a>
                      )
                    ))}
                  </div>
                )}

                {/* Upload a real photo (Tier 5.1) — camera on mobile, file picker on desktop */}
                <input
                  value={attachForm.caption}
                  onChange={(e) => setAttachForm((a) => ({ ...a, caption: e.target.value }))}
                  placeholder="Keterangan foto (opsional)"
                  className="w-full h-7 rounded border border-border bg-muted/20 px-2 text-[11px] mt-1"
                />
                <label className="flex items-center justify-center gap-1.5 px-2 h-8 rounded-md border border-dashed border-border text-[11px] font-semibold cursor-pointer hover:bg-accent transition-colors">
                  {busy === 'upload' ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                  {busy === 'upload' ? 'Mengunggah…' : 'Ambil / unggah foto'}
                  <input
                    type="file" accept="image/*" capture="environment" multiple
                    disabled={busy === 'upload'}
                    onChange={(e) => { handleUploadPhoto(e.target.files); e.target.value = '' }}
                    className="hidden"
                  />
                </label>

                {/* Fallback: attach an external URL (documents/links) */}
                <details className="group">
                  <summary className="text-[10px] text-muted-foreground cursor-pointer hover:underline list-none">Tautkan URL eksternal…</summary>
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

              {/* Transition action — manager only */}
              {can.manageAssets && !isDone && nextStatus && (
                <button
                  onClick={() => handleTransition(nextStatus)}
                  disabled={transitioning || detail.status === 'on-hold'}
                  className={cn(
                    'w-full py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                    detail.status === 'on-hold'
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : nextStatus === 'completed'
                        ? 'bg-success text-white hover:bg-success/90'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    (transitioning) && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  {transitioning ? <Loader2 className="size-4 animate-spin" /> :
                   nextStatus === 'in-progress' ? <PlayCircle className="size-4" /> :
                   <CheckCircle2 className="size-4" />}
                  {detail.status === 'on-hold'
                    ? 'Waiting for Approval'
                    : nextStatus === 'in-progress' ? 'Start Work Order' : 'Mark Completed'}
                </button>
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
  const rp = (n: number) => 'Rp ' + (n ?? 0).toLocaleString('id-ID')

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{asset.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {asset.number} · {asset.category} · {asset.outlet}
            {asset.purchaseCost ? ` · nilai ${rp(asset.purchaseCost)}` : ''}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <AlertCircle className="size-4" />
        </button>
      </div>

      {/* Maintenance rollup — GET /api/assets/{id}/summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b border-border">
          {[
            { label: 'Total WO', value: String(summary.totalWorkOrders) },
            { label: 'Downtime', value: `${summary.totalDowntimeHours.toFixed(1)}h` },
            { label: 'Total biaya', value: rp(summary.totalCost) },
            { label: 'WO 90 hari', value: String(summary.workOrdersLast90Days) },
          ].map(({ label, value }) => (
            <div key={label} className="p-2 rounded-md bg-muted/30">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-sm font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
        <div>
          <p className="text-muted-foreground">Status</p>
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold border mt-1 inline-block', assetStatusColor(asset.status))}>
            {asset.status}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground">Last PM</p>
          <p className="font-semibold mt-1 font-mono">{asset.lastPM ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Next PM</p>
          <p className={cn('font-semibold mt-1 font-mono', asset.nextPM && new Date(asset.nextPM) < new Date() ? 'text-destructive' : '')}>
            {asset.nextPM ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Install Date</p>
          <p className="font-semibold mt-1 font-mono">{asset.installDate ?? '—'}</p>
        </div>
      </div>

      {asset.brand || asset.model || asset.serialNumber ? (
        <div className="grid grid-cols-3 gap-4 text-xs mb-4 pb-4 border-b border-border">
          {asset.brand     && <div><p className="text-muted-foreground">Brand</p><p className="font-semibold mt-1">{asset.brand}</p></div>}
          {asset.model     && <div><p className="text-muted-foreground">Model</p><p className="font-semibold mt-1">{asset.model}</p></div>}
          {asset.serialNumber && <div><p className="text-muted-foreground">Serial No.</p><p className="font-semibold mt-1 font-mono">{asset.serialNumber}</p></div>}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold mb-2">Work Orders ({linkedWOs.length})</p>
        {linkedWOs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No work orders for this asset.</p>
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
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main CMMS page
// ---------------------------------------------------------------------------
export function CMMSPage() {
  const { assets, workOrders, cmmsLoading, outlets, pics, createAsset, createWorkOrder } = useIssueStore()
  // Outlet pickers must only offer outlets this user may write to (Tier 4).
  const myOutlets = useMyOutlets()
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedWOId, setSelectedWOId] = useState<string | null>(null)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [showAddWO, setShowAddWO] = useState(false)

  // KPI derivations
  const openWOs      = workOrders.filter((wo) => wo.status !== 'completed' && wo.status !== 'cancelled')
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

  if (cmmsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading CMMS data…
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setShowAddWO(true)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors"
        >
          <Plus className="size-3.5" /> New Work Order
        </button>
        <button
          onClick={() => setShowAddAsset(true)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" /> Add Asset
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Assets"    value={String(assets.length)}   subtitle="Registered assets"          icon={Package} />
        <StatCard title="Open Work Orders" value={String(openWOs.length)}  subtitle={`${overdueWOs.length} overdue`} icon={Wrench} variant={overdueWOs.length > 0 ? 'warning' : undefined} />
        <StatCard title="PM Compliance"   value={`${pmCompliance}%`}      subtitle="Preventive WOs completed"   icon={Calendar} variant="success" />
        <StatCard title="Corrective WOs"  value={String(workOrders.filter((wo) => wo.type === 'corrective').length)} subtitle="All time" icon={Clock} variant="critical" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asset table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Asset Status</h3>
            <button
              onClick={() => setShowQr(true)}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors">
              <QrCode className="size-3" /> Scan QR
            </button>
          </div>

          {assets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border flex items-center justify-center py-16 text-xs text-muted-foreground">
              No assets registered yet.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Asset</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Outlet</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Last PM</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Next PM</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">WOs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assets.map((asset) => {
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
                            {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground font-mono">{asset.lastPM ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('font-mono', pmOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                            {asset.nextPM ?? '—'}
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
          <h3 className="text-sm font-semibold mb-3">Work Orders</h3>
          {workOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No work orders yet.</p>
          ) : (
            <div className="space-y-2">
              {workOrders.slice(0, 10).map((wo) => (
                <div key={wo.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-accent/50 transition-colors">
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
                      {wo.type}
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
              {workOrders.length > 10 && (
                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  +{workOrders.length - 10} more — use filters in Asset Management
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">Corrective WOs by Outlet</h3>
          <p className="text-xs text-muted-foreground mb-4">Completed corrective work orders</p>

          {downtimeData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No completed corrective WOs yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={downtimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="outlet" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-popover)', color: 'var(--color-foreground)' }}
                  formatter={(v: number) => [`${v}`, 'WOs']}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Technician workload */}
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold mb-2.5">Technician Workload</h4>
            {techData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No open assignments.</p>
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
                        <span className="text-muted-foreground">{tech.jobs} open</span>
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
            toast.success(`Aset: ${r.asset.name}`)
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
        assignees={pics.map((p) => p.name)}
        onSubmit={async (input) => { await createWorkOrder(input) }}
      />
    </div>
  )
}
