'use client'

import { useEffect } from 'react'
import { useIssueStore } from '@/lib/store'
import { UNASSIGNED, isUnassigned } from '@/lib/assignee'
import { UnlinkedAssigneeNote } from './unlinked-assignee-note'
import { useT } from '@/lib/i18n'
import { Select } from '@/components/shared/select'

// Assign to a user who can work at the outlet — not a free-text name
// (Todo-Pilot §17 / UX-4). Only a linked user receives notifications.
export function AssigneePicker({
  id, outlet, value, legacyName, onChange, disabled, className, size,
}: {
  id?: string
  outlet: string
  value: string | null                 // assignee user id; null = unassigned / not linked
  legacyName?: string | null           // current free-text assignee that is not a user
  onChange: (userId: string | null, name: string) => void
  disabled?: boolean
  /** Sizes the wrapper (width, margins). */
  className?: string
  size?: 'sm' | 'md'
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
      <Select
        id={id}
        size={size}
        className={className ?? 'w-full'}
        value={value ?? (showLegacy ? LEGACY : '')}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value
          if (v === LEGACY) return
          const user = users?.find((u) => u.id === v)
          onChange(user ? user.id : null, user ? user.name : UNASSIGNED)   // 'Unassigned' is the API value
        }}
      >
        <option value="">{t('common.unassigned')}</option>
        {showLegacy && <option value={LEGACY} disabled>{t('assignee.notAUser', { name: legacyName! })}</option>}
        {missing && <option value={value!}>{t('assignee.noAccess', { outlet })}</option>}
        {(users ?? []).map((u) => (
          <option key={u.id} value={u.id}>{u.name} — {u.role_name}</option>
        ))}
      </Select>
      {showLegacy && <UnlinkedAssigneeNote record={{ assignee: legacyName!, assigneeUserId: null }} />}
    </div>
  )
}
