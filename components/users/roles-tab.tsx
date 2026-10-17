'use client'

import { useMemo, useState } from 'react'
import { Loader2, Trash2, KeyRound, Plus, Pencil, Store, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore, RoleInput } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { AccessLevel, ModuleDef, Outlet, RoleDef } from '@/lib/types'
import { ErrorBox, Field, Modal, ModalActions, OutletChecklist, apiError, inputCls, roleBadge, useModuleLabels } from './shared'
import { AccessLevelPicker } from './access-level-picker'

// ---------------------------------------------------------------------------
// Roles tab
// ---------------------------------------------------------------------------
export function RolesTab({ canManage }: { canManage: boolean }) {
  const { t, label } = useT()
  const { moduleLabel } = useModuleLabels()
  const { roles, modules, rolesLoading, outlets, deleteRole } = useIssueStore()
  const [editing, setEditing] = useState<RoleDef | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (role: RoleDef) => {
    if (!confirm(t('users.deleteRoleConfirm', { name: role.name }))) return
    setError(null)
    try {
      await deleteRole(role.key)
    } catch (e) {
      setError(apiError(e))
    }
  }

  if (rolesLoading && roles.length === 0) {
    return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {t('users.rolesIntro')}
        </p>
        {canManage && (
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <Plus className="size-4" /> {t('users.newRole')}
          </button>
        )}
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map(role => {
          const granted = modules.filter(m => (role.permissions[m.key] ?? 'none') !== 'none')
          const outletText = role.all_outlets ? t('users.allOutlets')
            : outlets.filter(o => role.outlet_ids.includes(o.id)).map(o => o.name).join(', ') || t('users.noDefaultOutlets')
          return (
            <div key={role.key} className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className={cn('size-9 rounded-lg flex items-center justify-center flex-shrink-0', roleBadge(role.key))}>
                  <KeyRound className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{role.name}</p>
                    <code className="text-xs text-muted-foreground">{role.key}</code>
                    {role.is_system && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold flex items-center gap-1">
                        <Lock className="size-2.5" /> {t('users.system')}
                      </span>
                    )}
                  </div>
                  {role.description && <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('users.roleUsers', { count: role.user_count })} <span className="font-medium">{label('tier', role.approval_tier)}</span>
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditing(role)}
                      className="size-10 sm:size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                      title={t('common.edit')}
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    {!role.is_system && (
                      <button
                        onClick={() => handleDelete(role)}
                        className="size-10 sm:size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Store className="size-3.5" /> {outletText}
              </p>
              <div className="flex flex-wrap gap-1">
                {granted.length === 0 && <span className="text-xs text-muted-foreground">{t('users.noModuleAccess')}</span>}
                {granted.map(m => (
                  <span key={m.key} className={cn(
                    'text-xs px-2 py-0.5 rounded-md font-medium',
                    role.permissions[m.key] === 'manage' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}>
                    {moduleLabel(m)}{role.permissions[m.key] === 'manage' ? ' ✎' : ''}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t('users.legend')}</p>

      {editing && (
        <RoleEditor
          role={editing === 'new' ? null : editing}
          modules={modules}
          outlets={outlets}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

export function RoleEditor({ role, modules, outlets, onClose }: {
  role: RoleDef | null
  modules: ModuleDef[]
  outlets: Outlet[]
  onClose: () => void
}) {
  const { t, label } = useT()
  const { moduleLabel, groupLabel } = useModuleLabels()
  const { createRole, updateRole } = useIssueStore()
  const isNew = role === null
  const locked = role?.key === 'admin'   // backend refuses to restrict the admin role

  const [key, setKey] = useState('')
  const [form, setForm] = useState<RoleInput>(() => ({
    name: role?.name ?? '',
    description: role?.description ?? '',
    permissions: role?.permissions ?? {},
    all_outlets: role?.all_outlets ?? false,
    outlet_ids: role?.outlet_ids ?? [],
    approval_tier: role?.approval_tier ?? 'staff',
    home_page: role?.home_page ?? 'my-work',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groups = useMemo(() => {
    const out: Record<string, ModuleDef[]> = {}
    for (const m of modules) (out[m.group] ??= []).push(m)
    return Object.entries(out)
  }, [modules])

  const setLevel = (module: string, level: AccessLevel) =>
    setForm(f => ({ ...f, permissions: { ...f.permissions, [module]: level } }))

  const setAll = (level: AccessLevel) =>
    setForm(f => ({
      ...f,
      permissions: Object.fromEntries(modules.map(m => [
        m.key, level === 'manage' && !m.manageable ? 'view' : level,
      ])),
    }))

  const valid = form.name.trim() && (!isNew || /^[a-z][a-z0-9_-]{1,49}$/.test(key))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const body = { ...form, outlet_ids: form.all_outlets ? [] : form.outlet_ids }
      if (isNew) await createRole({ ...body, key })
      else if (locked) await updateRole(role.key, { name: form.name, description: form.description, home_page: form.home_page })
      else await updateRole(role.key, body)
      onClose()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isNew ? t('users.newRole') : t('users.editRole', { name: role.name })} onClose={onClose} wide>
      <div className="space-y-5">
        {error && <ErrorBox>{error}</ErrorBox>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('common.name')}>
            <input
              value={form.name}
              onChange={e => {
                const name = e.target.value
                setForm(f => ({ ...f, name }))
                if (isNew) setKey(name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50))
              }}
              placeholder={t('users.namePlaceholder')}
              className={inputCls}
            />
          </Field>
          <Field label={t('users.key')} hint={isNew ? t('users.keyHint') : undefined}>
            <input value={isNew ? key : role.key} disabled={!isNew} onChange={e => setKey(e.target.value)}
              placeholder="area-manager" className={cn(inputCls, !isNew && 'opacity-60')} />
          </Field>
        </div>
        <Field label={t('common.description')}>
          <input value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={t('users.descriptionPlaceholder')} className={inputCls} />
        </Field>

        {/* Landing page after sign-in (Todo-Pilot §19); only pages the role can open */}
        <Field label={t('users.homePage')} hint={t('users.homePageHint')}>
          <select value={form.home_page ?? 'my-work'} onChange={e => setForm(f => ({ ...f, home_page: e.target.value }))} className={inputCls}>
            {['my-work', 'notifications', ...modules.map(m => m.key).filter(k => k !== 'vendors' && k !== 'budgets')]
              .filter(k => locked || ['my-work', 'notifications', 'settings'].includes(k) || (form.permissions[k] ?? 'none') !== 'none')
              .map(k => <option key={k} value={k}>{k === 'my-work' ? t('nav.my-work') : k === 'notifications' ? t('nav.notifications') : moduleLabel({ key: k, label: modules.find(m => m.key === k)?.label ?? k })}</option>)}
          </select>
        </Field>

        {locked ? (
          <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-3 flex items-center gap-2">
            <Lock className="size-3.5" /> {t('users.adminLocked')}
          </p>
        ) : (
          <>
            {/* Module matrix */}
            <div>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <p className="text-sm font-semibold">{t('users.moduleAccess')}</p>
                <div className="flex gap-1">
                  {(['none', 'view', 'manage'] as const).map(l => (
                    <button key={l} type="button" onClick={() => setAll(l)}
                      className="px-3 h-8 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent">
                      {t('users.allLevel', { level: label('access', l) })}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                {groups.map(([group, mods]) => (
                  <div key={group}>
                    <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30">{groupLabel(group)}</p>
                    {mods.map(m => {
                      const level = form.permissions[m.key] ?? 'none'
                      return (
                        <div key={m.key} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="text-sm">{moduleLabel(m)}</span>
                          <AccessLevelPicker
                            label={moduleLabel(m)}
                            value={level}
                            manageable={m.manageable}
                            onChange={(l) => setLevel(m.key, l)}
                            labels={{ none: label('access', 'none'), view: label('access', 'view'), manage: label('access', 'manage') }}
                          />
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Outlet access */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">{t('users.outletDataAccess')}</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={form.all_outlets} onChange={() => setForm(f => ({ ...f, all_outlets: true }))} />
                {t('users.allOutlets')}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!form.all_outlets} onChange={() => setForm(f => ({ ...f, all_outlets: false }))} />
                {t('users.selectedOutlets')}
              </label>
              {!form.all_outlets && (
                <>
                  <OutletChecklist outlets={outlets} selected={form.outlet_ids}
                    onChange={ids => setForm(f => ({ ...f, outlet_ids: ids }))} />
                  <p className="text-xs text-muted-foreground">
                    {t('users.outletDefaultHint')}
                  </p>
                </>
              )}
            </div>

            {/* Approval tier */}
            <Field label={t('users.approvesAs')} hint={t('users.approvesAsHint')}>
              <select value={form.approval_tier}
                onChange={e => setForm(f => ({ ...f, approval_tier: e.target.value as RoleInput['approval_tier'] }))}
                className={inputCls}>
                <option value="staff">{label('tier', 'staff')}</option>
                <option value="manager">{label('tier', 'manager')}</option>
                <option value="admin">{label('tier', 'admin')}</option>
              </select>
            </Field>
          </>
        )}

        <ModalActions onCancel={onClose} onSubmit={save} disabled={!valid} loading={saving} label={isNew ? t('users.createRole') : t('common.save')} />
      </div>
    </Modal>
  )
}
