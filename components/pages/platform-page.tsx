'use client'

// Platform admin — the SaaS operator's only screen (Todo-Pilot §11).
// Creates, renames and (de)activates customer companies. Platform admins
// belong to no company, so every company endpoint refuses them; this page
// talks only to /api/platform/*.

import { useEffect, useId, useState, useRef } from 'react'
import { Building2, Copy, LogOut, Plus, Power, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-client'
import { useIssueStore } from '@/lib/store'
import { platformApi, type CreatedCompany, type PlatformCompany } from '@/lib/platform-api'
import { slugify, validateNewCompany, type NewCompanyErrors, type NewCompanyForm } from '@/lib/platform'
import { useT } from '@/lib/i18n'
import { useModalKeyboard } from '@/lib/use-modal-keyboard'

const EMPTY_FORM: NewCompanyForm = { name: '', adminName: '', adminEmail: '', adminPassword: '', outletName: '' }
const inputClass = 'w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

export function PlatformPage() {
  const { t } = useT()
  const { currentUser, logout } = useIssueStore()
  const [companies, setCompanies] = useState<PlatformCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState<PlatformCompany | null>(null)
  const [renaming, setRenaming] = useState<PlatformCompany | null>(null)

  useEffect(() => {
    platformApi.list()
      .then(setCompanies)
      .catch((e) => setError(apiErrorMessage(e, t('platform.loadFailed'))))
      .finally(() => setLoading(false))
  }, [])

  const replace = (updated: PlatformCompany) =>
    setCompanies((list) => list.map((c) => (c.id === updated.id ? updated : c)))

  const setActive = async (c: PlatformCompany, isActive: boolean) => {
    setError(null)
    try {
      replace(await platformApi.update(c.id, { is_active: isActive }))
    } catch (e) {
      setError(apiErrorMessage(e, t('platform.updateFailed')))
    }
  }

  const active = companies.filter((c) => c.is_active).length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <span className="font-semibold">{t('platform.brand')}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:inline">{currentUser?.email}</span>
            <button onClick={logout} className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-border hover:bg-muted/50 text-xs font-semibold">
              <LogOut className="size-3.5" /> {t('platform.signOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t('platform.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('platform.summary', { count: companies.length, active })}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
            <Plus className="size-4" /> {t('platform.newCompany')}
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">{t('platform.company')}</th>
                <th className="text-right px-4 py-2.5 font-semibold">{t('platform.users')}</th>
                <th className="text-right px-4 py-2.5 font-semibold">{t('platform.outlets')}</th>
                <th className="text-left px-4 py-2.5 font-semibold">{t('common.status')}</th>
                <th className="text-right px-4 py-2.5 font-semibold"><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('common.loading')}</td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('platform.none')}</td></tr>
              ) : companies.map((c) => (
                <tr key={c.id} aria-label={c.name} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{c.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.user_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.outlet_count}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold',
                      c.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                      {c.is_active ? t('platform.active') : t('platform.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setRenaming(c)} className="flex items-center gap-1 px-2.5 h-7 rounded-md border border-border text-xs hover:bg-muted/50">
                        <Pencil className="size-3" /> {t('platform.rename')}
                      </button>
                      {c.is_active ? (
                        <button onClick={() => setConfirmDeactivate(c)} className="flex items-center gap-1 px-2.5 h-7 rounded-md border border-destructive/40 text-destructive text-xs hover:bg-destructive/10">
                          <Power className="size-3" /> {t('platform.deactivate')}
                        </button>
                      ) : (
                        <button onClick={() => setActive(c, true)} className="flex items-center gap-1 px-2.5 h-7 rounded-md border border-border text-xs hover:bg-muted/50">
                          <Power className="size-3" /> {t('platform.activate')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showCreate && (
        <CreateCompanyDialog
          onClose={() => setShowCreate(false)}
          onCreated={(c) => setCompanies((list) => [...list, c])}
        />
      )}

      {confirmDeactivate && (
        <Modal title={t('platform.deactivateTitle', { name: confirmDeactivate.name })} onClose={() => setConfirmDeactivate(null)}>
          <p className="text-sm text-muted-foreground">
            {t('platform.deactivateText', { name: confirmDeactivate.name })}
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setConfirmDeactivate(null)} className="px-4 h-9 rounded-md border border-border text-sm">{t('common.cancel')}</button>
            <button
              onClick={async () => { const c = confirmDeactivate; setConfirmDeactivate(null); await setActive(c, false) }}
              className="px-4 h-9 rounded-md bg-destructive text-white text-sm font-semibold"
            >
              {t('platform.yesDeactivate')}
            </button>
          </div>
        </Modal>
      )}

      {renaming && (
        <RenameDialog company={renaming} onClose={() => setRenaming(null)} onSaved={(c) => { replace(c); setRenaming(null) }} />
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useT()
  // Escape, focus trap, focus back to the opener (Todo-Pilot §26)
  const panelRef = useRef<HTMLDivElement>(null)
  useModalKeyboard(panelRef, onClose)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div ref={panelRef} role="dialog" aria-label={title} className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" aria-label={t('common.close')} onClick={onClose} className="p-1 hover:bg-muted rounded-md">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function CreateCompanyDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (c: PlatformCompany) => void }) {
  const { t, locale } = useT()
  const id = useId()
  const [form, setForm] = useState<NewCompanyForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<NewCompanyErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<CreatedCompany | null>(null)

  const set = (key: keyof NewCompanyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validateNewCompany(form, locale)
    setErrors(found)
    if (Object.keys(found).length > 0 || busy) return
    setBusy(true)
    setServerError(null)
    try {
      const result = await platformApi.create(form)
      setCreated(result)
      onCreated(result.company)
    } catch (err) {
      setServerError(apiErrorMessage(err, t('platform.createFailed')))
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <Modal title={t('platform.created')} onClose={onClose}>
        <div role="status" className="space-y-3 text-sm">
          <p>{t('platform.ready', { name: created.company.name })}</p>
          <dl className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5 font-mono text-xs">
            <div><dt className="inline text-muted-foreground">{t('platform.email')} </dt><dd className="inline">{created.admin_email}</dd></div>
            {created.admin_password && (
              <div className="flex items-center gap-2">
                <dt className="text-muted-foreground">{t('platform.password')}</dt>
                <dd>{created.admin_password}</dd>
                <button type="button" aria-label={t('platform.copyPassword')} className="p-1 rounded hover:bg-muted"
                  onClick={() => navigator.clipboard?.writeText(created.admin_password ?? '')}>
                  <Copy className="size-3.5" />
                </button>
              </div>
            )}
          </dl>
          {created.admin_password && (
            <p className="text-xs text-amber-700">{t('platform.passwordOnce')}</p>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={onClose} className="px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold">{t('platform.done')}</button>
        </div>
      </Modal>
    )
  }

  const field = (key: keyof NewCompanyForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: React.ReactNode) => (
    <div>
      <label htmlFor={`${id}-${key}`} className="block text-sm font-semibold mb-1.5">{label}</label>
      <input id={`${id}-${key}`} value={form[key]} onChange={set(key)} className={inputClass} {...props} />
      {hint}
      {errors[key] && <p className="text-xs text-destructive mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <Modal title={t('platform.newCompany')} onClose={() => !busy && onClose()}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {field('name', t('platform.companyName'), { placeholder: 'PT Sate Senayan' },
          form.name.trim() && <p className="text-xs text-muted-foreground mt-1">{t('platform.id')} <span className="font-mono">{slugify(form.name)}</span></p>)}
        {field('outletName', t('platform.firstOutlet'), { placeholder: 'Senayan City' })}
        <div className="pt-2 border-t border-border space-y-4">
          <p className="pt-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('platform.firstAdmin')}</p>
          {field('adminName', t('platform.adminName'), { placeholder: 'Rina' })}
          {field('adminEmail', t('platform.adminEmail'), { type: 'email', placeholder: 'rina@satesenayan.id' })}
          {field('adminPassword', t('platform.passwordOptional'), { type: 'password', placeholder: t('platform.passwordPlaceholder'), autoComplete: 'new-password' })}
        </div>
        {serverError && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 h-9 rounded-md border border-border text-sm">{t('common.cancel')}</button>
          <button type="submit" disabled={busy} className="px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
            {busy ? t('platform.creating') : t('platform.create')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function RenameDialog({ company, onClose, onSaved }: { company: PlatformCompany; onClose: () => void; onSaved: (c: PlatformCompany) => void }) {
  const { t } = useT()
  const id = useId()
  const [name, setName] = useState(company.name)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      onSaved(await platformApi.update(company.id, { name: name.trim() }))
    } catch (err) {
      setError(apiErrorMessage(err, t('platform.renameFailed')))
      setBusy(false)
    }
  }

  return (
    <Modal title={t('platform.renameTitle', { name: company.name })} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor={`${id}-name`} className="block text-sm font-semibold mb-1.5">{t('platform.newName')}</label>
          <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          <p className="text-xs text-muted-foreground mt-1">{t('platform.idStays', { slug: company.slug })}</p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 h-9 rounded-md border border-border text-sm">{t('common.cancel')}</button>
          <button type="submit" disabled={busy || !name.trim()} className="px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">{t('common.save')}</button>
        </div>
      </form>
    </Modal>
  )
}
