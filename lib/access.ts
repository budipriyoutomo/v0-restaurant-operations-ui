import type { AccessLevel, User } from './types'

// Pure permission helpers (no store import, so lib/store.ts can use them too).
// Mirrors backend/app/permissions.py — the backend is the security boundary,
// this only decides what the UI offers and which endpoints it bothers calling.

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, manage: 2 }

export function hasPermission(
  user: Pick<User, 'permissions'> | null | undefined,
  module: string,
  level: AccessLevel = 'view',
): boolean {
  const granted = user?.permissions?.[module] ?? 'none'
  return RANK[granted] >= RANK[level]
}

export function hasAnyPermission(
  user: Pick<User, 'permissions'> | null | undefined,
  modules: string[],
  level: AccessLevel = 'view',
): boolean {
  return modules.some((m) => hasPermission(user, m, level))
}

// Pages every signed-in user can open regardless of role. Settings only holds
// the user's own preferences (/api/auth/me/*); the `settings` module permission
// still gates company-wide system jobs (can.runSystemJobs).
const ALWAYS_VISIBLE = new Set(['notifications', 'settings'])

// Page ids are module keys.
export function canViewPage(user: Pick<User, 'permissions'> | null | undefined, page: string): boolean {
  return ALWAYS_VISIBLE.has(page) || hasPermission(user, page)
}

// Endpoint read rules — keep in sync with require_permission() in the routers.
export const READS = {
  issues:       ['issues', 'dashboard', 'maintenance', 'qa', 'guest-service', 'it-support'],
  tasks:        ['tasks'],
  approvals:    ['approvals'],
  assets:       ['assets', 'cmms'],
  workOrders:   ['cmms', 'assets'],
  vendors:      ['vendors', 'procurement', 'cmms'],
  training:     ['training'],
  campaigns:    ['marketing'],
  auditLogs:    ['reports'],
} as const satisfies Record<string, readonly string[]>

export function canRead(user: Pick<User, 'permissions'> | null | undefined, key: keyof typeof READS): boolean {
  return hasAnyPermission(user, [...READS[key]])
}

// GET /api/auth/users: users:view, or approvals:manage (delegation picker).
export function canListUsers(user: Pick<User, 'permissions'> | null | undefined): boolean {
  return hasPermission(user, 'users') || hasPermission(user, 'approvals', 'manage')
}
