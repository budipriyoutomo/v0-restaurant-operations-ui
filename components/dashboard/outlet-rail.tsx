'use client'

// The GM's outlet rail (Todo-Modern-UI Fase 3): one ticket per outlet on the
// service rail, most urgent first (the server sorts /api/analytics/outlets).
// The ticket says what is wrong in words; with many outlets only the flagged
// ones get a ticket and the rest are counted.
import { outletRail, outletSignal } from '@/lib/dashboard'
import type { OutletFlag, OutletRow } from '@/lib/outlets-api'
import { navigate } from '@/lib/use-route'
import { useT, type MessageKey } from '@/lib/i18n'
import { RailTicket, ServiceRail } from '@/components/shared/service-rail'

const FLAG_VALUE: Record<OutletFlag, (r: OutletRow) => number | null> = {
  sla: (r) => r.slaBreached,
  qa: (r) => (r.qaScore === null ? null : Math.round(r.qaScore)),
  guest: (r) => r.guestWaiting,
  budget: (r) => (r.budgetPct === null ? null : Math.round(r.budgetPct)),
  downtime: (r) => Math.round(r.downtimeHours),
}

export function OutletRail({ rows, onShowTable }: { rows: OutletRow[]; onShowTable?: () => void }) {
  const { t } = useT()
  if (rows.length === 0) return null
  const { tickets, normal } = outletRail(rows)

  const status = (r: OutletRow) => r.flags.length === 0 ? t('dashboard.outletNormal')
    : r.flags.map((f) => t(`dashboard.flag.${f}` as MessageKey, { n: FLAG_VALUE[f](r) ?? '—' })).join(', ')

  return (
    <ServiceRail label={t('dashboard.outletRail')}>
      {tickets.map((r) => (
        <RailTicket key={r.outletId} signal={outletSignal(r)} status={status(r)} title={r.outlet}
          meta={t('dashboard.outletMeta', { open: r.openIssues, ready: r.readyToClose })}
          onClick={() => navigate(`/issues?outlet=${encodeURIComponent(r.outlet)}`)} />
      ))}
      {normal > 0 && (
        <RailTicket signal="neutral" status={t('dashboard.outletNormal')} title={t('dashboard.normalOutlets', { count: normal })}
          meta={t('dashboard.normalOutletsHint')} onClick={onShowTable} />
      )}
    </ServiceRail>
  )
}
