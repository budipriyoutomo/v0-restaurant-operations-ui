// Thin fetch wrapper for the Issue Core REST API.
// All methods throw on non-2xx so callers can catch errors.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Token management — stored in localStorage under 'auth_token'
export const authToken = {
  get: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
  set: (token: string): void =>
    typeof window !== 'undefined' ? localStorage.setItem('auth_token', token) : undefined,
  clear: (): void =>
    typeof window !== 'undefined' ? localStorage.removeItem('auth_token') : undefined,
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = authToken.get()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return { ...headers, ...(extra ?? {}) }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: buildHeaders(options?.headers),
    ...options,
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
  const key = queue.newKey()
  const kind: 'json' | 'form' = spec.file || spec.formParts ? 'form' : 'json'
  const enqueue = () => queue.enqueue({
    id: key, method: spec.method, path: spec.path, kind,
    body: spec.body, formParts: spec.formParts, file: spec.file, fileName: spec.fileName,
    label: spec.label,
  })

  if (!queue.isOnline()) {
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

/** Flush the queue now, and whenever the browser comes back online. Call once. */
export function initOfflineSync(onChange?: (pending: number) => void): void {
  if (typeof window === 'undefined') return
  const doFlush = () => queue.flush(BASE_URL, authToken.get()).catch(() => {})
  window.addEventListener('online', doFlush)
  if (onChange) queue.subscribe(onChange)
  doFlush()
}

export const api = {
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T = void>(path: string)         => request<T>(path, { method: 'DELETE' }),
  postForm: requestForm,
  objectUrl,
  mutateOrQueue,
}
