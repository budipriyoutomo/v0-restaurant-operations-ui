'use client'

// One page of a server list (Todo-Pilot §22 / UX-9): filters and paging run on
// the server; the rows go into the store's cache (so actions that update a
// record update the card too), and the page refetches whenever something
// changed (store.listVersion).
import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from './api-client'
import { useIssueStore } from './store'

export type Params = Record<string, string | number | boolean | null | undefined>

export function buildQuery(params: Params): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '' || v === false) continue
    q.set(k, String(v))
  }
  return q.toString()
}

export function usePagedList<T extends { id: string }>(
  path: string,
  params: Params,
  { page, pageSize, onItems, enabled = true }: { page: number; pageSize: number; onItems?: (items: T[]) => void; enabled?: boolean },
): { ids: string[] | null; total: number; loading: boolean; error: string | null } {
  const listVersion = useIssueStore((s) => s.listVersion)
  const [state, setState] = useState<{ ids: string[] | null; total: number; error: string | null; key: string }>(
    { ids: null, total: 0, error: null, key: '' })
  const query = buildQuery({ ...params, limit: pageSize, offset: (page - 1) * pageSize })
  const key = `${path}?${query}`

  useEffect(() => {
    if (!enabled) return
    let live = true
    api.getPage<T>(key)
      .then(({ items, total }) => {
        if (!live) return
        onItems?.(items)
        setState({ ids: items.map((i) => i.id), total, error: null, key })
      })
      .catch((e) => { if (live) setState((s) => ({ ...s, error: apiErrorMessage(e), key })) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, listVersion, enabled])

  // Rows of a previous query stay on screen while the next one loads (no flicker).
  return { ids: state.ids, total: state.total, loading: state.key !== key, error: state.error }
}

/** `value`, but only after it stopped changing for `ms` — for search boxes. */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
