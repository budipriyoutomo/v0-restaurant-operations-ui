'use client'

import { useEffect } from 'react'
import { useIssueStore } from '@/lib/store'
import { UNASSIGNED, isUnassigned } from '@/lib/assignee'
import { UnlinkedAssigneeNote } from './unlinked-assignee-note'
import { useT } from '@/lib/i18n'

// Assign to a user who can work at the outlet — not a free-text name
// (Todo-Pilot §17 / UX-4). Only a linked user receives notifications.
export function AssigneePicker({
  id, outlet, value, legacyName, onChange, disabled, className,
}: {
  id?: string
  outlet: string
  value: string | null                 // assignee user id; null = unassigned / not linked
  legacyName?: string | null           // current free-text assignee that is not a user
  onChange: (userId: string | null, name: string) => void
  disabled?: boolean
  className?: string
}) {
  const users = useIssueStore((s) => s.assignableUsers[outlet])
  const loadAssignableUsers = useIssueStore((s) => s.loadAssignableUsers)
  const { t } = useT()

  useEffect(() => {
    loadAssignableUsers(outlet).catch(() => {})
  }, [outlet, loadAssignableUsers])

  const showLegacy = !value && !isUnassigned(legacyName)
  const LEGACY = '__legacy__'
  // A picked user who has since lost access to this outlet still shows by id.
  const missing = value && users && !users.some((u) => u.id === value)

  return (
    <div className="space-y-1">
      <select
        id={id}
        value={value ?? (showLegacy ? LEGACY : '')}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value
          if (v === LEGACY) return
          const user = users?.find((u) => u.id === v)
          onChange(user ? user.id : null, user ? user.name : UNASSIGNED)   // 'Unassigned' is the API value
        }}
        className={className ?? 'w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'}
      >
        <option value="">{t('common.unassigned')}</option>
        {showLegacy && <option value={LEGACY} disabled>{t('assignee.notAUser', { name: legacyName! })}</option>}
        {missing && <option value={value!}>{t('assignee.noAccess', { outlet })}</option>}
        {(users ?? []).map((u) => (
          <option key={u.id} value={u.id}>{u.name} — {u.role_name}</option>
        ))}
      </select>
      {showLegacy && <UnlinkedAssigneeNote record={{ assignee: legacyName!, assigneeUserId: null }} />}
    </div>
  )
}
