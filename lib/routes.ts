// URL routing for the app shell (Todo-Pilot §14 / UX-1).
//
// Every page has a path (`/issues`) and pages with a detail drawer also have a
// record path (`/issues/{id}`), so refresh, the phone's Back button and shared
// links keep the user where they were. Paths of records that notifications link
// to must match backend app/services/deep_link.py.

export const PAGE_IDS = [
  'my-work', 'dashboard', 'issues', 'tasks', 'approvals', 'ops',
  'maintenance', 'cmms', 'assets', 'procurement', 'training', 'marketing', 'qa', 'guest-service',
  'it-support',
  'analytics', 'reports',
  'master-data', 'users', 'notifications', 'settings',
] as const

// Pages whose detail drawer is addressed by the URL.
export const RECORD_PAGES = ['issues', 'it-support', 'approvals', 'cmms', 'ops'] as const

// URL segment ↔ page id, where they differ.
const SEGMENT_TO_PAGE: Record<string, string> = { 'work-orders': 'cmms' }
const RECORD_SEGMENT: Record<string, string> = { cmms: 'work-orders' }

// notifications.entity_type → record path segment
const ENTITY_SEGMENT: Record<string, string> = {
  issues: 'issues',
  approvals: 'approvals',
  work_orders: 'work-orders',
  ops_checklists: 'ops',        // daily checklist runs (Todo-Ops-Checklist Fase 3)
}

export interface Route {
  page: string
  recordId: string | null
  notFound: boolean
}

export function parseRoute(pathname: string): Route {
  const segments = (pathname || '/').split('/').filter(Boolean)
  // '/' = the signed-in role's home page (Todo-Pilot §19), resolved by the app shell.
  if (segments.length === 0) return { page: 'home', recordId: null, notFound: false }

  const page = SEGMENT_TO_PAGE[segments[0]] ?? segments[0]
  const known = (PAGE_IDS as readonly string[]).includes(page)
  const hostsRecords = (RECORD_PAGES as readonly string[]).includes(page)

  if (!known || segments.length > 2 || (segments.length === 2 && !hostsRecords)) {
    return { page, recordId: null, notFound: true }
  }
  const recordId = segments.length === 2 ? decodeURIComponent(segments[1]) : null
  return { page, recordId, notFound: false }
}

export function pagePath(page: string): string {
  return page === 'home' ? '/' : `/${page}`
}

export function recordPath(page: string, id: string): string {
  return `/${RECORD_SEGMENT[page] ?? page}/${encodeURIComponent(id)}`
}

export function notificationPath(entityType: string | null, entityId: string | null): string | null {
  const segment = entityType ? ENTITY_SEGMENT[entityType] : undefined
  if (!segment || !entityId) return null
  return `/${segment}/${encodeURIComponent(entityId)}`
}

export function withSearch(path: string, search: string): string {
  const q = search.startsWith('?') ? search.slice(1) : search
  return q ? `${path}?${q}` : path
}
