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
  CHANNEL_LABELS, COMPENSATION_LABELS, formatDuration, formatIDR, recoveryError, responseState,
} from '@/lib/guest-service'
import { guestApi } from '@/lib/guest-service-api'
import type { CompensationType, GuestCase, GuestChannel } from '@/lib/types'

export function GuestCaseDrawer({ caseId, canManage, targetMinutes, onClose, onChanged }: {
  caseId: string
  canManage: boolean
  targetMinutes: number
  onClose: () => void
  onChanged: () => void
}) {
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

  if (!c) return <Shell onClose={onClose}><p className="p-6 text-sm text-muted-foreground">Loading…</p></Shell>

  const rs = responseState(c, Date.now(), targetMinutes)
  const recValue = Math.round(Number(rec.value) || 0)
  const recErr = recoveryError(rec.type, recValue)
  const guestDirty = guest.guestName !== c.guestName || guest.guestContact !== c.guestContact || guest.channel !== c.channel

  return (
    <Shell onClose={onClose}>
      <div className="p-5 sm:p-6 space-y-6">
        <div className="pr-8">
          <p className="font-mono text-xs text-primary font-bold">{c.issueNumber}</p>
          <h2 className="font-bold text-lg leading-snug">{c.title}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {c.outlet} · {CHANNEL_LABELS[c.channel]} · reported {new Date(c.reportedAt).toLocaleString('id-ID')} · issue <b>{c.status}</b>
          </p>
        </div>

        {/* Timeline / KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Clock} label="First response"
            value={rs.state === 'responded' ? formatDuration(c.firstResponseMinutes) : rs.state === 'none' ? '—' : `waiting ${formatDuration(rs.minutes)}`}
            tone={rs.state === 'overdue' ? 'bad' : rs.state === 'waiting' ? 'warn' : undefined} />
          <Stat icon={CheckCircle2} label="Resolution" value={formatDuration(c.resolutionMinutes)} />
        </div>

        {/* First response */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="size-3.5" /> First response
          </h3>
          {c.firstResponseAt ? (
            <p className="text-sm">
              {new Date(c.firstResponseAt).toLocaleString('id-ID')}{c.firstResponseBy && <> by <b>{c.firstResponseBy}</b></>}
              {c.firstResponseNote && <span className="block text-muted-foreground">{c.firstResponseNote}</span>}
            </p>
          ) : c.status !== 'cancelled' ? (
            <div className="space-y-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder="How did you respond? e.g. called the guest, replied to the review"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              <button disabled={busy} onClick={() => run(() => guestApi.respond(c.id, note.trim()), 'First response recorded.')}
                className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                Mark as responded
              </button>
            </div>
          ) : <p className="text-sm text-muted-foreground">Cancelled — no response needed.</p>}
        </section>

        {/* Recovery */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Wallet className="size-3.5" /> Recovery
          </h3>
          {canManage ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={rec.type} onChange={(e) => {
                  const type = e.target.value as CompensationType
                  setRec((r) => ({ ...r, type, value: type === 'none' ? '0' : r.value }))
                }} className="h-9 px-2 rounded-md border border-border bg-background text-sm">
                  {(Object.keys(COMPENSATION_LABELS) as CompensationType[]).map((t) => <option key={t} value={t}>{COMPENSATION_LABELS[t]}</option>)}
                </select>
                <input type="number" min={0} value={rec.value} disabled={rec.type === 'none'}
                  onChange={(e) => setRec((r) => ({ ...r, value: e.target.value }))} placeholder="Value (IDR)"
                  className="h-9 px-2 rounded-md border border-border bg-background text-sm disabled:opacity-50" />
              </div>
              <input value={rec.note} onChange={(e) => setRec((r) => ({ ...r, note: e.target.value }))} placeholder="Note, e.g. dessert on the house"
                className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm" />
              {recErr && <p className="text-xs text-destructive">{recErr}</p>}
              <button disabled={busy || !!recErr}
                onClick={() => run(() => guestApi.recovery(c.id, { compensationType: rec.type, compensationValue: recValue, note: rec.note }), 'Recovery saved.')}
                className="px-4 h-9 rounded-md border border-border text-sm font-semibold hover:bg-muted/50 disabled:opacity-50">
                Save recovery
              </button>
            </div>
          ) : (
            <p className="text-sm">
              {c.compensationType === 'none' ? 'None recorded' : `${COMPENSATION_LABELS[c.compensationType]} · ${formatIDR(c.compensationValue)}`}
              {c.compensationNote && <span className="block text-muted-foreground">{c.compensationNote}</span>}
            </p>
          )}
        </section>

        {/* Guest details */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guest</h3>
          <input value={guest.guestName} onChange={(e) => setGuest((g) => ({ ...g, guestName: e.target.value }))} placeholder="Guest name"
            className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm" />
          <input value={guest.guestContact} onChange={(e) => setGuest((g) => ({ ...g, guestContact: e.target.value }))} placeholder="Phone / handle / email"
            className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm" />
          <select value={guest.channel} onChange={(e) => setGuest((g) => ({ ...g, channel: e.target.value as GuestChannel }))}
            className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm">
            {(Object.keys(CHANNEL_LABELS) as GuestChannel[]).map((ch) => <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>)}
          </select>
          {guestDirty && (
            <button disabled={busy} onClick={() => run(() => guestApi.update(c.id, guest), 'Guest details saved.')}
              className="px-4 h-9 rounded-md border border-border text-sm font-semibold hover:bg-muted/50 disabled:opacity-50">
              Save guest details
            </button>
          )}
        </section>
      </div>
    </Shell>
  )
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone?: 'warn' | 'bad' }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-muted/20">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Icon className="size-3" /> {label}</p>
      <p className={cn('text-lg font-bold', tone === 'warn' && 'text-amber-600', tone === 'bad' && 'text-red-600')}>{value}</p>
    </div>
  )
}

function Shell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-background border-l border-border shadow-lg z-50 overflow-y-auto">
        <button onClick={onClose} className="absolute right-3 top-3 p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="size-5" />
        </button>
        {children}
      </div>
    </>
  )
}
