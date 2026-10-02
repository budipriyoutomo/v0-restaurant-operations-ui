'use client'

// Guest Service (Todo-Pilot §8): guest complaints with channel, first response,
// recovery and KPIs. Each complaint is a Guest Service Issue — its status and
// tasks are handled in the Issues tab like any other issue.
import { useEffect, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { newKey } from '@/lib/offline-queue'
import { CHANNEL_LABELS, formatDuration, formatIDR, responseState } from '@/lib/guest-service'
import { guestApi, type NewGuestCase } from '@/lib/guest-service-api'
import { useMyOutlets, usePermissions } from '@/lib/permissions'
import type { GuestCase, GuestChannel, Priority } from '@/lib/types'
import { GuestCaseDrawer } from '@/components/guest/guest-case-drawer'
import { GuestKpiPanel } from '@/components/guest/guest-kpi-panel'
import { IssuesListPage } from '@/components/pages/issues-list-page'

type Tab = 'complaints' | 'kpis' | 'issues'

// Matches backend settings.GUEST_FIRST_RESPONSE_TARGET_MINUTES; the KPI
// endpoint reports the live value, which the list uses once loaded.
const DEFAULT_TARGET = 60

export function GuestPage() {
  const { can } = usePermissions()
  const myOutlets = useMyOutlets()
  const [tab, setTab] = useState<Tab>('complaints')
  const [cases, setCases] = useState<GuestCase[] | null>(null)
  const [target, setTarget] = useState(DEFAULT_TARGET)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [openOnly, setOpenOnly] = useState(true)
  const [channel, setChannel] = useState<GuestChannel | ''>('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const reload = () => setRefreshKey((k) => k + 1)

  useEffect(() => {
    guestApi.list().then(setCases).catch((e) => { toast.error(apiErrorMessage(e)); setCases([]) })
    guestApi.kpis(3).then((k) => setTarget(k.targetMinutes)).catch(() => {})
    setNow(Date.now())
  }, [refreshKey])

  // Keep the "waiting 42m" counters moving.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const visible = (cases ?? []).filter((c) =>
    (!openOnly || !['resolved', 'closed', 'cancelled'].includes(c.status)) && (!channel || c.channel === channel))
  const overdue = (cases ?? []).filter((c) => responseState(c, now, target).state === 'overdue').length

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Guest Service</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Guest complaints from every channel — respond within {formatDuration(target)}, record any recovery given.
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
          <Plus className="size-4" /> New complaint
        </button>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {([['complaints', 'Complaints'], ['kpis', 'KPIs'], ['issues', 'Issues']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap',
              tab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {label}{id === 'complaints' && overdue > 0 && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">{overdue} overdue</span>}
          </button>
        ))}
      </div>

      {tab === 'complaints' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Open only
            </label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as GuestChannel | '')}
              className="h-8 text-xs rounded-md border border-border bg-background px-2">
              <option value="">All channels</option>
              {(Object.keys(CHANNEL_LABELS) as GuestChannel[]).map((ch) => <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>)}
            </select>
          </div>
          {cases === null ? <p className="text-sm text-muted-foreground">Loading…</p>
            : visible.length === 0 ? <div className="py-14 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">No complaints here.</div>
            : visible.map((c) => <CaseRow key={c.id} c={c} now={now} target={target} onOpen={() => setOpenId(c.id)} />)}
        </div>
      )}

      {tab === 'kpis' && <GuestKpiPanel refreshKey={refreshKey} />}
      {tab === 'issues' && <IssuesListPage view="guest-service" />}

      {showNew && (
        <NewComplaintDialog outlets={myOutlets.map((o) => o.name)} onClose={() => setShowNew(false)}
          onCreated={(id) => { setShowNew(false); reload(); setOpenId(id) }} />
      )}
      {openId && (
        <GuestCaseDrawer caseId={openId} canManage={can.manageGuest} targetMinutes={target}
          onClose={() => setOpenId(null)} onChanged={reload} />
      )}
    </div>
  )
}

