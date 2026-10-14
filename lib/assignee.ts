// Assignees are users, not free text (Todo-Pilot §17 / UX-4). Records keep the
// display name in `assignee` and the user in `assigneeUserId`; only a linked
// user is notified.
import type { Issue } from './types'
import { translate } from './i18n/translate'
import type { Locale } from './i18n/locale'

export const UNASSIGNED = 'Unassigned'

export function isUnassigned(name: string | null | undefined): boolean {
  return !name || !name.trim() || name.trim().toLowerCase() === UNASSIGNED.toLowerCase()
}

export function unlinkedAssigneeWarning(r: Pick<Issue, 'assignee' | 'assigneeUserId'>, locale: Locale = 'en'): string | null {
  if (isUnassigned(r.assignee) || r.assigneeUserId) return null
  return translate(locale, 'assignee.unlinked', { name: r.assignee })
}
