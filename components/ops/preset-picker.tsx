'use client'

// Built-in template sets per outlet type (Todo-Ops-Checklist Fase 4, onboarding
// UX-11): pick cafe / restaurant / cloud kitchen, optionally schedule the set at
// one outlet, one click. Existing template names are skipped, so applying twice
// is harmless. Temperature items still need binding to the outlet's chillers.
import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { opsApi } from '@/lib/ops-checklist-api'
import { useMyOutlets } from '@/lib/permissions'
import type { OpsPreset, OpsScheduleFrequency } from '@/lib/types'
import { useT } from '@/lib/i18n'

export function PresetPicker({ onApplied }: { onApplied: () => void }) {
  const { t, label } = useT()
  const outlets = useMyOutlets()
  const [presets, setPresets] = useState<OpsPreset[] | null>(null)
  const [choice, setChoice] = useState('')
  const [outlet, setOutlet] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    opsApi.presets().then((p) => { setPresets(p); setChoice((c) => c || p[0]?.key || '') })
      .catch(() => setPresets([]))
  }, [])

  const apply = async () => {
    if (!choice || busy) return
    setBusy(true)
    try {
      const res = await opsApi.applyPreset(choice, outlet || undefined)
      toast.success(t('opsPreset.applied', { created: res.created.length, skipped: res.skipped.length, schedules: res.schedules }))
      onApplied()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (presets === null) return <div className="h-24 rounded-xl bg-muted animate-pulse" />
  if (presets.length === 0) return null
  const selected = presets.find((p) => p.key === choice)
  const freq = (f: OpsScheduleFrequency, due: string) => (f === 'daily' ? due : `${t(`opsSchedule.freq.${f}`)} · ${due}`)

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div>
        <p className="font-semibold text-sm inline-flex items-center gap-1.5"><Sparkles className="size-4" aria-hidden /> {t('opsPreset.title')}</p>
        <p className="text-xs text-muted-foreground">{t('opsPreset.hint')}</p>
      </div>
      <div role="radiogroup" aria-label={t('opsPreset.outletType')} className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button key={p.key} type="button" role="radio" aria-checked={choice === p.key} onClick={() => setChoice(p.key)}
            className={cn('px-3 h-9 rounded-lg border text-sm font-medium',
              choice === p.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background hover:bg-muted/50')}>
            {p.label}
          </button>
        ))}
      </div>
      {selected && (
        <ul className="text-xs grid gap-1 sm:grid-cols-2">
          {selected.templates.map((tpl) => (
            <li key={tpl.name} className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
              <span className="sm:truncate">{tpl.name} <span className="text-muted-foreground">· {label('opsShift', tpl.shift)}</span></span>
              <span className="text-muted-foreground sm:whitespace-nowrap">{freq(tpl.frequency, tpl.dueTime)} · {t('ops.itemCount', { count: tpl.itemCount })}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">{t('opsPreset.scheduleAt')}
          <select value={outlet} onChange={(e) => setOutlet(e.target.value)}
            className="block mt-1 h-10 sm:h-9 px-2.5 rounded-lg border border-border bg-background text-sm">
            <option value="">{t('opsPreset.noSchedule')}</option>
            {outlets.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={apply} disabled={!choice || busy}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {t('opsPreset.apply')}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{t('opsPreset.tempNote')}</p>
    </div>
  )
}
