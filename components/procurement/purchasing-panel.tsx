'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, ShoppingCart, PackageCheck, Loader2, Truck, BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { PurchaseOrder, PurchaseRequest, PurchaseRequestStatus, PurchaseOrderStatus, VendorPerformanceSummary, PartPriceHistoryEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

const rp = (n: number) => 'Rp ' + (n ?? 0).toLocaleString('id-ID')

const PR_BADGE: Record<PurchaseRequestStatus, string> = {
  pending_approval: 'bg-warning/15 text-warning border-warning/30',
  approved:         'bg-primary/15 text-primary border-primary/30',
  rejected:         'bg-destructive/15 text-destructive border-destructive/30',
  ordered:          'bg-blue-500/15 text-blue-600 border-blue-500/30',
  received:         'bg-success/15 text-success border-success/30',
  cancelled:        'bg-muted text-muted-foreground border-border',
}
const PO_BADGE: Record<PurchaseOrderStatus, string> = {
  sent:               'bg-warning/15 text-warning border-warning/30',
  partially_received: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  received:           'bg-success/15 text-success border-success/30',
  cancelled:          'bg-muted text-muted-foreground border-border',
}

export function PurchasingPanel() {
  const {
    purchaseRequests, purchaseOrders, procurementLoading, vendors,
    loadPurchaseRequests, loadPurchaseOrders, loadVendors,
    scanLowStock, orderPurchaseRequest, receivePurchaseOrder,
  } = useIssueStore()
  const { can } = usePermissions()

  const [busy, setBusy] = useState<string | null>(null)
  const [choosingFor, setChoosingFor] = useState<PurchaseRequest | null>(null)
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null)

  useEffect(() => {
    loadPurchaseRequests()
    loadPurchaseOrders()
    if (vendors.length === 0) loadVendors()
  }, [loadPurchaseRequests, loadPurchaseOrders, loadVendors]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScan = async () => {
    setBusy('scan')
    try {
      const r = await scanLowStock()
      toast[r.created > 0 ? 'success' : 'message'](
        r.created > 0 ? `${r.created} purchase request dibuat` : 'Tidak ada stok yang perlu di-reorder',
      )
    } catch (e) { toast.error(String(e)) } finally { setBusy(null) }
  }

  const handleOrder = async (pr: PurchaseRequest, vendorId: string) => {
    setBusy(pr.id)
    try {
      await orderPurchaseRequest(pr.id, vendorId)
      toast.success(`PO dibuat dari ${pr.number}`)
      setChoosingFor(null)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Gagal membuat PO') } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6">
      {/* Purchase Requests */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">Purchase Requests</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Stok menipis → PR otomatis → approval → PO</p>
            </div>
          </div>
          {can.manageMasterData && (
            <button onClick={handleScan} disabled={busy === 'scan'}
              className="flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent disabled:opacity-50">
              {busy === 'scan' ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Pindai stok menipis
            </button>
          )}
        </div>

        {procurementLoading && purchaseRequests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Memuat…</p>
        ) : purchaseRequests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border flex items-center justify-center py-8 text-xs text-muted-foreground">Belum ada purchase request.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-semibold">Nomor</th>
                  <th className="text-left py-2 font-semibold">Item</th>
                  <th className="text-left py-2 font-semibold">Sumber</th>
                  <th className="text-right py-2 font-semibold">Estimasi</th>
                  <th className="text-left py-2 font-semibold">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchaseRequests.map((pr) => (
                  <tr key={pr.id} className="hover:bg-accent/40">
                    <td className="py-2 font-mono">{pr.number}</td>
                    <td className="py-2 text-muted-foreground">
                      {pr.items.map((i) => `${i.partName} ×${i.quantity}`).join(', ')}
                    </td>
                    <td className="py-2 text-muted-foreground">{pr.source === 'auto_reorder' ? 'Auto' : 'Manual'}</td>
                    <td className="py-2 text-right">{rp(pr.totalEst)}</td>
                    <td className="py-2">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold border', PR_BADGE[pr.status])}>
                        {pr.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {pr.status === 'approved' && can.manageAssets && (
                        <button onClick={() => setChoosingFor(pr)}
                          className="px-2 h-7 rounded border border-border text-[11px] font-semibold hover:bg-accent">
                          Buat PO
                        </button>
                      )}
                      {pr.status === 'pending_approval' && (
                        <span className="text-[10px] text-muted-foreground">menunggu approval</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Orders */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Purchase Orders</h3>
        </div>
        {purchaseOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border flex items-center justify-center py-8 text-xs text-muted-foreground">Belum ada purchase order.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-semibold">Nomor</th>
                  <th className="text-left py-2 font-semibold">Vendor</th>
                  <th className="text-left py-2 font-semibold">Progres</th>
                  <th className="text-right py-2 font-semibold">Total</th>
                  <th className="text-left py-2 font-semibold">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchaseOrders.map((po) => {
                  const recv = po.items.reduce((s, i) => s + i.quantityReceived, 0)
                  const ord = po.items.reduce((s, i) => s + i.quantityOrdered, 0)
                  return (
                    <tr key={po.id} className="hover:bg-accent/40">
                      <td className="py-2 font-mono">{po.number}</td>
                      <td className="py-2 text-muted-foreground">{po.vendorName ?? '—'}</td>
                      <td className="py-2 text-muted-foreground">{recv}/{ord} diterima</td>
                      <td className="py-2 text-right">{rp(po.total)}</td>
                      <td className="py-2">
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold border', PO_BADGE[po.status])}>
                          {po.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {(po.status === 'sent' || po.status === 'partially_received') && can.manageAssets && (
                          <button onClick={() => setReceivingPo(po)}
                            className="flex items-center gap-1 px-2 h-7 rounded border border-border text-[11px] font-semibold hover:bg-accent ml-auto">
                            <PackageCheck className="size-3.5" /> Terima
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {choosingFor && (
        <ChooseVendorDialog
          pr={choosingFor}
          busy={busy === choosingFor.id}
          onClose={() => setChoosingFor(null)}
          onPick={(vendorId) => handleOrder(choosingFor, vendorId)}
        />
      )}

      {receivingPo && (
        <ReceiveDialog po={receivingPo} onClose={() => setReceivingPo(null)}
          onReceive={async (lines) => { await receivePurchaseOrder(receivingPo.id, lines); setReceivingPo(null); toast.success('Barang diterima, stok diperbarui') }} />
      )}
    </div>
  )
}

function ChooseVendorDialog({ pr, busy, onClose, onPick }: {
  pr: PurchaseRequest
  busy: boolean
  onClose: () => void
  onPick: (vendorId: string) => void
}) {
  const { vendors, loadVendorPerformanceSummary, loadPartPriceHistory } = useIssueStore()
  const [perf, setPerf] = useState<VendorPerformanceSummary[] | null>(null)
  const [prices, setPrices] = useState<PartPriceHistoryEntry[]>([])

  const firstPartId = pr.items.find((i) => i.partId)?.partId ?? null

  useEffect(() => {
    loadVendorPerformanceSummary().then(setPerf).catch(() => setPerf([]))
    if (firstPartId) loadPartPriceHistory(firstPartId).then(setPrices).catch(() => setPrices([]))
  }, [pr.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const priceByVendor = new Map(prices.map((p) => [p.vendorId, p]))
  // Rank vendors: those with a performance record (best on-time first), then the rest.
  const perfById = new Map((perf ?? []).map((p) => [p.vendorId, p]))
  const ranked = vendors.filter((v) => v.is_active).sort((a, b) => {
    const pa = perfById.get(a.id)?.onTimePct ?? -1
    const pb = perfById.get(b.id)?.onTimePct ?? -1
    return pb - pa
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-lg border border-border shadow-lg max-w-xl w-full p-4 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <BadgeCheck className="size-4 text-primary" />
          <h3 className="text-sm font-bold">Pilih vendor — {pr.number}</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Diurut berdasarkan ketepatan waktu. {firstPartId ? 'Harga = riwayat pembelian part ini.' : ''}
        </p>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-1.5 font-semibold">Vendor</th>
              <th className="text-right py-1.5 font-semibold">On-time</th>
              <th className="text-right py-1.5 font-semibold">Resolusi</th>
              <th className="text-right py-1.5 font-semibold">Harga terakhir</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ranked.map((v) => {
              const p = perfById.get(v.id)
              const price = priceByVendor.get(v.id)
              return (
                <tr key={v.id} className="hover:bg-accent/40">
                  <td className="py-2 font-semibold">{v.name}</td>
                  <td className="py-2 text-right">{p && p.completed > 0 ? `${p.onTimePct}%` : '—'}</td>
                  <td className="py-2 text-right text-muted-foreground">{p && p.completed > 0 ? `${p.avgResolutionDays}h` : '—'}</td>
                  <td className="py-2 text-right text-muted-foreground">
                    {price ? `Rp ${price.lastUnitCost.toLocaleString('id-ID')}` : '—'}
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={() => onPick(v.id)} disabled={busy}
                      className="px-2 h-7 rounded bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-50">
                      {busy ? <Loader2 className="size-3 animate-spin" /> : 'Pilih'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {ranked.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">Belum ada vendor aktif.</p>}
      </div>
    </div>
  )
}

function ReceiveDialog({ po, onClose, onReceive }: {
  po: PurchaseOrder
  onClose: () => void
  onReceive: (lines: { purchaseOrderItemId: string; quantityReceived: number }[]) => Promise<void>
}) {
  // Default each line to its outstanding quantity; the storeman can reduce it.
  const [qty, setQty] = useState<Record<string, string>>(
    Object.fromEntries(po.items.map((i) => [i.id, String(i.quantityOrdered - i.quantityReceived)])),
  )
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const lines = po.items
      .map((i) => ({ purchaseOrderItemId: i.id, quantityReceived: Number(qty[i.id] || 0) }))
      .filter((l) => l.quantityReceived > 0)
    if (lines.length === 0) return toast.error('Isi jumlah yang diterima')
    setSaving(true)
    try { await onReceive(lines) } catch (e) { toast.error(e instanceof Error ? e.message : 'Gagal') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold">Terima barang — {po.number}</h3>
        <div className="space-y-2">
          {po.items.map((i) => {
            const outstanding = i.quantityOrdered - i.quantityReceived
            return (
              <div key={i.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1">{i.partName} <span className="text-muted-foreground">(sisa {outstanding})</span></span>
                <input type="number" min={0} max={outstanding} value={qty[i.id]}
                  onChange={(e) => setQty((q) => ({ ...q, [i.id]: e.target.value }))}
                  disabled={outstanding === 0}
                  className="w-20 h-8 rounded border border-border bg-muted/20 px-2 text-xs" />
              </div>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent">Batal</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
            {saving && <Loader2 className="size-3.5 animate-spin" />} Terima
          </button>
        </div>
      </div>
    </div>
  )
}
