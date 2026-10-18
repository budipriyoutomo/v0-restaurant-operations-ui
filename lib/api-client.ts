// Thin fetch wrapper for the Issue Core REST API.
// All methods throw on non-2xx so callers can catch errors.
import type { MasterCategory, Outlet, User } from './types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Token management — stored in localStorage under 'auth_token'
export const authToken = {
  get: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
  set: (token: string): void =>
    typeof window !== 'undefined' ? localStorage.setItem('auth_token', token) : undefined,
  clear: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('auth_token')
    localStorage.removeItem(USER_KEY)     // the profile goes with the session (logout, 401)
    localStorage.removeItem(MASTER_KEY)
  },
}

// Last profile from /api/auth/me, so an offline start keeps the session
// (Todo-PWA P1). Same lifetime and storage as the token.
const USER_KEY = 'ro.user'
export const cachedUser = {
  get: (): User | null => {
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') } catch { return null }
  },
  set: (user: User): void => {
    if (typeof window !== 'undefined') localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
}

// Outlets and categories, so "Lapor" works on an offline start (Todo-PWA,
// verifikasi akhir). Tagged with the user; same lifetime as the token.
const MASTER_KEY = 'ro.masterData'
type MasterData = { outlets: Outlet[]; categories: MasterCategory[] }
export const cachedMasterData = {
  get: (owner: string | undefined): MasterData | null => {
    if (typeof window === 'undefined' || !owner) return null
    try {
      const v = JSON.parse(localStorage.getItem(MASTER_KEY) ?? 'null')
      return v?.owner === owner ? { outlets: v.outlets, categories: v.categories } : null
    } catch { return null }
  },
  set: (owner: string, data: MasterData): void => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(MASTER_KEY, JSON.stringify({ owner, ...data })) } catch { /* quota: online only */ }
  },
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = authToken.get()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return { ...headers, ...(extra ?? {}) }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    // After the spread: options.headers must extend, not replace, auth + JSON.
    headers: buildHeaders(options?.headers),
  })
  if (!res.ok) {
    // Clear token on 401 so stale tokens don't get stuck
    if (res.status === 401) authToken.clear()
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  // Don't set Content-Type — the browser adds the multipart boundary itself.
  const token = authToken.get()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })
  if (!res.ok) {
    if (res.status === 401) authToken.clear()
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status} ${path}: ${text}`)
  }
  return res.json() as Promise<T>
}

/** Fetch an authenticated binary (image) and return an object URL for <img src>.
 *  Needed because the serve routes require a Bearer header, which a plain
 *  <img src="/api/..."> cannot send. Caller should URL.revokeObjectURL when done. */
async function objectUrl(path: string): Promise<string> {
  const token = authToken.get()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) throw new Error(`API ${res.status} ${path}`)
  return URL.createObjectURL(await res.blob())
}

// ---------------------------------------------------------------------------
// Offline-aware mutations (Tier 5.3-B)
// ---------------------------------------------------------------------------

import * as queue from './offline-queue'

/** Thrown when a mutation was queued for later instead of hitting the server. */
export class QueuedError extends Error {
  readonly queued = true
  constructor(public label: string) { super('mutation queued offline') }
}

interface MutateSpec {
  method: 'POST' | 'PATCH' | 'DELETE'
  path: string
  label: string                    // shown in the offline status UI
  body?: unknown                   // JSON body
  file?: Blob                      // photo (switches to multipart)
  fileName?: string
  formParts?: { field: string; value: string }[]
  key?: string                     // the caller's idempotency key (one per dialog opening)
  after?: string                   // queue key of the item this one needs first (offline-queue PARENT_ID)
}

/**
 * Run a mutation, or queue it if offline / the network drops.
 *
 * The idempotency key is minted up front and used both for the live attempt and
 * for the queued replay, so a request that reached the server before the
 * connection died is deduped on replay (backend Tier 5.3-A), never doubled.
 *
 * Throws QueuedError when queued; throws a normal Error for business failures
 * (4xx) which are NOT queued (replaying them would just fail forever).
 */
async function mutateOrQueue<T>(spec: MutateSpec): Promise<T> {
  const key = spec.key ?? queue.newKey()
  const kind: 'json' | 'form' = spec.file || spec.formParts ? 'form' : 'json'
  const enqueue = () => queue.enqueue({
    id: key, method: spec.method, path: spec.path, kind,
    body: spec.body, formParts: spec.formParts, file: spec.file, fileName: spec.fileName,
    label: spec.label, owner: queue.tokenOwner(authToken.get()) ?? undefined,
    ...(spec.after ? { after: spec.after } : {}),
  })

  // Waits for a queued parent: its path is only known once that one is sent.
  if (!queue.isOnline() || spec.after) {
    await enqueue()
    throw new QueuedError(spec.label)
  }

  const token = authToken.get()
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (token) headers['Authorization'] = `Bearer ${token}`
  let body: BodyInit | undefined
  if (kind === 'json') {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(spec.body ?? {})
  } else {
    const form = new FormData()
    ;(spec.formParts ?? []).forEach((p) => form.append(p.field, p.value))
    if (spec.file) form.append('file', spec.file, spec.fileName ?? 'photo')
    body = form
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${spec.path}`, { method: spec.method, headers, body })
  } catch {
    // Network failure → queue for replay.
    await enqueue()
    throw new QueuedError(spec.label)
  }
  if (!res.ok) {
    if (res.status === 401) authToken.clear()
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status} ${spec.path}: ${text}`)
  }
  return res.json() as Promise<T>
}

let onlineListenerAdded = false

/** Flush the queue now, and whenever the browser comes back online. Safe to
 *  call on every mount (e.g. each login): the listener is registered once. */
export function initOfflineSync(): void {
  if (typeof window === 'undefined') return
  queue.setOwnerSource(() => queue.tokenOwner(authToken.get()))
  const doFlush = () => queue.flush(BASE_URL, authToken.get()).catch(() => {})
  if (!onlineListenerAdded) {
    window.addEventListener('online', doFlush)
    onlineListenerAdded = true
  }
  doFlush()
}

/** Human-readable message from an API error: FastAPI's `detail` (string, or
 *  {message} as the Issue closure guard returns), else the raw error text. */
/** HTTP status of a failed API call, or null (network error, not an API error). */
export function apiStatus(e: unknown): number | null {
  if (!(e instanceof Error)) return null
  const m = /^API (\d{3}) /.exec(e.message)
  return m ? Number(m[1]) : null
}

export function apiErrorMessage(e: unknown, fallback = 'Request failed.'): string {
  if (!(e instanceof Error)) return fallback
  const json = e.message.slice(e.message.indexOf(': ') + 2)
  try {
    const detail = JSON.parse(json).detail
    if (typeof detail === 'string') return detail
    if (detail && typeof detail.message === 'string') return detail.message
  } catch { /* not JSON */ }
  return e.message
}

/** A page of a list plus the full size from X-Total-Count (Todo-Pilot §22). */
async function getPage<T>(path: string): Promise<{ items: T[]; total: number }> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: buildHeaders() })
  if (!res.ok) {
    if (res.status === 401) authToken.clear()
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status} ${path}: ${text}`)
  }
  const items = (await res.json()) as T[]
  const header = res.headers.get('X-Total-Count')
  return { items, total: header !== null ? Number(header) : items.length }
}

export const api = {
  get:    <T>(path: string)                => request<T>(path),
  getPage,
  post:   <T>(path: string, body: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), headers }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T = void>(path: string)         => request<T>(path, { method: 'DELETE' }),
  postForm: requestForm,
  objectUrl,
  mutateOrQueue,
}
