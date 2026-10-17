'use client'

// One guest complaint: guest details, first response, recovery (Todo-Pilot §8).
// The Issue's status is changed from the Issues tab — this drawer covers the
// guest side.
import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, MessageSquare, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import {
  COMPENSATION_TYPES, GUEST_CHANNELS, formatDuration, formatIDR, recoveryError, responseState,
} from '@/lib/guest-service'
import { guestApi } from '@/lib/guest-service-api'
import { useT } from '@/lib/i18n'
import type { CompensationType, GuestCase, GuestChannel } from '@/lib/types'
import { SideDrawer } from '@/components/shared/side-drawer'
import { ListSkeleton } from '@/components/shared/skeleton'

export function GuestCaseDrawer({ caseId, canManage, targetMinutes, onClose, onChanged }: {
  caseId: string
  canManage: boolean
  targetMinutes: number
  onClose: () => void
  onChanged: () => void
}) {
  const { t, label, status, dateTime, locale } = useT()
  const [c, setC] = useState<GuestCase | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [guest, setGuest] = useState({ guestName: '', guestContact: '', channel: 'other' as GuestChannel })
  const [rec, setRec] = useState({ type: 'none' as CompensationType, value: '0', note: '' })

  useEffect(() => {
    guestApi.get(caseId).then((x) => {
      setC(x)
      setGuest({ guestName: x.guestName, guestContact: x.guestContact, channel: x.channel })
      setRec({ type: x.compensationType, value: String(x.compensationValue), note: x.compensationNote })
    }).catch((e) => toast.error(apiErrorMessage(e)))
  }, [caseId])

  const run = async (fn: () => Promise<GuestCase>, ok: string) => {
    setBusy(true)
    try {
      setC(await fn())
      toast.success(ok)
      onChanged()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!c) return <SideDrawer label={t('term.guestCase')} title="…" closeLabel={t('common.close')} onClose={onClose}><ListSkeleton rows={3} className="p-0 sm:p-0" /></SideDrawer>

  const rs = responseState(c, Date.now(), targetMinutes)
  const recValue = Math.round(Number(rec.value) || 0)
  const recErr = recoveryError(rec.type, recValue, locale)
  const guestDirty = guest.guestName !== c.guestName || guest.guestContact !== c.guestContact || guest.channel !== c.channel

  return (
    <SideDrawer
      label={`${t('term.guestCase')} ${c.issueNumber}`}
      number={c.issueNumber}
      title={c.title}
      subtitle={<>{c.outlet} · {label('guestChannel', c.channel)} · {t('guestCase.reported', { time: dateTime(c.reportedAt) })} · {t('guestCase.issueStatus')} <b>{status(c.status)}</b></>}
      closeLabel={t('common.close')}
      onClose={onClose}
      className="sm:w-[480px]"
    >
      <div className="space-y-6">

        {/* Timeline / KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Clock} label={t('guestCase.firstResponse')}
            value={rs.state === 'responded' ? formatDuration(c.firstResponseMinutes, locale) : rs.state === 'none' ? '—' : t('guestCase.waiting', { time: formatDuration(rs.minutes, locale) })}
            tone={rs.state === 'overdue' ? 'bad' : rs.state === 'waiting' ? 'warn' : undefined} />
          <Stat icon={CheckCircle2} label={t('guestCase.resolution')} value={formatDuration(c.resolutionMinutes, locale)} />
        </div>

        {/* First response */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="size-3.5" /> {t('guestCase.firstResponse')}
          </h3>
          {c.firstResponseAt ? (
            <p className="text-sm">
              {dateTime(c.firstResponseAt)}{c.firstResponseBy && <> {t('guestCase.by')} <b>{c.firstResponseBy}</b></>}
              {c.firstResponseNote && <span className="block text-muted-foreground">{c.firstResponseNote}</span>}
            </p>
          ) : c.status !== 'cancelled' ? (
            <div className="space-y-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder={t('guestCase.howResponded')}
                aria-label={t('guestCase.firstResponse')}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              <button disabled={busy} onClick={() => run(() => guestApi.respond(c.id, note.trim()), t('guestCase.responseRecorded'))}
                className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                {t('guestCase.markResponded')}
              </button>
            </div>
          ) : <p className="text-sm text-muted-foreground">{t('guestCase.cancelledNoResponse')}</p>}
        </section>

        {/* Recovery */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Wallet className="size-3.5" /> {t('guestCase.recovery')}
          </h3>
          {canManage ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={rec.type} onChange={(e) => {
                  const type = e.target.value as CompensationType
                  setRec((r) => ({ ...r, type, value: type === 'none' ? '0' : r.value }))
                }} aria-label={t('guestCase.recovery')} className="h-9 px-2 rounded-lg border border-border bg-background text-sm">
                  {COMPENSATION_TYPES.map((ct) => <option key={ct} value={ct}>{label('compensation', ct)}</option>)}
                </select>
                <input type="number" min={0} value={rec.value} disabled={rec.type === 'none'}
                  onChange={(e) => setRec((r) => ({ ...r, value: e.target.value }))} placeholder={t('guestCase.value')} aria-label={t('guestCase.value')}
                  className="h-9 px-2 rounded-lg border border-border bg-background text-sm disabled:opacity-50" />
              </div>
              <input value={rec.note} onChange={(e) => setRec((r) => ({ ...r, note: e.target.value }))} placeholder={t('guestCase.notePlaceholder')} aria-label={t('common.notes')}
                className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm" />
              {recErr && <p className="text-xs text-destructive">{recErr}</p>}
              <button disabled={busy || !!recErr}
                onClick={() => run(() => guestApi.recovery(c.id, { compensationType: rec.type, compensationValue: recValue, note: rec.note }), t('guestCase.recoverySaved'))}
                className="px-4 h-9 rounded-lg border border-border text-sm font-semibold hover:bg-muted/50 disabled:opacity-50">
                {t('guestCase.saveRecovery')}
              </button>
            </div>
          ) : (
            <p className="text-sm">
              {c.compensationType === 'none' ? t('guestCase.noneRecorded') : `${label('compensation', c.compensationType)} · ${formatIDR(c.compensationValue)}`}
              {c.compensationNote && <span className="block text-muted-foreground">{c.compensationNote}</span>}
            </p>
          )}
        </section>

        {/* Guest details */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('guestCase.guest')}</h3>
          <input value={guest.guestName} onChange={(e) => setGuest((g) => ({ ...g, guestName: e.target.value }))} placeholder={t('guest.guestName')} aria-label={t('guest.guestName')}
            className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm" />
          <input value={guest.guestContact} onChange={(e) => setGuest((g) => ({ ...g, guestContact: e.target.value }))} placeholder={t('guestCase.contact')} aria-label={t('guestCase.contact')}
            className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm" />
          <select value={guest.channel} onChange={(e) => setGuest((g) => ({ ...g, channel: e.target.value as GuestChannel }))}
            aria-label={t('guest.channel')}
            className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm">
            {GUEST_CHANNELS.map((ch) => <option key={ch} value={ch}>{label('guestChannel', ch)}</option>)}
          </select>
          {guestDirty && (
            <button disabled={busy} onClick={() => run(() => guestApi.update(c.id, guest), t('guestCase.guestSaved'))}
              className="px-4 h-9 rounded-lg border border-border text-sm font-semibold hover:bg-muted/50 disabled:opacity-50">
              {t('guestCase.saveGuest')}
            </button>
          )}
        </section>
      </div>
    </SideDrawer>
  )
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone?: 'warn' | 'bad' }) {
  return (
    <div className="p-3 rounded-2xl border border-border bg-card">
      <p className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="size-3" /> {label}</p>
      <p className={cn('text-lg font-bold', tone === 'warn' && 'text-amber-700 dark:text-amber-400', tone === 'bad' && 'text-red-600')}>{value}</p>
    </div>
  )
}
