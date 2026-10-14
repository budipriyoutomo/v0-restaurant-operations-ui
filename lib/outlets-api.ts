// GET /api/analytics/outlets — outlets side by side for the GM (Todo-Pilot §25 / UX-12).
import { api } from './api-client'

export type OutletFlag = 'sla' | 'qa' | 'guest' | 'budget' | 'downtime'

export interface OutletRow {
  outletId: string
  outlet: string
  openIssues: number
  slaBreached: number
  readyToClose: number
  qaScore: number | null
  guestWaiting: number
  guestResponseMinutes: number | null
  budgetPct: number | null
  downtimeHours: number
  flags: OutletFlag[]
}

export interface OutletComparison {
  since: string
  days: number
  outlets: OutletRow[]
  thresholds: { qaMinScore: number; downtimeMaxHours: number; budgetMaxPct: number }
}

export const outletsApi = {
  compare: (days = 30) => api.get<OutletComparison>(`/api/analytics/outlets?days=${days}`),
}
