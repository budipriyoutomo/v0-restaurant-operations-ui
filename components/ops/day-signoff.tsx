'use client'

// Manager's daily sign-off and the inspection PDF (Todo-Ops-Checklist Fase 4),
// in Daily Ops → Riwayat once one outlet is chosen.
//   DaySignoffList  one row per business day of the period: who signed and when
//   SignDayDialog   the day's summary and runs; sign once every checklist is
//                   closed; warns when the data changed after signing
//   ExportPdfButton the period as PDF for a Dinkes / halal / internal audit
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileDown, Loader2, PenLine, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { opsApi } from '@/lib/ops-checklist-api'
import { daysDesc, exportRangeProblem, signoffState } from '@/lib/ops-signoff'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'
import type { OpsDay, OpsSignoff } from '@/lib/types'
import { useT } from '@/lib/i18n'

export function DaySignoffList({ outlet, from, to, refreshKey = 0 }: {
  outlet: string; from: string; to: string; refreshKey?: number
}) {
  const { t, date, dateTime } = useT()
  const [signed, setSigned] = useState<Record<string, OpsSignoff> | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  useEffect(() => {
    let live = true
    setSigned(null)
    opsApi.signoffs({ outlet, from, to })
      .then((rows) => live && setSigned(Object.fromEntries(rows.map((r) => [r.businessDate, r]))))
      .catch(() => live && setSigned({}))
    return () => { live = false }
  }, [outlet, from, to, refreshKey, key])

  const days = daysDesc(from, to)
  return (
    <section aria-labelledby="ops-signoff-title" className="space-y-2">
      <h2 id="ops-signoff-title" className="text-sm font-semibold">{t('opsSignoff.title', { outlet })}</h2>
      {signed === null ? <div className="h-16 rounded-lg bg-muted animate-pulse" /> : (
        <ul className="rounded-lg border border-border divide-y divide-border bg-card">
          {days.map((d) => {
            const s = signed[d]
            return (
              <li key={d}>
                <button type="button" onClick={() => setOpen(d)}
                  aria-label={t('opsSignoff.openDay', { date: date(d) })}
                  className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-muted/30 text-sm">
                  <span className="w-28 shrink-0 tabular-nums">{date(d)}</span>
                  {s ? (
                    <span className="flex-1 min-w-0 text-xs text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                      {t('opsSignoff.signedBy', { name: s.signedByName, when: dateTime(s.signedAt) })}
                    </span>
                  ) : (
                    <span className="flex-1 text-xs text-muted-foreground">{t('opsSignoff.notSigned')}</span>
                  )}
                  <PenLine className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {open && (
        <SignDayDialog date={open} outlet={outlet} onClose={() => setOpen(null)} onSigned={() => setKey((k) => k + 1)} />
      )}
    </section>
  )
}

export function SignDayDialog({ date: day, outlet, onClose, onSigned }: {
  date: string; outlet: string; onClose: () => void; onSigned: () => void
}) {
  const { t, date, dateTime, label } = useT()
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)
  const [data, setData] = useState<OpsDay | null>(null)
  const [failed, setFailed] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let live = true
    opsApi.day(day, outlet).then((d) => live && setData(d)).catch(() => live && setFailed(true))
    return () => { live = false }
  }, [day, outlet])

  const sign = async () => {
    if (!data?.canSign || saving) return
    setSaving(true)
    try {
      const s = await opsApi.signDay(day, outlet, note.trim())
      setData({ ...data, signoff: s, canSign: false, isIntact: true })
      toast.success(t('opsSignoff.signed'))
      onSigned()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const state = signoffState(data)
  const sum = data?.summary
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="ops-signday-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-background border border-border p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="ops-signday-title" className="font-semibold">{t('opsSignoff.dialogTitle', { date: date(day) })}</h2>
            <p className="text-xs text-muted-foreground">{outlet}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 rounded-lg hover:bg-muted"><X className="size-4" /></button>
        </div>

        {failed ? <p className="text-sm text-destructive">{t('opsSignoff.failed')}</p>
          : !data || !sum ? <div className="h-32 rounded-lg bg-muted animate-pulse" />
          : (
            <>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {([
                  ['runs', sum.runs], ['submitted', sum.submitted], ['missed', sum.missed],
                  ['late', sum.late], ['failedItems', sum.failedItems], ['excursions', sum.excursions],
                ] as const).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border p-2">
                    <dt className="text-xs text-muted-foreground">{t(`opsSignoff.sum.${k}`)}</dt>
                    <dd className={cn('text-lg font-bold tabular-nums',
                      (k === 'missed' || k === 'failedItems' || k === 'excursions') && v > 0 && 'text-red-700 dark:text-red-400')}>{v}</dd>
                  </div>
                ))}
              </dl>

              {data.runs.length > 0 && (
                <ul className="text-xs divide-y divide-border rounded-lg border border-border">
                  {data.runs.map((r) => (
                    <li key={r.id} className="px-3 py-1.5 flex items-center justify-between gap-2">
                      <span className="truncate">{r.templateName} <span className="font-mono text-xs text-muted-foreground">{r.number}</span></span>
                      <span className="whitespace-nowrap">{label('opsRunStatus', r.status)}{r.isLate ? ` · ${t('ops.lateBadge')}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}

              {data.signoff ? (
                <div className={cn('rounded-lg border p-3 text-sm space-y-1',
                  state === 'changed' ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30')}>
                  <p className="font-semibold inline-flex items-center gap-1.5">
                    {state === 'changed' ? <AlertTriangle className="size-4 text-red-700 dark:text-red-400" aria-hidden /> : <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden />}
                    {t('opsSignoff.signedBy', { name: data.signoff.signedByName, when: dateTime(data.signoff.signedAt) })}
                  </p>
                  {data.signoff.note && <p className="text-xs">“{data.signoff.note}”</p>}
                  {state === 'changed' && <p className="text-xs text-red-700 dark:text-red-400">{t('opsSignoff.changed')}</p>}
                  <p className="text-xs font-mono text-muted-foreground">{t('opsSignoff.code', { code: data.signoff.digest.slice(0, 12) })}</p>
                </div>
              ) : data.canSign ? (
                <div className="space-y-2">
                  <label htmlFor="ops-signoff-note" className="block text-xs font-semibold">{t('opsSignoff.note')}</label>
                  <textarea id="ops-signoff-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000}
                    placeholder={t('opsSignoff.notePlaceholder')}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm" />
                  <p className="text-xs text-muted-foreground">{t('opsSignoff.statement')}</p>
                  <button type="button" onClick={sign} disabled={saving}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                    {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <PenLine className="size-4" aria-hidden />} {t('opsSignoff.sign')}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{data.problem ?? t('opsSignoff.noPermission')}</p>
              )}
            </>
          )}
      </div>
    </div>
  )
}

export function ExportPdfButton({ outlet, from, to }: { outlet: string; from: string; to: string }) {
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  const problem = exportRangeProblem(outlet, from, to)

  const download = async () => {
    if (problem || busy) return
    setBusy(true)
    try {
      const url = await opsApi.exportPdf(outlet, from, to)
      const a = document.createElement('a')
      a.href = url
      a.download = `ops-log-${outlet}-${from}_${to}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col">
      <button type="button" onClick={download} disabled={!!problem || busy}
        title={problem ? t(`opsExport.problem.${problem}`) : undefined}
        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 disabled:opacity-50">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />} {t('opsExport.button')}
      </button>
      {problem && problem !== 'outlet' && <span className="text-xs text-destructive mt-0.5">{t(`opsExport.problem.${problem}`)}</span>}
    </div>
  )
}
