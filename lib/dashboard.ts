// GM dashboard (Todo-Modern-UI Fase 3): the title says how today is going, and
// the outlet rail shows one ticket per outlet, most urgent first (the server
// already sorts /api/analytics/outlets that way).
import type { MessageKey } from './i18n'
import type { OutletRow } from './outlets-api'
import type { Signal } from './tone'

export type HeadlinePart = { key: MessageKey; count?: number }

/** "2 outlet perlu perhatian · 6 laporan lewat tenggat", or "all clear". */
export function headlineParts(flaggedOutlets: number, lateIssues: number): HeadlinePart[] {
  const parts: HeadlinePart[] = []
  if (flaggedOutlets > 0) parts.push({ key: 'dashboard.headline.outlets', count: flaggedOutlets })
  if (lateIssues > 0) parts.push({ key: 'dashboard.headline.late', count: lateIssues })
  return parts.length ? parts : [{ key: 'dashboard.headline.allClear' }]
}

/** Up to `max` outlets get a ticket each; beyond that only the flagged ones do
 *  and the rest are counted (they stay in the comparison table below). */
export function outletRail(rows: OutletRow[], max = 8): { tickets: OutletRow[]; normal: number } {
  if (rows.length <= max) return { tickets: rows, normal: 0 }
  const tickets = rows.filter((r) => r.flags.length > 0)
  return { tickets, normal: rows.length - tickets.length }
}

export const outletSignal = (row: OutletRow): Signal => (row.flags.length > 0 ? 'action' : 'neutral')
