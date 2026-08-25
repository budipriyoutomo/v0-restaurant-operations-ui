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
  createdAt: number
  attempts: number
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

type Listener = (count: number) => void
const listeners = new Set<Listener>()

async function notify() {
  const items = await listPending()
  listeners.forEach((l) => l(items.length))
}

export function subscribe(l: Listener): () => void {
  listeners.add(l)
  listPending().then((items) => l(items.length)).catch(() => l(0))
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

let flushing = false

/**
 * Replay every queued mutation in order. Stops on the first network failure
 * (still offline) and leaves the rest queued. A 4xx (business rejection) drops
 * the item — replaying it forever would wedge the queue.
 */
export async function flush(baseUrl: string, token: string | null): Promise<{ sent: number; failed: number }> {
  if (flushing) return { sent: 0, failed: 0 }
  flushing = true
  let sent = 0
  let failed = 0
  try {
    const items = await listPending()
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
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        // Success, or a client error that will never succeed on replay
        // (e.g. the WO was completed meanwhile). Either way, stop retrying it.
        await remove(m.id)
        if (res.ok) sent += 1
        else failed += 1
      } else {
        // 5xx — transient server issue; keep for the next flush.
        await bumpAttempts(m)
        failed += 1
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
