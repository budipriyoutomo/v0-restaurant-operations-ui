'use client'

// Field-work status strip (Tier 5.3-B, Todo-Pilot §27 / UX-14). Hidden while
// online with fresh data and an empty queue. Otherwise it says:
//   · offline → the screen shows data from the last sync (with its time);
//   · online but old → the data may be out of date, with "Reload";
//   · actions waiting to sync, with "Sync now";
//   · changes the server refused on replay, each with a plain reason and the
//     choice to try again or discard — never dropped silently.
// Coming back online sends the queue, then reloads the data.
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CloudOff, RefreshCw, WifiOff } from 'lucide-react'
import { authToken, initOfflineSync } from '@/lib/api-client'
import { conflictReason, discardConflict, flush, retryConflict, subscribe, type QueueState } from '@/lib/offline-queue'
import { useIssueStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
// Older than this while online → "may be out of date".
export const STALE_AFTER_MS = 15 * 60_000

export function OfflineStatusBar() {
  const { t, dateTime, locale } = useT()
  const lastSyncedAt = useIssueStore((s) => s.lastSyncedAt)
  const loadAll = useIssueStore((s) => s.loadAll)
  const [queue, setQueue] = useState<QueueState>({ pending: 0, conflicts: [] })
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showConflicts, setShowConflicts] = useState(false)
  const [, tick] = useState(0)

  const syncNow = useCallback(async () => {
    setSyncing(true)
    try { await flush(BASE_URL, authToken.get()) } finally { setSyncing(false) }
  }, [])

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = async () => {
      setOnline(true)
      await syncNow()                 // queued work first, so the reload shows it
      await loadAll()
    }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    initOfflineSync()
    const unsub = subscribe(setQueue)
    const timer = window.setInterval(() => tick((n) => n + 1), 60_000)   // re-check staleness
    return () => {
      window.removeEventListener('online', on); window.removeEventListener('offline', off)
      unsub(); window.clearInterval(timer)
    }
  }, [syncNow, loadAll])

  const syncedMs = lastSyncedAt ? Date.parse(lastSyncedAt) : NaN
  const stale = online && Number.isFinite(syncedMs) && Date.now() - syncedMs > STALE_AFTER_MS
  const conflicts = queue.conflicts
  if (online && !stale && queue.pending === 0 && conflicts.length === 0) return null

  const syncedText = Number.isFinite(syncedMs)
    ? (new Date(syncedMs).toDateString() === new Date().toDateString()
        ? new Date(syncedMs).toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
        : dateTime(lastSyncedAt))
    : null

  return (
    <div className={cn('text-xs font-medium', conflicts.length ? 'bg-destructive/10 text-destructive' : online ? 'bg-warning/15 text-amber-800 dark:text-amber-300' : 'bg-muted text-muted-foreground')}>
      <div role="status" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-1.5">
        {online ? <CloudOff className="size-3.5" /> : <WifiOff className="size-3.5" />}
        {!online && <span>{t('offline.mode')}</span>}
        {syncedText && (!online || stale) && (
          <span>{stale ? t('offline.stale', { time: syncedText }) : t('offline.lastSynced', { time: syncedText })}</span>
        )}
        {queue.pending > 0 && <span>· {t('offline.pending', { count: queue.pending })}</span>}
        {conflicts.length > 0 && (
          <span className="flex items-center gap-1">
            <AlertTriangle className="size-3.5" />
            {conflicts.length === 1 ? t('offline.conflictOne') : t('offline.conflictMany', { count: conflicts.length })}
          </span>
        )}
        {online && queue.pending > 0 && (
          <button onClick={syncNow} disabled={syncing}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-current/30 hover:bg-current/10 disabled:opacity-50">
            <RefreshCw className={cn('size-3', syncing && 'animate-spin')} /> {t('offline.syncNow')}
          </button>
        )}
        {stale && queue.pending === 0 && (
          <button onClick={() => loadAll()}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-current/30 hover:bg-current/10">
            <RefreshCw className="size-3" /> {t('offline.reload')}
          </button>
        )}
        {conflicts.length > 0 && (
          <button onClick={() => setShowConflicts((v) => !v)} aria-expanded={showConflicts}
            className="px-2 py-0.5 rounded border border-current/30 hover:bg-current/10">
            {t('offline.review')}
          </button>
        )}
      </div>

      {showConflicts && conflicts.length > 0 && (
        <ul className="mx-auto max-w-2xl px-4 pb-3 space-y-2 text-foreground">
          {conflicts.map((c) => (
            <li key={c.id} className="rounded-md border border-border bg-background p-3 space-y-1.5">
              <p className="font-semibold">{c.label}</p>
              <p className="text-muted-foreground font-normal">{t(conflictReason(c.conflict!.status))}</p>
              {c.conflict!.detail && <p className="text-muted-foreground font-normal italic">{c.conflict!.detail}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={async () => { await retryConflict(c.id); await syncNow() }}
                  className="min-h-9 px-3 rounded-md border border-border font-medium hover:bg-muted/50">{t('offline.retry')}</button>
                <button onClick={() => discardConflict(c.id)}
                  className="min-h-9 px-3 rounded-md border border-destructive/40 text-destructive font-medium hover:bg-destructive/10">{t('offline.discard')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
