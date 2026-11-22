'use client'

// History of one issue from the audit log (Todo-Modern-UI Fase 3). The audit
// log needs `reports` view, so only roles that have it see this section.
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import type { AuditLog } from '@/lib/types'
import { useT } from '@/lib/i18n'

export function IssueHistory({ issueId, version }: { issueId: string; version?: number }) {
  const { t, status, dateTime } = useT()
  const [rows, setRows] = useState<AuditLog[] | null>(null)

  useEffect(() => {
    let live = true
    api.get<AuditLog[]>(`/api/audit-logs?table_name=issues&record_id=${encodeURIComponent(issueId)}&limit=20`)
      .then((r) => { if (live) setRows(r) }).catch(() => { if (live) setRows([]) })
    return () => { live = false }
  }, [issueId, version])

  if (rows === null) return null

  const what = (r: AuditLog) => {
    const from = r.old_value?.status, to = r.new_value?.status
    if (r.action === 'status_change' && typeof from === 'string' && typeof to === 'string') {
      const reason = typeof r.new_value?.reason === 'string' && r.new_value.reason ? ` — ${r.new_value.reason}` : ''
      return t('issueDrawer.historyStatus', { from: status(from), to: status(to) }) + reason
    }
    return t('issueDrawer.historyUpdated')
  }

  return (
    <section aria-labelledby="issue-history" className="space-y-2">
      <h3 id="issue-history" className="text-sm font-semibold">{t('issueDrawer.history')}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('issueDrawer.historyEmpty')}</p>
      ) : (
        <ol className="space-y-2 border-l border-border pl-3">
          {rows.map((r) => (
            <li key={r.id} className="text-sm">
              <p>{what(r)}</p>
              <p className="text-xs text-muted-foreground">{r.performed_by} · {dateTime(r.created_at)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
