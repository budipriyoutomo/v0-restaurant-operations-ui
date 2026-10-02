'use client'

// Create / edit a QA audit checklist template (Todo-Pilot §7).
// Removing an item deactivates it server-side; past audits keep their copy.
import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/api-client'
import { qaApi } from '@/lib/qa-audit-api'
import type { QAAuditTemplate, QAAuditTemplateItemInput } from '@/lib/types'

const blankItem = (): QAAuditTemplateItemInput => ({
  title: '', category: '', weight: 1, requiresPhoto: false, isCritical: false,
})

export function TemplateEditor({ template, onClose, onSaved }: {
  template: QAAuditTemplate | null          // null = new
  onClose: () => void
  onSaved: () => void
}) {
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
      toast.success('Template saved.')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="font-semibold">{template ? 'Edit checklist template' : 'New checklist template'}</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name, e.g. Daily Kitchen Audit"
              className="h-9 px-3 rounded-md border border-border bg-background text-sm" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
              className="h-9 px-3 rounded-md border border-border bg-background text-sm" />
          </div>
          {template && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (inactive templates cannot start new audits)
            </label>
          )}

          <datalist id="qa-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>

          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_9rem_4rem_4rem_4rem_4.5rem] gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
              <span>Item</span><span>Category</span><span>Weight</span><span>Photo</span><span>Critical</span><span />
            </div>
            {items.map((it, idx) => (
              <div key={it.id ?? `new-${idx}`} className="grid grid-cols-2 sm:grid-cols-[1fr_9rem_4rem_4rem_4rem_4.5rem] gap-2 items-center p-2 sm:p-1 rounded-md border sm:border-0 border-border">
                <input value={it.title} onChange={(e) => setItem(idx, { title: e.target.value })} placeholder="What to check"
                  className="col-span-2 sm:col-span-1 h-8 px-2 rounded border border-border bg-background text-sm" />
                <input value={it.category} list="qa-categories" onChange={(e) => setItem(idx, { category: e.target.value })} placeholder="Category"
                  className="h-8 px-2 rounded border border-border bg-background text-sm" />
                <input type="number" min={1} max={10} value={it.weight}
                  onChange={(e) => setItem(idx, { weight: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })}
                  className="h-8 px-2 rounded border border-border bg-background text-sm" title="Weight 1–10" />
                <label className="flex items-center gap-1 text-xs sm:justify-center">
                  <input type="checkbox" checked={it.requiresPhoto} onChange={(e) => setItem(idx, { requiresPhoto: e.target.checked })} />
                  <span className="sm:hidden">Photo required</span>
                </label>
                <label className="flex items-center gap-1 text-xs sm:justify-center">
                  <input type="checkbox" checked={it.isCritical} onChange={(e) => setItem(idx, { isCritical: e.target.checked })} />
                  <span className="sm:hidden">Critical</span>
                </label>
                <div className="flex items-center gap-0.5 justify-end">
                  <button onClick={() => move(idx, -1)} className="p-1 text-muted-foreground hover:text-foreground" title="Move up"><ArrowUp className="size-3.5" /></button>
                  <button onClick={() => move(idx, 1)} className="p-1 text-muted-foreground hover:text-foreground" title="Move down"><ArrowDown className="size-3.5" /></button>
                  <button onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))} disabled={items.length === 1}
                    className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30" title="Remove"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            ))}
            <button onClick={() => setItems((xs) => [...xs, blankItem()])}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-dashed border-border text-xs font-semibold hover:bg-muted/50">
              <Plus className="size-3.5" /> Add item
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Score = weight of passed items ÷ weight of applicable items. A failed <b>critical</b> item raises a critical issue;
            &quot;Photo&quot; items need evidence before the audit can be submitted.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <button onClick={onClose} className="px-4 h-9 rounded-md border border-border text-sm">Cancel</button>
          <button onClick={save} disabled={!valid || saving}
            className="px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  )
}
