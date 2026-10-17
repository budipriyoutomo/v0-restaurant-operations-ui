// GET /api/my-work — "Pekerjaan Saya" (Todo-Pilot §19 / UX-6).
import { api } from './api-client'

export interface Section<T> { count: number; items: T[] }

export interface MyWork {
  approvals: Section<{ id: string; number: string; title: string; type: string; outlet: string; amount: number | null;
    currency: string; stepOrder: number; stepCount: number; waitingSince: string | null; escalated: boolean }> | null
  workOrders: Section<{ id: string; number: string; title: string; assetName: string; outlet: string; status: string;
    priority: string; scheduledDate: string | null }> | null
  tasks: Section<{ id: string; number: string; title: string; issueId: string; issueNumber: string; outlet: string;
    status: string; priority: string; dueDate: string | null }> | null
  readyToClose: Section<{ id: string; number: string; title: string; outlet: string; status: string }> | null
  guestWaiting: Section<{ id: string; issueId: string; issueNumber: string; title: string; outlet: string;
    channel: string; reportedAt: string | null }> | null
  // Today's daily checklists at my outlets still to fill in (Todo-Ops-Checklist Fase 1)
  opsChecklists?: Section<{ id: string; number: string; templateName: string; shift: string; outlet: string;
    status: string; opensAt: string | null; dueAt: string | null; closesAt: string | null;
    answered: number; itemCount: number }> | null
}

export const myWorkApi = {
  get: (limit = 20, outlet: string | null = null) =>
    api.get<MyWork>(`/api/my-work?limit=${limit}${outlet ? `&outlet=${encodeURIComponent(outlet)}` : ''}`),
}
