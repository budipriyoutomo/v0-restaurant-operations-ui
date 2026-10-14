/**
 * Offline mutation queue (Tier 5.3-B).
 *
 * A technician in a chiller room / basement genset room loses signal. Their
 * checklist toggles, part usage and photos are queued in IndexedDB and replayed
 * when connectivity returns.
 *
 * Safety rests on the backend idempotency keys (Tier 5.3-A): every queued
 * mutation carries an `Idempotency-Key`, so replaying one that actually reached
 * the server the first time is a no-op, never a duplicate.
 *
 * Raw IndexedDB (no dependency). Blobs are stored directly, so photo uploads
 * survive offline too.
 */

const DB_NAME = 'restaurantops-offline'
const STORE = 'mutations'
const DB_VERSION = 1

export interface QueuedMutation {
  id: string                       // also the Idempotency-Key
  method: 'POST' | 'PATCH' | 'DELETE'
  path: string
  kind: 'json' | 'form'
  body?: unknown                   // for json
  formParts?: { field: string; value: string }[]   // for form (non-file fields)
  file?: Blob                      // for form (the photo)
  fileName?: string
  label: string                   // human summary for the status UI
  owner?: string                   // user id (JWT sub) that queued it; absent on pre-owner items
  createdAt: number
  attempts: number
  // Set when the server rejected the replay (Todo-Pilot §27): kept for the
  // user to retry or discard, never replayed on its own.
  conflict?: { status: number; detail: string; at: number }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export function newKey(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(16).slice(2)}`)
}

// ---------------------------------------------------------------------------
// Subscribers — the status bar re-renders on any change.
// ---------------------------------------------------------------------------

export interface QueueState { pending: number; conflicts: QueuedMutation[] }
type Listener = (state: QueueState) => void
const listeners = new Set<Listener>()

// Who is signed in, so the count only shows work this session can sync.
// Set by initOfflineSync(); until then nothing owned is counted.
let ownerSource: () => string | null = () => null

export function setOwnerSource(fn: () => string | null): void {
  ownerSource = fn
}

async function queueState(): Promise<QueueState> {
  const items = await listPending()
  const owner = ownerSource()
  return { pending: pendingFor(items, owner).length, conflicts: conflictsFor(items, owner) }
}

async function notify() {
  const state = await queueState()
  listeners.forEach((l) => l(state))
}

export function subscribe(l: Listener): () => void {
  listeners.add(l)
  queueState().then(l).catch(() => l({ pending: 0, conflicts: [] }))
  return () => listeners.delete(l)
}

// ---------------------------------------------------------------------------
// Queue API
// ---------------------------------------------------------------------------

export async function enqueue(m: Omit<QueuedMutation, 'id' | 'createdAt' | 'attempts'> & { id?: string }): Promise<QueuedMutation> {
  const item: QueuedMutation = { id: m.id ?? newKey(), createdAt: Date.now(), attempts: 0, ...m }
  await tx('readwrite', (s) => s.put(item))
  await notify()
  return item
}

export function listPending(): Promise<QueuedMutation[]> {
  return tx<QueuedMutation[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedMutation[]>)
    .then((items) => items.sort((a, b) => a.createdAt - b.createdAt))
    .catch(() => [])
}

async function remove(id: string) {
  await tx('readwrite', (s) => s.delete(id))
  await notify()
}

/** The user gives up a rejected change (the server's version stands). */
export async function discardConflict(id: string): Promise<void> {
  await remove(id)
}

/** The user wants a rejected change sent again (e.g. after reopening the record). */
export async function retryConflict(id: string): Promise<void> {
  const items = await listPending()
  const item = items.find((m) => m.id === id)
  if (!item) return
  delete item.conflict
  item.attempts = 0
  await tx('readwrite', (s) => s.put(item))
  await notify()
}

async function markConflict(item: QueuedMutation, status: number, detail: string) {
  item.conflict = { status, detail, at: Date.now() }
  await tx('readwrite', (s) => s.put(item))
  await notify()
}

async function bumpAttempts(item: QueuedMutation) {
  item.attempts += 1
  await tx('readwrite', (s) => s.put(item))
}

/** Build the fetch call for a queued mutation. Separated so both the online
 *  path and the flush path send an identical (idempotent) request. */
function buildRequest(m: QueuedMutation, baseUrl: string, token: string | null): [string, RequestInit] {
  const headers: Record<string, string> = { 'Idempotency-Key': m.id }
  if (token) headers['Authorization'] = `Bearer ${token}`
  let body: BodyInit | undefined
  if (m.kind === 'json') {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(m.body ?? {})
  } else {
    const form = new FormData()
    ;(m.formParts ?? []).forEach((p) => form.append(p.field, p.value))
    if (m.file) form.append('file', m.file, m.fileName ?? 'photo')
    body = form
  }
  return [`${baseUrl}${m.path}`, { method: m.method, headers, body }]
}

// ---------------------------------------------------------------------------
// Replay rules — pure, so they are unit-tested without IndexedDB.
// ---------------------------------------------------------------------------

/** User id (JWT `sub`) of a token, or null. Decoded only, never verified —
 *  it just tags queued work; the server still authenticates the replay. */
export function tokenOwner(token: string | null): string | null {
  const payload = token?.split('.')[1]
  if (!payload) return null
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const sub = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='))).sub
    return typeof sub === 'string' && sub ? sub : null
  } catch {
    return null
  }
}

/** Replay an item only under the session of the user who queued it — a
 *  colleague signing in on the same tablet must not send it as themselves. */
export function belongsTo(m: Pick<QueuedMutation, 'owner'>, owner: string | null): boolean {
  return m.owner === undefined || m.owner === owner
}

/** What to do with a queued item after its replay got `status`:
 *  sent — done; drop — a business rejection that will never succeed;
 *  stop — keep it and everything after it (expired session, rate limit, 5xx). */
/** The queued items `owner`'s session may replay (and so should be shown). */
export function pendingFor<T extends Pick<QueuedMutation, 'owner' | 'conflict'>>(items: T[], owner: string | null): T[] {
  return items.filter((m) => belongsTo(m, owner) && !m.conflict)
}

/** `owner`'s queued changes the server rejected — waiting for a decision. */
export function conflictsFor<T extends Pick<QueuedMutation, 'owner' | 'conflict'>>(items: T[], owner: string | null): T[] {
  return items.filter((m) => belongsTo(m, owner) && !!m.conflict)
}

/** Plain-words reason for a rejected replay (a message key). */
export function conflictReason(status: number): 'offline.conflict.changed' | 'offline.conflict.gone' | 'offline.conflict.forbidden' | 'offline.conflict.invalid' {
  if (status === 409) return 'offline.conflict.changed'
  if (status === 404 || status === 410) return 'offline.conflict.gone'
  if (status === 403) return 'offline.conflict.forbidden'
  return 'offline.conflict.invalid'
}

/** The server's own explanation from an error body (FastAPI `detail`). */
export function serverDetail(body: string): string {
  if (!body) return ''
  try {
    const d = JSON.parse(body)?.detail
    if (typeof d === 'string') return d
    if (Array.isArray(d)) return d.map((e) => e?.msg).filter(Boolean).join('; ')
  } catch { /* not JSON */ }
  return body.slice(0, 300)
}

export function replayOutcome(status: number): 'sent' | 'drop' | 'stop' {
  if (status >= 200 && status < 300) return 'sent'
  if (status === 401 || status === 408 || status === 429) return 'stop'
  if (status >= 400 && status < 500) return 'drop'
  return 'stop'
}

let flushing = false

/**
 * Replay the current user's queued mutations in order. Stops on the first
 * network failure (still offline), expired session or server error and leaves
 * the rest queued. A business rejection (other 4xx) drops the item — replaying
 * it forever would wedge the queue.
 */
export async function flush(baseUrl: string, token: string | null): Promise<{ sent: number; failed: number }> {
  if (flushing) return { sent: 0, failed: 0 }
  flushing = true
  let sent = 0
  let failed = 0
  try {
    const owner = tokenOwner(token)
    const items = pendingFor(await listPending(), owner)
    for (const m of items) {
      const [url, init] = buildRequest(m, baseUrl, token)
      let res: Response
      try {
        res = await fetch(url, init)
      } catch {
        // Network still down — keep this and everything after it queued.
        failed = items.length - sent
        break
      }
      const outcome = replayOutcome(res.status)
      if (outcome === 'sent') {
        await remove(m.id)
        sent += 1
      } else if (outcome === 'drop') {
        // A client error that will not succeed by itself on replay (e.g. the
        // WO was completed meanwhile). Keep it as a conflict for the user to
        // decide (Todo-Pilot §27) instead of losing their work silently.
        await markConflict(m, res.status, serverDetail(await res.text().catch(() => '')))
        failed += 1
      } else {
        // Expired session (401 — the work is still valid, keep it for after
        // re-login), rate limit or 5xx: keep this and everything after it.
        await bumpAttempts(m)
        failed = items.length - sent
        break
      }
    }
  } finally {
    flushing = false
  }
  return { sent, failed }
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}
