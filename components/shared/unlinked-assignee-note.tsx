import { AlertTriangle } from 'lucide-react'
import { unlinkedAssigneeWarning } from '@/lib/assignee'
import { useT } from '@/lib/i18n'

// Read-only views: tell people a free-text assignee gets no notifications (Todo-Pilot §17).
export function UnlinkedAssigneeNote({ record }: { record: { assignee: string; assigneeUserId?: string | null } }) {
  const { locale } = useT()
  const warning = unlinkedAssigneeWarning(record, locale)
  if (!warning) return null
  return (
    <p role="status" className="flex items-start gap-1 text-xs text-amber-700 mt-1">
      <AlertTriangle className="size-3.5 flex-shrink-0 mt-px" /> {warning}
    </p>
  )
}
