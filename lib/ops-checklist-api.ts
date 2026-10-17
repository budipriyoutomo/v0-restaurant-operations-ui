// Daily ops checklist API calls (Todo-Ops-Checklist Fase 1). Field actions
// (answers, photos, submit) go through mutateOrQueue: a chiller room has no
// signal, so the change is queued with an Idempotency-Key and replayed later.
import { api } from './api-client'
import type {
  CreatedTemperatureSensor, OpsDay, OpsKpis, OpsPreset, OpsPresetResult, OpsScheduleFrequency, OpsSignoff,
  TemperatureLog, TemperatureSensor,
  OpsPhoto, OpsResult, OpsRun, OpsRunDetail, OpsRunItem, OpsRunStatus, OpsSchedule, OpsShift, OpsTemplate,
  OpsTemplateItemInput,
} from './types'

export interface OpsTemplateInput {
  name: string
  description: string
  shift: OpsShift
  isActive?: boolean
  items: OpsTemplateItemInput[]
}

export interface OpsScheduleInput {
  templateId: string
  outlet: string
  frequency: OpsScheduleFrequency
  daysOfWeek: number[]
  dayOfMonth: number | null
  dueTime: string
  openMinutesBefore: number
  graceMinutes: number
  isActive?: boolean
}

export interface OpsAnswer {
  result?: OpsResult
  value?: number
  notes?: string
  correctiveAction?: string
  recordedAt?: string      // device clock — evidence of when it was checked
}

const qs = (params: Record<string, string | null | undefined>) => {
  const p = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
  return p.length ? `?${p.join('&')}` : ''
}

export const opsApi = {
  templates: (includeInactive = false) =>
    api.get<OpsTemplate[]>(`/api/ops-checklist-templates${includeInactive ? '?include_inactive=true' : ''}`),
  createTemplate: (body: OpsTemplateInput) => api.post<OpsTemplate>('/api/ops-checklist-templates', body),
  updateTemplate: (id: string, body: Partial<OpsTemplateInput>) =>
    api.patch<OpsTemplate>(`/api/ops-checklist-templates/${id}`, body),

  schedules: () => api.get<OpsSchedule[]>('/api/ops-checklist-schedules'),
  createSchedule: (body: OpsScheduleInput) => api.post<OpsSchedule>('/api/ops-checklist-schedules', body),
  updateSchedule: (id: string, body: Partial<OpsScheduleInput>) =>
    api.patch<OpsSchedule>(`/api/ops-checklist-schedules/${id}`, body),
  deleteSchedule: (id: string) => api.delete(`/api/ops-checklist-schedules/${id}`),

  /** No date → today at each outlet. */
  runs: (f: { date?: string; from?: string; to?: string; outlet?: string; status?: OpsRunStatus } = {}) =>
    api.get<OpsRun[]>(`/api/ops-checklists${qs({ ...f })}`),
  get: (id: string) => api.get<OpsRunDetail>(`/api/ops-checklists/${id}`),
  kpis: (from?: string, to?: string) => api.get<OpsKpis>(`/api/ops-checklists/kpis${qs({ from, to })}`),
  /** One outlet's business day: runs, summary, sign-off (Fase 4). */
  day: (date: string, outlet: string) => api.get<OpsDay>(`/api/ops-checklists/days/${date}${qs({ outlet })}`),
  signDay: (date: string, outlet: string, note: string) =>
    api.post<OpsSignoff>(`/api/ops-checklists/days/${date}/signoff`, { outlet, note }),
  signoffs: (f: { outlet?: string; from?: string; to?: string } = {}) =>
    api.get<OpsSignoff[]>(`/api/ops-checklists/signoffs${qs({ ...f })}`),
  /** Inspection PDF (≤ 31 days) → object URL; revoke it after the download starts. */
  exportPdf: (outlet: string, from: string, to: string) =>
    api.objectUrl(`/api/ops-checklists/export.pdf${qs({ outlet, from, to })}`),

  presets: () => api.get<OpsPreset[]>('/api/ops-checklist-templates/presets'),
  applyPreset: (key: string, outlet?: string) =>
    api.post<OpsPresetResult>(`/api/ops-checklist-templates/presets/${key}`, outlet ? { outlet } : {}),

  sensors: (assetId: string) => api.get<TemperatureSensor[]>(`/api/assets/${assetId}/temperature-sensors`),
  createSensor: (assetId: string, name: string) =>
    api.post<CreatedTemperatureSensor>(`/api/assets/${assetId}/temperature-sensors`, { name }),
  revokeSensor: (assetId: string, sensorId: string) =>
    api.delete(`/api/assets/${assetId}/temperature-sensors/${sensorId}`),

  runNow: () => api.post<{ created: number; missed: number }>('/api/ops-checklists/run-now', {}),

  /** Throws QueuedError when saved offline. */
  answer: (runId: string, itemId: string, body: OpsAnswer) =>
    api.mutateOrQueue<OpsRunItem>({
      method: 'PATCH', path: `/api/ops-checklists/${runId}/items/${itemId}`,
      body: { recordedAt: new Date().toISOString(), ...body }, label: 'Jawaban checklist',
    }),
  /** Throws QueuedError when saved offline. */
  uploadPhoto: (runId: string, itemId: string, file: File) =>
    api.mutateOrQueue<OpsPhoto>({
      method: 'POST', path: `/api/ops-checklists/${runId}/items/${itemId}/photos`,
      file, fileName: file.name, label: 'Foto checklist',
    }),
  temperatureLogs: (assetId: string, days = 30) =>
    api.get<TemperatureLog[]>(`/api/assets/${assetId}/temperature-logs?days=${days}`),
  /** A reading outside the schedule. Throws QueuedError when saved offline. */
  recordTemperature: (assetId: string, body: { value: number; correctiveAction?: string }) =>
    api.mutateOrQueue<TemperatureLog>({
      method: 'POST', path: `/api/assets/${assetId}/temperature-logs`,
      body: { recordedAt: new Date().toISOString(), ...body }, label: 'Catat suhu',
    }),

  /** Throws QueuedError when saved offline (replayed after the queued answers). */
  submit: (runId: string) =>
    api.mutateOrQueue<OpsRunDetail>({ method: 'POST', path: `/api/ops-checklists/${runId}/submit`, label: 'Kirim checklist' }),
}
