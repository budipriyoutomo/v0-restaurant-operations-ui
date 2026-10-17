'use client'

// Create / edit a daily ops checklist template (Todo-Ops-Checklist Fase 1).
// Removing an item deactivates it on the server — past runs keep their snapshot.
import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { opsApi } from '@/lib/ops-checklist-api'
import { activeCategories } from '@/lib/categories'
import { useIssueStore } from '@/lib/store'
import type { OpsItemType, OpsShift, OpsTemplate, OpsTemplateItemInput } from '@/lib/types'
import { useT } from '@/lib/i18n'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'
import { useEnsureLoaded } from '@/lib/use-ensure-loaded'

const SHIFTS: OpsShift[] = ['opening', 'midday', 'closing', 'other']
const TYPES: OpsItemType[] = ['check', 'number', 'temperature']
const field = 'w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

const blank = (): OpsTemplateItemInput => ({
  title: '', section: '', itemType: 'check', minValue: null, maxValue: null, unit: '',
  requiresPhoto: false, isCritical: false, issueCategoryId: null,
})

const num = (s: string): number | null => (s.trim() === '' ? null : Number(s.replace(',', '.')))

export function OpsTemplateEditor({ template, onClose, onSaved }: {
  template: OpsTemplate | null          // null = new
  onClose: () => void
  onSaved: () => void
}) {
  const { t, label } = useT()
  const categories = activeCategories(useIssueStore((s) => s.categories))
  // Temperature items can measure one monitored asset (Fase 2): limits come from it.
  useEnsureLoaded('cmms')
  const monitored = useIssueStore((s) => s.assets).filter((a) => a.tempMonitored)
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [shift, setShift] = useState<OpsShift>(template?.shift ?? 'opening')
  const [isActive, setIsActive] = useState(template?.isActive ?? true)
  const [items, setItems] = useState<OpsTemplateItemInput[]>(template ? template.items.map((i) => ({ ...i })) : [blank()])
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  const set = (idx: number, patch: Partial<OpsTemplateItemInput>) =>
    setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
  const move = (idx: number, d: -1 | 1) => setItems((xs) => {
    const j = idx + d
    if (j < 0 || j >= xs.length) return xs
    const copy = [...xs]
    ;[copy[idx], copy[j]] = [copy[j], copy[idx]]
    return copy
  })

  const valid = name.trim() !== '' && items.length > 0 && items.every((i) => i.title.trim() !== ''
    && (i.minValue === null || i.maxValue === null || i.minValue <= i.maxValue))

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    const body = {
      name: name.trim(), description, shift, isActive,
      items: items.map((i) => (i.itemType === 'check' ? { ...i, minValue: null, maxValue: null, assetId: null }
        : i.itemType === 'number' ? { ...i, assetId: null } : i)),
    }
    try {
      if (template) await opsApi.updateTemplate(template.id, body)
      else await opsApi.createTemplate(body)
      toast.success(t('ops.templateSaved'))
      onSaved()
      onClose()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="ops-template-title"
        className="bg-background rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-border bg-background">
          <h2 id="ops-template-title" className="text-lg font-bold">{template ? t('ops.editTemplate') : t('ops.newTemplate')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 hover:bg-muted rounded-lg"><X className="size-5 text-muted-foreground" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div>
              <label htmlFor="ops-tpl-name" className="block text-xs font-semibold mb-1">{t('ops.templateName')}</label>
              <input id="ops-tpl-name" value={name} onChange={(e) => setName(e.target.value)} className={field}
                placeholder={t('ops.templateNamePlaceholder')} />
            </div>
            <div>
              <label htmlFor="ops-tpl-shift" className="block text-xs font-semibold mb-1">{t('ops.shiftLabel')}</label>
              <select id="ops-tpl-shift" value={shift} onChange={(e) => setShift(e.target.value as OpsShift)} className={field}>
                {SHIFTS.map((s) => <option key={s} value={s}>{label('opsShift', s)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="ops-tpl-desc" className="block text-xs font-semibold mb-1">{t('common.description')}</label>
            <textarea id="ops-tpl-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={cn(field, 'resize-none')} />
          </div>
          {template && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 accent-primary" />
              {t('ops.templateActive')}
            </label>
          )}

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('ops.items')}</p>
            {items.map((it, idx) => (
              <fieldset key={it.id ?? `new-${idx}`} className="rounded-lg border border-border p-3 space-y-2">
                <legend className="sr-only">{t('ops.itemN', { n: idx + 1 })}</legend>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground pt-2 w-5">{idx + 1}.</span>
                  <input value={it.title} onChange={(e) => set(idx, { title: e.target.value })} className={field}
                    aria-label={t('ops.itemTitle')} placeholder={t('ops.itemTitlePlaceholder')} />
                  <button type="button" onClick={() => move(idx, -1)} aria-label={t('ops.moveUp')} className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 rounded-lg hover:bg-muted"><ArrowUp className="size-4" /></button>
                  <button type="button" onClick={() => move(idx, 1)} aria-label={t('ops.moveDown')} className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 rounded-lg hover:bg-muted"><ArrowDown className="size-4" /></button>
                  <button type="button" onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))} disabled={items.length === 1}
                    aria-label={t('common.delete')} className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 rounded-lg hover:bg-destructive/20 disabled:opacity-30"><Trash2 className="size-4" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
                  <input value={it.section} onChange={(e) => set(idx, { section: e.target.value })} className={field}
                    aria-label={t('ops.section')} placeholder={t('ops.sectionPlaceholder')} />
                  <select value={it.itemType} onChange={(e) => set(idx, { itemType: e.target.value as OpsItemType,
                    unit: e.target.value === 'temperature' && !it.unit ? '°C' : it.unit })} className={field} aria-label={t('ops.itemType')}>
                    {TYPES.map((ty) => <option key={ty} value={ty}>{label('opsItemType', ty)}</option>)}
                  </select>
                  <select value={it.issueCategoryId ?? ''} onChange={(e) => set(idx, { issueCategoryId: e.target.value || null })}
                    className={cn(field, 'col-span-2')} aria-label={t('ops.issueCategory')}>
                    <option value="">{t('ops.issueCategoryDefault')}</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{label('category', c.name)}</option>)}
                  </select>
                </div>
                {it.itemType === 'temperature' && monitored.length > 0 && (
                  <div className="pl-7">
                    <select value={it.assetId ?? ''} onChange={(e) => set(idx, { assetId: e.target.value || null })}
                      className={field} aria-label={t('ops.asset')}>
                      <option value="">{t('ops.noAsset')}</option>
                      {monitored.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.outlet} ({a.tempMin ?? '—'} – {a.tempMax ?? '—'} °C)</option>)}
                    </select>
                    {it.assetId && <p className="text-xs text-muted-foreground mt-1">{t('ops.assetLimitsHint')}</p>}
                  </div>
                )}
                {it.itemType !== 'check' && (
                  <div className="grid grid-cols-3 gap-2 pl-7">
                    <input inputMode="decimal" value={it.minValue ?? ''} onChange={(e) => set(idx, { minValue: num(e.target.value) })}
                      className={field} aria-label={t('ops.min')} placeholder={t('ops.min')} />
                    <input inputMode="decimal" value={it.maxValue ?? ''} onChange={(e) => set(idx, { maxValue: num(e.target.value) })}
                      className={field} aria-label={t('ops.max')} placeholder={t('ops.max')} />
                    <input value={it.unit} onChange={(e) => set(idx, { unit: e.target.value })} className={field}
                      aria-label={t('ops.unit')} placeholder={t('ops.unit')} />
                  </div>
                )}
                <div className="flex gap-4 pl-7 text-xs">
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={it.requiresPhoto}
                    onChange={(e) => set(idx, { requiresPhoto: e.target.checked })} className="size-4 accent-primary" /> {t('ops.requiresPhoto')}</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={it.isCritical}
                    onChange={(e) => set(idx, { isCritical: e.target.checked })} className="size-4 accent-primary" /> {t('ops.critical')}</label>
                </div>
              </fieldset>
            ))}
            <button type="button" onClick={() => setItems((xs) => [...xs, blank()])}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Plus className="size-4" /> {t('ops.addItem')}</button>
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 p-5 border-t border-border bg-background">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-md border border-border text-sm">{t('common.cancel')}</button>
          <button type="button" onClick={save} disabled={!valid || saving}
            className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
