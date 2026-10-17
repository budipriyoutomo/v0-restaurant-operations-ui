'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/shared/priority-badge'
import { useIssueStore } from '@/lib/store'
import { TemperaturePanel } from '@/components/ops/temperature-panel'
import { api } from '@/lib/api-client'
import { Asset, AssetSummary, WorkOrder } from '@/lib/types'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import { assetStatusColor } from './asset-status'

// ---------------------------------------------------------------------------
// Expandable asset detail panel (inline)
// ---------------------------------------------------------------------------
export function AssetDetailPanel({ asset, onClose, onSelectWO }: { asset: Asset; onClose: () => void; onSelectWO: (woId: string) => void }) {
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
              <p className="text-xs text-muted-foreground">{text}</p>
              <p className="text-sm font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
        <div>
          <p className="text-muted-foreground">{t('common.status')}</p>
          <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold border mt-1 inline-block', assetStatusColor(asset.status))}>
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