function CaseRow({ c, now, target, onOpen }: { c: GuestCase; now: number; target: number; onOpen: () => void }) {
  const rs = responseState(c, now, target)
  return (
    <button onClick={onOpen}
      className="w-full text-left p-3 sm:p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-muted-foreground">{c.issueNumber}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-semibold">{CHANNEL_LABELS[c.channel]}</span>
          <span className="text-sm font-semibold truncate">{c.title}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {c.guestName || 'Unknown guest'} · {c.outlet} · {c.status}
          {c.compensationType !== 'none' && <span className="inline-flex items-center gap-0.5 ml-1.5"><Wallet className="size-3" />{formatIDR(c.compensationValue)}</span>}
        </p>
      </div>
      <div className="text-right flex-shrink-0 text-xs">
        {rs.state === 'responded' && <span className="text-emerald-700 font-semibold">Responded in {formatDuration(c.firstResponseMinutes)}</span>}
        {rs.state === 'waiting' && <span className="text-amber-600 font-semibold">Waiting {formatDuration(rs.minutes)}</span>}
        {rs.state === 'overdue' && <span className="text-red-600 font-semibold">Overdue {formatDuration(rs.minutes)}</span>}
      </div>
    </button>
  )
}

function NewComplaintDialog({ outlets, onClose, onCreated }: {
  outlets: string[]; onClose: () => void; onCreated: (id: string) => void
}) {
  const [form, setForm] = useState<NewGuestCase>({
    title: '', description: '', outlet: outlets[0] ?? '', priority: 'medium',
    guestName: '', guestContact: '', channel: 'walk-in',
  })
  // Local datetime for "when did the guest complain" (a review may be from yesterday).
  const [reportedLocal, setReportedLocal] = useState('')
  const [busy, setBusy] = useState(false)
  const [key] = useState(newKey)                 // one per dialog — no double complaints

  const set = <K extends keyof NewGuestCase>(k: K, v: NewGuestCase[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    try {
      const body = { ...form, reportedAt: reportedLocal ? new Date(reportedLocal).toISOString() : undefined }
      const created = await guestApi.create(body, key)
      toast.success(`Complaint ${created.issueNumber} logged.`)
      onCreated(created.id)
    } catch (e) {
      toast.error(apiErrorMessage(e))
      setBusy(false)
    }
  }

  const input = 'w-full h-9 px-3 rounded-md border border-border bg-background text-sm'
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-3">
        <h2 className="font-semibold">New guest complaint</h2>
        <input className={input} placeholder="What happened? e.g. Steak served cold" value={form.title} onChange={(e) => set('title', e.target.value)} />
        <textarea className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" rows={3} placeholder="Details"
          value={form.description} onChange={(e) => set('description', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select className={input} value={form.channel} onChange={(e) => set('channel', e.target.value as GuestChannel)}>
            {(Object.keys(CHANNEL_LABELS) as GuestChannel[]).map((ch) => <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>)}
          </select>
          <select className={input} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
            {(['low', 'medium', 'high', 'critical'] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <select className={input} value={form.outlet} onChange={(e) => set('outlet', e.target.value)}>
          {outlets.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Guest name" value={form.guestName} onChange={(e) => set('guestName', e.target.value)} />
          <input className={input} placeholder="Phone / @handle" value={form.guestContact} onChange={(e) => set('guestContact', e.target.value)} />
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Reported at (leave empty for now)</span>
          <input type="datetime-local" className={input} value={reportedLocal} onChange={(e) => setReportedLocal(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 h-9 rounded-md border border-border text-sm">Cancel</button>
          <button onClick={submit} disabled={!form.title.trim() || !form.outlet || busy}
            className="px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {busy ? 'Saving…' : 'Log complaint'}
          </button>
        </div>
      </div>
    </div>
  )
}
