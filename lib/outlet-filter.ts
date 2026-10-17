// The top bar's outlet filter (Todo-UI "Filter outlet"): one outlet chosen for
// every list, the badges and My Work, or null for "all my outlets".
// Primitives only — no React/store imports (the store imports these).
// The value is the outlet *name*, which is what the list APIs filter on.
import type { Outlet, User } from './types'

export const OUTLET_FILTER_STORAGE_KEY = 'ro.outletFilter'

/** Last choice on this device. */
export function storedOutletFilter(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(OUTLET_FILTER_STORAGE_KEY) || null : null
  } catch {
    return null
  }
}

export function rememberOutletFilter(name: string | null) {
  try {
    if (name) window.localStorage.setItem(OUTLET_FILTER_STORAGE_KEY, name)
    else window.localStorage.removeItem(OUTLET_FILTER_STORAGE_KEY)
  } catch { /* private mode: the choice lasts for this visit only */ }
}

/**
 * The stored choice if this user may see that outlet, else null. A device can
 * be shared, and outlets get renamed or reassigned: never filter on an outlet
 * the user cannot open (the server would just answer an empty list).
 */
export function effectiveOutlet(
  name: string | null,
  user: Pick<User, 'all_outlets' | 'effective_outlet_ids'> | null,
  outlets: Pick<Outlet, 'id' | 'name'>[],
): string | null {
  if (!name || !user) return null
  const outlet = outlets.find((o) => o.name === name)
  if (!outlet) return null
  return user.all_outlets || (user.effective_outlet_ids ?? []).includes(outlet.id) ? name : null
}

/** `outlet=…` for a query string, or '' when no outlet is chosen. */
export function outletQuery(name: string | null): string {
  return name ? `outlet=${encodeURIComponent(name)}` : ''
}

/**
 * Rows already in memory (CMMS, analytics, training…), narrowed to one outlet.
 * `includeShared` keeps rows that apply to every outlet (outlet empty), such as
 * a company-wide training programme, campaign or vendor.
 */
export function byOutlet<T extends { outlet?: string | null }>(
  rows: T[], outlet: string | null, { includeShared = false }: { includeShared?: boolean } = {},
): T[] {
  return outlet ? rows.filter((r) => r.outlet === outlet || (includeShared && !r.outlet)) : rows
}
