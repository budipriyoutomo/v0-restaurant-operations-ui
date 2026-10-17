'use client'

// IoT thermometers on a monitored asset (Todo-Ops-Checklist Fase 4). A manager
// adds a sensor and gets its key once; the device posts readings to
// POST /api/temperature-sensors/readings with the X-Sensor-Key header.
// Revoking stops the key at once; past readings stay in the log.
import { useEffect, useState } from 'react'
import { Copy, Radio, Trash2, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { opsApi } from '@/lib/ops-checklist-api'
import type { Asset, TemperatureSensor } from '@/lib/types'
import { useT } from '@/lib/i18n'

const field = 'px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'
// A sensor silent for longer than this is shown as offline.
export const SENSOR_OFFLINE_MS = 30 * 60_000

export function isSensorOffline(s: Pick<TemperatureSensor, 'isActive' | 'lastSeenAt'>, now: number = Date.now()): boolean {
  if (!s.isActive) return false
  return !s.lastSeenAt || now - Date.parse(s.lastSeenAt) > SENSOR_OFFLINE_MS
}

export function SensorPanel({ asset }: { asset: Asset }) {
  const { t, relative } = useT()
  const [sensors, setSensors] = useState<TemperatureSensor[] | null>(null)
  const [name, setName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    let live = true
    opsApi.sensors(asset.id).then((rows) => live && setSensors(rows)).catch(() => live && setSensors([]))
    return () => { live = false }
  }, [asset.id, key])

  const add = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const created = await opsApi.createSensor(asset.id, name.trim())
      setNewKey(created.key)
      setName('')
      setKey((k) => k + 1)
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (s: TemperatureSensor) => {
    if (!window.confirm(t('tempSensor.revokeConfirm', { name: s.name }))) return
    try {
      await opsApi.revokeSensor(asset.id, s.id)
      setKey((k) => k + 1)
    } catch (e) {
      toast.error(apiErrorMessage(e))
    }
  }

  const copy = async () => {
    if (!newKey) return
    try {
      await navigator.clipboard.writeText(newKey)
      toast.success(t('tempSensor.copied'))
    } catch {
      /* the key stays visible to copy by hand */
    }
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1.5"><Radio className="size-3.5" aria-hidden /> {t('tempSensor.title')}</p>
      {sensors === null ? <div className="h-8 rounded bg-muted animate-pulse" />
        : sensors.length === 0 ? <p className="text-xs text-muted-foreground">{t('tempSensor.none')}</p>
        : (
          <ul className="divide-y divide-border text-xs">
            {sensors.map((s) => {
              const offline = isSensorOffline(s)
              return (
                <li key={s.id} className={cn('py-1.5 flex items-center gap-2', !s.isActive && 'opacity-60')}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.name} <span className="font-mono text-xs text-muted-foreground">{s.keyPrefix}…</span></p>
                    <p className="text-muted-foreground">
                      {!s.isActive ? t('tempSensor.revoked')
                        : s.lastSeenAt ? t('tempSensor.lastSeen', { when: relative(s.lastSeenAt), value: s.lastValue ?? '—' })
                          : t('tempSensor.neverSeen')}
                      {offline && (
                        <span className="ml-2 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                          <WifiOff className="size-3" aria-hidden /> {t('tempSensor.offline')}
                        </span>
                      )}
                    </p>
                  </div>
                  {s.isActive && (
                    <button type="button" onClick={() => revoke(s)} aria-label={t('tempSensor.revoke', { name: s.name })}
                      className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 rounded-lg hover:bg-destructive/20"><Trash2 className="size-4 text-muted-foreground" /></button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

      {newKey && (
        <div role="status" className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 space-y-1.5">
          <p className="text-xs font-semibold">{t('tempSensor.keyOnce')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 break-all text-xs font-mono" data-testid="sensor-key">{newKey}</code>
            <button type="button" onClick={copy} aria-label={t('tempSensor.copy')}
              className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 rounded-lg border border-border hover:bg-muted"><Copy className="size-3.5" /></button>
          </div>
          <p className="text-xs text-muted-foreground">{t('tempSensor.howTo')}</p>
          <button type="button" onClick={() => setNewKey(null)} className="text-xs font-semibold text-primary">{t('tempSensor.done')}</button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
          aria-label={t('tempSensor.name')} placeholder={t('tempSensor.namePlaceholder')} className={cn(field, 'flex-1 h-9')} />
        <button type="button" onClick={add} disabled={!name.trim() || saving}
          className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
          {saving ? t('common.saving') : t('tempSensor.add')}
        </button>
      </div>
    </div>
  )
}
