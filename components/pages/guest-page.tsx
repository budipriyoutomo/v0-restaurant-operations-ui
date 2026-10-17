'use client'

// Guest Service (Todo-Pilot §8): guest complaints with channel, first response,
// recovery and KPIs. Each complaint is a Guest Service Issue — its status and
// tasks are handled in the Issues tab like any other issue.
import { useEffect, useState, useRef } from 'react'
import { MessageSquareWarning, Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { newKey } from '@/lib/offline-queue'
import { GUEST_CHANNELS, formatDuration, formatIDR, responseState } from '@/lib/guest-service'
import { guestApi, type NewGuestCase } from '@/lib/guest-service-api'
import { useMyOutlets, useOutletFilter, usePermissions } from '@/lib/permissions'
import type { GuestCase, GuestChannel, Priority } from '@/lib/types'
import { GuestCaseDrawer } from '@/components/guest/guest-case-drawer'
import { GuestKpiPanel } from '@/components/guest/guest-kpi-panel'
import { useT } from '@/lib/i18n'
import { IssuesListPage } from '@/components/pages/issues-list-page'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'
import { SegmentedTabs } from '@/components/shared/segmented-tabs'
import { ListSkeleton } from '@/components/shared/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { FilterToggle, PageHeader } from '@/components/shared/page-header'

type Tab = 'complaints' | 'kpis' | 'issues'

// Matches backend settings.GUEST_FIRST_RESPONSE_TARGET_MINUTES; the KPI
// endpoint reports the live value, which the list uses once loaded.
const DEFAULT_TARGET = 60

export function GuestPage() {
  const { t, label, locale } = useT()
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
  const { outlet } = useOutletFilter()            // top bar outlet filter

  useEffect(() => {
    guestApi.list(outlet).then(setCases).catch((e) => { toast.error(apiErrorMessage(e)); setCases([]) })
    guestApi.kpis(3).then((k) => setTarget(k.targetMinutes)).catch(() => {})
    setNow(Date.now())
  }, [refreshKey, outlet])

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
      <PageHeader
        title={t('guest.title')}
        description={t('guest.subtitle', { target: formatDuration(target, locale) })}
        actions={<>
          <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="size-4" /> {t('guest.newComplaint')}
        </button>
      </>}
      />

      <SegmentedTabs<Tab> label={t('nav.guest-service')} value={tab} onChange={setTab} tabs={[
        { id: 'complaints', label: <>{t('guest.tab.complaints')}{overdue > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">{t('guest.overdueBadge', { count: overdue })}</span>}</> },
        { id: 'kpis', label: t('guest.tab.kpis') },
        { id: 'issues', label: t('guest.tab.issues') },
      ]} />

      {tab === 'complaints' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap rounded-2xl border border-border bg-card p-3">
            <FilterToggle checked={openOnly} onChange={setOpenOnly}>{t('guest.openOnly')}</FilterToggle>
            <select value={channel} onChange={(e) => setChannel(e.target.value as GuestChannel | '')}
              className="h-9 text-sm rounded-lg border border-border bg-background px-2.5" aria-label={t('guest.channel')}>
              <option value="">{t('guest.allChannels')}</option>
              {GUEST_CHANNELS.map((ch) => <option key={ch} value={ch}>{label('guestChannel', ch)}</option>)}
            </select>
          </div>
          {cases === null ? <ListSkeleton rows={3} className="p-0 sm:p-0" />
            : visible.length === 0 ? <EmptyState icon={MessageSquareWarning} title={t('guest.none')} />
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
  const { t, label, status, locale } = useT()
  const rs = responseState(c, now, target)
  return (
    <button onClick={onOpen}
      className="w-full text-left p-3 sm:p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground">{c.issueNumber}</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-muted font-semibold">{label('guestChannel', c.channel)}</span>
          <span className="text-sm font-semibold truncate">{c.title}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {c.guestName || t('guest.unknownGuest')} · {c.outlet} · {status(c.status)}
          {c.compensationType !== 'none' && <span className="inline-flex items-center gap-0.5 ml-1.5"><Wallet className="size-3" />{formatIDR(c.compensationValue)}</span>}
        </p>
      </div>
      <div className="text-right flex-shrink-0 text-xs">
        {rs.state === 'responded' && <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{t('guest.respondedIn', { time: formatDuration(c.firstResponseMinutes, locale) })}</span>}
        {rs.state === 'waiting' && <span className="text-amber-700 dark:text-amber-400 font-semibold">{t('guest.waiting', { time: formatDuration(rs.minutes, locale) })}</span>}
        {rs.state === 'overdue' && <span className="text-red-600 font-semibold">{t('guest.overdue', { time: formatDuration(rs.minutes, locale) })}</span>}
      </div>
    </button>
  )
}

function NewComplaintDialog({ outlets, onClose, onCreated }: {
  outlets: string[]; onClose: () => void; onCreated: (id: string) => void
}) {
  const { t, label } = useT()
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
      toast.success(t('guest.logged', { number: created.issueNumber }))
      onCreated(created.id)
    } catch (e) {
      toast.error(apiErrorMessage(e))
      setBusy(false)
    }
  }

  const input = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm'
  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-3">
        <h2 className="font-semibold">{t('guest.newTitle')}</h2>
        <input className={input} placeholder={t('guest.whatHappened')} aria-label={t('common.title')} value={form.title} onChange={(e) => set('title', e.target.value)} />
        <textarea className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" rows={3} placeholder={t('guest.details')} aria-label={t('guest.details')}
          value={form.description} onChange={(e) => set('description', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select className={input} aria-label={t('guest.channel')} value={form.channel} onChange={(e) => set('channel', e.target.value as GuestChannel)}>
            {GUEST_CHANNELS.map((ch) => <option key={ch} value={ch}>{label('guestChannel', ch)}</option>)}
          </select>
          <select className={input} aria-label={t('common.priority')} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
            {(['low', 'medium', 'high', 'critical'] as Priority[]).map((p) => <option key={p} value={p}>{label('priority', p)}</option>)}
          </select>
        </div>
        <select className={input} aria-label={t('common.outlet')} value={form.outlet} onChange={(e) => set('outlet', e.target.value)}>
          {outlets.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder={t('guest.guestName')} aria-label={t('guest.guestName')} value={form.guestName} onChange={(e) => set('guestName', e.target.value)} />
          <input className={input} placeholder={t('guest.contact')} aria-label={t('guest.contact')} value={form.guestContact} onChange={(e) => set('guestContact', e.target.value)} />
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{t('guest.reportedAt')}</span>
          <input type="datetime-local" className={input} value={reportedLocal} onChange={(e) => setReportedLocal(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 h-9 rounded-lg border border-border text-sm">{t('common.cancel')}</button>
          <button onClick={submit} disabled={!form.title.trim() || !form.outlet || busy}
            className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {busy ? t('common.saving') : t('guest.log')}
          </button>
        </div>
      </div>
    </div>
  )
}
