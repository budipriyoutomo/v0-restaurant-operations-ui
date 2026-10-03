// Platform admin REST calls (/api/platform/*, Todo-Pilot §11). Snake_case like the backend.
import { api } from './api-client'
import type { NewCompanyForm } from './platform'

export interface PlatformCompany {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string | null
  user_count: number
  outlet_count: number
}

export interface CreatedCompany {
  company: PlatformCompany
  admin_email: string
  admin_password: string | null   // only when generated — show once
}

export const platformApi = {
  list: () => api.get<PlatformCompany[]>('/api/platform/companies'),
  create: (form: NewCompanyForm) => api.post<CreatedCompany>('/api/platform/companies', {
    name: form.name.trim(),
    admin_name: form.adminName.trim(),
    admin_email: form.adminEmail.trim(),
    admin_password: form.adminPassword || null,
    outlet_name: form.outletName.trim() || null,
  }),
  update: (id: string, body: { name?: string; is_active?: boolean }) =>
    api.patch<PlatformCompany>(`/api/platform/companies/${id}`, body),
}
