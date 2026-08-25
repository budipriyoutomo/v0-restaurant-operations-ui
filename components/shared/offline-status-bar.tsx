'use client'

import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react'
import { authToken, initOfflineSync } from '@/lib/api-client'
import { flush, subscribe } from '@/lib/offline-queue'
import { cn } from '@/lib/utils'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

/**
 * Field-work status strip (Tier 5.3-B). Hidden when online with an empty queue;
 * appears when offline or when actions are waiting to sync. Lets the technician
 * force a sync when signal returns.
 */
export function OfflineStatusBar() {
  const [pending, setPending] = useState(0)
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    initOfflineSync(setPending)
    const unsub = subscribe(setPending)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); unsub() }
  }, [])

  if (online && pending === 0) return null

  const syncNow = async () => {
    setSyncing(true)
    try { await flush(BASE_URL, authToken.get()) } finally { setSyncing(false) }
  }

  return (
    <div className={cn(
      'flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium',
      online ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground',
    )}>
      {online ? <CloudOff className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {!online && <span>Mode offline —</span>}
      {pending > 0
        ? <span>{pending} aksi menunggu sinkron</span>
        : <span>Tidak ada aksi tertunda</span>}
      {online && pending > 0 && (
        <button
          onClick={syncNow}
          disabled={syncing}
          className="flex items-center gap-1 px-2 py-0.5 rounded border border-current/30 hover:bg-current/10 disabled:opacity-50"
        >
          <RefreshCw className={cn('size-3', syncing && 'animate-spin')} /> Sinkron sekarang
        </button>
      )}
    </div>
  )
}
