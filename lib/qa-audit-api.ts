// QA audit API calls (Todo-Pilot §7). Field actions (answers, photos) go through
// mutateOrQueue so an auditor in a basement kitchen with no signal keeps working:
// the change is queued with an Idempotency-Key and replayed when back online.
import { api } from './api-client'
import type {
  QAAuditDetail, QAAuditFinding, QAAuditPhoto, QAAuditResult, QAAuditSummary,
  QAAuditTemplate, QAAuditTemplateItemInput, QAScores,
} from './types'

export const qaApi = {
  templates: (includeInactive = false) =>
    api.get<QAAuditTemplate[]>(`/api/qa-audit-templates${includeInactive ? '?includeInactive=true' : ''}`),
  createTemplate: (body: { name: string; description: string; items: QAAuditTemplateItemInput[] }) =>
    api.post<QAAuditTemplate>('/api/qa-audit-templates', body),
  updateTemplate: (id: string, body: Partial<{ name: string; description: string; isActive: boolean; items: QAAuditTemplateItemInput[] }>) =>
    api.patch<QAAuditTemplate>(`/api/qa-audit-templates/${id}`, body),

  list: () => api.get<QAAuditSummary[]>('/api/qa-audits'),
  get: (id: string) => api.get<QAAuditDetail>(`/api/qa-audits/${id}`),
  start: (body: { templateId: string; outlet: string; auditDate?: string }, idempotencyKey: string) =>
    api.post<QAAuditDetail>('/api/qa-audits', body, { 'Idempotency-Key': idempotencyKey }),
  discard: (id: string) => api.delete(`/api/qa-audits/${id}`),
  submit: (id: string) => api.post<QAAuditDetail>(`/api/qa-audits/${id}/submit`, {}),
  scores: (months = 6) => api.get<QAScores>(`/api/qa-audits/scores?months=${months}`),

  /** Throws QueuedError when saved offline. */
  updateFinding: (auditId: string, findingId: string, body: { result?: QAAuditResult; notes?: string }) =>
    api.mutateOrQueue<QAAuditFinding>({
      method: 'PATCH', path: `/api/qa-audits/${auditId}/findings/${findingId}`, body,
      label: 'Jawaban audit',
    }),
  /** Throws QueuedError when saved offline. */
  uploadPhoto: (auditId: string, findingId: string, file: File) =>
    api.mutateOrQueue<QAAuditPhoto>({
      method: 'POST', path: `/api/qa-audits/${auditId}/findings/${findingId}/photos`,
      file, fileName: file.name, label: 'Foto audit',
    }),
}
