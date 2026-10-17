// GET /api/analytics/overview — dashboard numbers counted by the server (Todo-Pilot §22).
import { api } from './api-client'

export interface Overview {
  issues: {
    total: number
    inProgress: number
    awaitingClose: number
    slaBreached: number
    byCategory: Record<string, number>
    byOutlet: Record<string, number>
    urgent: { id: string; number: string; title: string; outlet: string; priority: 'critical' | 'high' }[]
  }
  tasks: { active: number } | null
  approvals: { pending: number; pendingByType: Record<string, number> } | null
}

export const overviewApi = {
  /** `outlet` = the top bar's outlet filter (null = all my outlets). */
  get: (outlet: string | null = null) =>
    api.get<Overview>(outlet ? `/api/analytics/overview?outlet=${encodeURIComponent(outlet)}` : '/api/analytics/overview'),
}
