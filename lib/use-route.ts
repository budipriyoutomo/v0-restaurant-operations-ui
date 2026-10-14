'use client'

// React side of lib/routes.ts (Todo-Pilot §14 / UX-1).
//
// Navigation uses window.history.pushState, which Next.js syncs into
// usePathname/useSearchParams without re-mounting the app shell — so changing
// page or opening a record never re-runs the session check or loadAll().

import { useCallback, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { pagePath, parseRoute, recordPath, withSearch, type Route } from './routes'

export function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
  if (typeof window === 'undefined') return
  if (replace) window.history.replaceState(null, '', path)
  else window.history.pushState(null, '', path)
}

export function useRoute(): Route {
  return parseRoute(usePathname() ?? '/')
}

/**
 * Selected record of a page's detail drawer. When `routed`, the selection lives
 * in the URL (`/issues/{id}`); otherwise (a list embedded in another page's tab)
 * it is local state. Opening/closing keeps the current query string (filters).
 */
export function useRecordRoute(routed = true) {
  const { page, recordId } = useRoute()
  const [localId, setLocalId] = useState<string | null>(null)

  const open = useCallback((id: string) => {
    if (!routed) return setLocalId(id)
    navigate(withSearch(recordPath(page, id), window.location.search))
  }, [routed, page])

  const close = useCallback(() => {
    if (!routed) return setLocalId(null)
    navigate(withSearch(pagePath(page), window.location.search))
  }, [routed, page])

  return { recordId: routed ? recordId : localId, open, close }
}

/**
 * A list filter kept in the query string (`?status=open`) so it survives a
 * refresh and can be shared. Updates replace the history entry, so Back still
 * goes to the previous page rather than the previous filter. When not `routed`
 * it is plain local state. Setting the `fallback` removes the key from the URL.
 */
export function useUrlState(key: string, fallback: string | null = null, routed = true) {
  const search = useSearchParams()
  const [local, setLocal] = useState<string | null>(fallback)
  const fromUrl = search?.has(key) ? search.get(key) || null : fallback

  const set = useCallback((value: string | null) => {
    if (!routed) return setLocal(value)
    const params = new URLSearchParams(window.location.search)
    if ((value || null) === fallback) params.delete(key)
    else params.set(key, value ?? '')   // `?status=` = explicitly "any", overriding a non-null fallback
    navigate(withSearch(window.location.pathname, params.toString()), { replace: true })
  }, [routed, key, fallback])

  return [routed ? fromUrl : local, set] as const
}
