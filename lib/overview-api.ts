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
  get: () => api.get<Overview>('/api/analytics/overview'),
}
