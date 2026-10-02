// Guest Service API calls (Todo-Pilot §8).
import { api } from './api-client'
import type { CompensationType, GuestCase, GuestChannel, GuestKpis, Priority } from './types'

export interface NewGuestCase {
  title: string
  description: string
  outlet: string
  priority: Priority
  guestName: string
  guestContact: string
  channel: GuestChannel
  reportedAt?: string          // ISO; default now
}

export const guestApi = {
  list: () => api.get<GuestCase[]>('/api/guest-cases'),
  get: (id: string) => api.get<GuestCase>(`/api/guest-cases/${id}`),
  kpis: (months = 3) => api.get<GuestKpis>(`/api/guest-cases/kpis?months=${months}`),
  create: (body: NewGuestCase, idempotencyKey: string) =>
    api.post<GuestCase>('/api/guest-cases', body, { 'Idempotency-Key': idempotencyKey }),
  update: (id: string, body: Partial<Pick<GuestCase, 'guestName' | 'guestContact' | 'channel'>>) =>
    api.patch<GuestCase>(`/api/guest-cases/${id}`, body),
  respond: (id: string, note: string) => api.post<GuestCase>(`/api/guest-cases/${id}/respond`, { note }),
  recovery: (id: string, body: { compensationType: CompensationType; compensationValue: number; note: string }) =>
    api.patch<GuestCase>(`/api/guest-cases/${id}/recovery`, body),
}
