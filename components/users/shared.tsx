'use client'

import { useRef } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate, useT } from '@/lib/i18n'
import { Outlet, User } from '@/lib/types'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

export const SYSTEM_BADGES: Record<string, string> = {
  admin:   'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  manager: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
  staff:   'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
}

export function roleBadge(key: string) {
  return SYSTEM_BADGES[key] ?? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
}

export function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function apiError(e: unknown) {
  return String(e).replace(/Error: API \d+ [^:]+: /, '').replace('Error: ', '')
}

// ---------------------------------------------------------------------------
// Outlet checklist — shared by the user override and the role editor
// ---------------------------------------------------------------------------
export function OutletChecklist({ outlets, selected, onChange, disabled }: {
  outlets: Outlet[]
  selected: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const { t } = useT()
  const set = new Set(selected)
  const toggle = (id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }
  if (outlets.length === 0) {
    return <p className="text-xs text-muted-foreground">{t('users.noOutletsMaster')}</p>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {outlets.map(o => (
        // A real checkbox (several outlets can be picked), drawn as a chip.
        <label key={o.id} className={cn(
          'flex items-center gap-2 h-10 px-3 rounded-lg border text-sm cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-ring/50',
          set.has(o.id) ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:border-foreground/20',
          disabled && 'opacity-60 cursor-not-allowed',
        )}>
          <input type="checkbox" className="sr-only" checked={set.has(o.id)} disabled={disabled} onChange={() => toggle(o.id)} />
          <span className={cn('size-4 rounded border flex items-center justify-center flex-shrink-0', set.has(o.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-border')} aria-hidden="true">
            {set.has(o.id) && <Check className="size-3" />}
          </span>
          <span className="truncate">{o.name}</span>
        </label>
      ))}
    </div>
  )
}

export function outletSummary(user: User, outlets: Outlet[], t: ReturnType<typeof useT>['t']) {
  if (user.all_outlets) return t('users.allOutlets')
  const names = outlets.filter(o => user.effective_outlet_ids.includes(o.id)).map(o => o.name)
  if (names.length === 0) return t('users.noOutlets')
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')
}

// Module and group names come from the backend registry (English); show the
// dictionary's name when there is one (Todo-Pilot §16).
export function useModuleLabels() {
  const { locale } = useT()
  const moduleLabel = (m: { key: string; label: string }) => {
    const k = `module.${m.key}`
    const v = translate(locale, k as never)
    return v === k ? m.label : v
  }
  const groupLabel = (g: string) => {
    const k = `moduleGroup.${g}`
    const v = translate(locale, k as never)
    return v === k ? g : v
  }
  return { moduleLabel, groupLabel }
}


// A wrapping <label> ties the text to the control inside (UX-13 accessibility).
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground mt-1">{hint}</span>}
    </label>
  )
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">{children}</div>
  )
}

export function Modal({ title, onClose, wide, children }: {
  title: string; onClose: () => void; wide?: boolean; children: React.ReactNode
}) {
  const { t } = useT()
  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" className={cn(
        'w-full bg-background rounded-2xl border border-border shadow-xl p-6 max-h-[90vh] overflow-y-auto',
        wide ? 'max-w-2xl' : 'max-w-md',
      )}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="size-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ModalActions({ onCancel, onSubmit, submit, disabled, loading, label }: {
  onCancel: () => void
  onSubmit?: () => void
  submit?: boolean
  disabled?: boolean
  loading?: boolean
  label: string
}) {
  const { t } = useT()
  const enabled = !disabled && !loading
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onCancel}
        className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
        {t('common.cancel')}
      </button>
      <button
        type={submit ? 'submit' : 'button'}
        onClick={submit ? undefined : onSubmit}
        disabled={!enabled}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors',
          enabled ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : label}
      </button>
    </div>
  )
}

// Text field look shared by the user & role forms (Todo-UI #18).
export const inputCls = 'w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40'
