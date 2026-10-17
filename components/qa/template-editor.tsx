'use client'

// Create / edit a QA audit checklist template (Todo-Pilot §7).
// Removing an item deactivates it server-side; past audits keep their copy.
import { useState, useRef } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/api-client'
import { qaApi } from '@/lib/qa-audit-api'
import { useT } from '@/lib/i18n'
import type { QAAuditTemplate, QAAuditTemplateItemInput } from '@/lib/types'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

const blankItem = (): QAAuditTemplateItemInput => ({
  title: '', category: '', weight: 1, requiresPhoto: false, isCritical: false,
})

export function TemplateEditor({ template, onClose, onSaved }: {
  template: QAAuditTemplate | null          // null = new
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useT()
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [isActive, setIsActive] = useState(template?.isActive ?? true)
  const [items, setItems] = useState<QAAuditTemplateItemInput[]>(
    template?.items.map(({ id, title, category, weight, requiresPhoto, isCritical }) =>
      ({ id, title, category, weight, requiresPhoto, isCritical })) ?? [blankItem()],
  )
  const [saving, setSaving] = useState(false)

  const setItem = (idx: number, patch: Partial<QAAuditTemplateItemInput>) =>
    setItems((xs) => xs.map((x, i) => i === idx ? { ...x, ...patch } : x))
  const move = (idx: number, dir: -1 | 1) => setItems((xs) => {
    const j = idx + dir
    if (j < 0 || j >= xs.length) return xs
    const next = [...xs]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    return next
  })

  const valid = name.trim() && items.length > 0 && items.every((i) => i.title.trim())
  const categories = [...new Set(items.map((i) => i.category.trim()).filter(Boolean))]

  const save = async () => {
    setSaving(true)
    const clean = items.map((i) => ({ ...i, title: i.title.trim(), category: i.category.trim() }))
    try {
      if (template) await qaApi.updateTemplate(template.id, { name: name.trim(), description, isActive, items: clean })
      else await qaApi.createTemplate({ name: name.trim(), description, items: clean })
      toast.success(t('qaTemplate.saved'))
      onSaved()
      onClose()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="font-semibold">{template ? t('qaTemplate.edit') : t('qaTemplate.new')}</h2>
          <button onClick={onClose} className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"><X className="size-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('qaTemplate.namePlaceholder')} aria-label={t('common.name')}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('qaTemplate.descriptionPlaceholder')} aria-label={t('common.description')}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm" />
          </div>
          {template && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              {t('qaTemplate.active')}
            </label>
          )}

          <datalist id="qa-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>

          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_9rem_4rem_4rem_4rem_4.5rem] gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
              <span>{t('qaTemplate.item')}</span><span>{t('common.category')}</span><span>{t('qaTemplate.weight')}</span><span>{t('qaTemplate.photo')}</span><span>{t('qaTemplate.critical')}</span><span />
            </div>
            {items.map((it, idx) => (
              <div key={it.id ?? `new-${idx}`} className="grid grid-cols-2 sm:grid-cols-[1fr_9rem_4rem_4rem_4rem_4.5rem] gap-2 items-center p-2 sm:p-1 rounded-md border sm:border-0 border-border">
                <input value={it.title} onChange={(e) => setItem(idx, { title: e.target.value })} placeholder={t('qaTemplate.whatToCheck')} aria-label={t('qaTemplate.item')}
                  className="col-span-2 sm:col-span-1 h-9 px-2 rounded-lg border border-border bg-background text-sm" />
                <input value={it.category} list="qa-categories" onChange={(e) => setItem(idx, { category: e.target.value })} placeholder={t('common.category')} aria-label={t('common.category')}
                  className="h-9 px-2 rounded-lg border border-border bg-background text-sm" />
                <input type="number" min={1} max={10} value={it.weight}
                  onChange={(e) => setItem(idx, { weight: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })}
                  className="h-9 px-2 rounded-lg border border-border bg-background text-sm" title={t('qaTemplate.weightTitle')} aria-label={t('qaTemplate.weight')} />
                <label className="flex items-center gap-1 text-xs sm:justify-center">
                  <input type="checkbox" checked={it.requiresPhoto} onChange={(e) => setItem(idx, { requiresPhoto: e.target.checked })} />
                  <span className="sm:hidden">{t('qaTemplate.photoRequired')}</span>
                </label>
                <label className="flex items-center gap-1 text-xs sm:justify-center">
                  <input type="checkbox" checked={it.isCritical} onChange={(e) => setItem(idx, { isCritical: e.target.checked })} />
                  <span className="sm:hidden">{t('qaTemplate.critical')}</span>
                </label>
                <div className="flex items-center gap-0.5 justify-end">
                  <button onClick={() => move(idx, -1)} className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground" title={t('qaTemplate.moveUp')} aria-label={t('qaTemplate.moveUp')}><ArrowUp className="size-3.5" /></button>
                  <button onClick={() => move(idx, 1)} className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground" title={t('qaTemplate.moveDown')} aria-label={t('qaTemplate.moveDown')}><ArrowDown className="size-3.5" /></button>
                  <button onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))} disabled={items.length === 1}
                    className="size-10 sm:size-8 inline-flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-30 rounded-lg" title={t('qaTemplate.remove')} aria-label={t('qaTemplate.remove')}><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            ))}
            <button onClick={() => setItems((xs) => [...xs, blankItem()])}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-dashed border-border text-sm font-medium hover:bg-muted/50">
              <Plus className="size-3.5" /> {t('qaTemplate.addItem')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('qaTemplate.scoreNote')}
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <button onClick={onClose} className="px-4 h-9 rounded-lg border border-border text-sm">{t('common.cancel')}</button>
          <button onClick={save} disabled={!valid || saving}
            className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {saving ? t('common.saving') : t('qaTemplate.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
