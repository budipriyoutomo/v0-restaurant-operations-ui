'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Users, UserPlus, Shield, Eye, EyeOff, Loader2, X, Trash2, ChevronDown,
  KeyRound, Plus, Pencil, Store, Lock, MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore, RoleInput } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { AccessLevel, ModuleDef, Outlet, RoleDef, User } from '@/lib/types'

const SYSTEM_BADGES: Record<string, string> = {
  admin:   'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  staff:   'bg-blue-100 text-blue-700',
}

function roleBadge(key: string) {
  return SYSTEM_BADGES[key] ?? 'bg-amber-100 text-amber-700'
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function apiError(e: unknown) {
  return String(e).replace(/Error: API \d+ [^:]+: /, '').replace('Error: ', '')
}

// ---------------------------------------------------------------------------
// Outlet checklist — shared by the user override and the role editor
// ---------------------------------------------------------------------------
function OutletChecklist({ outlets, selected, onChange, disabled }: {
  outlets: Outlet[]
  selected: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const set = new Set(selected)
  const toggle = (id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }
  if (outlets.length === 0) {
    return <p className="text-xs text-muted-foreground">No outlets in master data yet.</p>
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {outlets.map(o => (
        <label key={o.id} className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded border text-xs cursor-pointer',
          set.has(o.id) ? 'border-primary/50 bg-primary/5' : 'border-border',
          disabled && 'opacity-60 cursor-not-allowed',
        )}>
          <input type="checkbox" checked={set.has(o.id)} disabled={disabled} onChange={() => toggle(o.id)} />
          <span className="truncate">{o.name}</span>
        </label>
      ))}
    </div>
  )
}

function outletSummary(user: User, outlets: Outlet[]) {
  if (user.all_outlets) return 'All outlets'
  const names = outlets.filter(o => user.effective_outlet_ids.includes(o.id)).map(o => o.name)
  if (names.length === 0) return 'No outlets'
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')
}

// ---------------------------------------------------------------------------
// User card
// ---------------------------------------------------------------------------
function UserCard({ user, isCurrentUser, canManage }: { user: User; isCurrentUser: boolean; canManage: boolean }) {
  const { updateUser, deleteUser, roles, outlets } = useIssueStore()
  const [roleLoading, setRoleLoading]     = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [showDelete, setShowDelete]       = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showOutlets, setShowOutlets]     = useState(false)
  const [showWa, setShowWa]               = useState(false)
  const [waNumber, setWaNumber]           = useState(user.whatsapp_number ?? '')
  const [waLoading, setWaLoading]         = useState(false)
  const [error, setError] = useState<string | null>(null)

  // WhatsApp number (Todo-Pilot §4). The user still opts in themselves under Settings.
  const handleSaveWa = async () => {
    setWaLoading(true)
    setError(null)
    try {
      const updated = await updateUser(user.id, { whatsapp_number: waNumber.trim() })
      setWaNumber(updated.whatsapp_number ?? '')
      setShowWa(false)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setWaLoading(false)
    }
  }

  const handleRoleChange = async (newRole: string) => {
    if (newRole === user.role) return
    setRoleLoading(true)
    setError(null)
    try {
      await updateUser(user.id, { role: newRole })
    } catch (e) {
      setError(apiError(e))
    } finally {
      setRoleLoading(false)
    }
  }

  const handleToggleActive = async () => {
    setToggleLoading(true)
    setError(null)
    try {
      await updateUser(user.id, { is_active: !user.is_active })
    } catch (e) {
      setError(apiError(e))
    } finally {
      setToggleLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await deleteUser(user.id)
    } catch (e) {
      setError(apiError(e))
      setDeleteLoading(false)
      setShowDelete(false)
    }
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border bg-card shadow-sm flex flex-col gap-3',
      isCurrentUser ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border',
      !user.is_active && 'opacity-60'
    )}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'size-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
          roleBadge(user.role),
        )}>
          {getInitials(user.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            {isCurrentUser && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">You</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold', roleBadge(user.role))}>
              {user.role_name}
            </span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-semibold',
              user.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
            )}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Store className="size-3" />
            {outletSummary(user, outlets)}
            {user.outlet_ids.length > 0 && <span className="text-amber-600 font-medium">(custom)</span>}
          </p>
          {user.whatsapp_number && (
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <MessageCircle className="size-3" /> +{user.whatsapp_number}
            </p>
          )}
        </div>
        {user.role === 'admin' && (
          <Shield className="size-4 text-red-500 flex-shrink-0 mt-0.5" />
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">{error}</p>
      )}

      {showWa && (
        <div className="flex gap-2">
          <input
            type="tel"
            value={waNumber}
            onChange={e => setWaNumber(e.target.value)}
            placeholder="WhatsApp, e.g. 0812 3456 7890 (empty = remove)"
            className="flex-1 h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={handleSaveWa}
            disabled={waLoading}
            className="px-2 h-7 text-[11px] font-semibold rounded bg-primary text-primary-foreground disabled:opacity-50"
          >
            {waLoading ? <Loader2 className="size-3 animate-spin" /> : 'Save'}
          </button>
        </div>
      )}

      {/* Actions row — hidden for current user and for read-only viewers */}
      {canManage && !isCurrentUser && (
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <div className="relative flex-1">
            <select
              value={user.role}
              disabled={roleLoading}
              onChange={e => handleRoleChange(e.target.value)}
              className={cn(
                'w-full appearance-none pl-2 pr-6 py-1 text-xs rounded border border-border bg-muted/20',
                'focus:outline-none focus:ring-1 focus:ring-primary/50',
                roleLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
              {!roles.some(r => r.key === user.role) && <option value={user.role}>{user.role_name}</option>}
            </select>
            {roleLoading
              ? <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 animate-spin text-muted-foreground" />
              : <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
            }
          </div>

          <button
            onClick={() => setShowWa(v => !v)}
            title="WhatsApp number"
            className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            <MessageCircle className="size-3.5" />
          </button>

          <button
            onClick={() => setShowOutlets(true)}
            title="Outlet access"
            className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            <Store className="size-3.5" />
          </button>

          <button
            onClick={handleToggleActive}
            disabled={toggleLoading}
            className={cn(
              'px-2 py-1 text-[11px] font-semibold rounded border transition-colors flex-shrink-0',
              user.is_active
                ? 'border-warning/40 text-warning hover:bg-warning/10'
                : 'border-success/40 text-success hover:bg-success/10',
              toggleLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {toggleLoading ? <Loader2 className="size-3 animate-spin" /> : user.is_active ? 'Deactivate' : 'Activate'}
          </button>

          <button
            onClick={() => setShowDelete(true)}
            className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}

      {showDelete && (
        <div className="border-t border-border pt-2 space-y-2">
          <p className="text-xs text-muted-foreground">Remove <strong>{user.name}</strong> from the system?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDelete(false)}
              className="flex-1 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex-1 py-1 text-xs rounded bg-destructive text-destructive-foreground font-semibold flex items-center justify-center gap-1 hover:bg-destructive/90 transition-colors"
            >
              {deleteLoading ? <Loader2 className="size-3 animate-spin" /> : 'Remove'}
            </button>
          </div>
        </div>
      )}

      {showOutlets && <UserOutletsModal user={user} onClose={() => setShowOutlets(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// User outlet override
// ---------------------------------------------------------------------------
function UserOutletsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { updateUser, outlets, roles } = useIssueStore()
  const role = roles.find(r => r.key === user.role)
  const [custom, setCustom] = useState(user.outlet_ids.length > 0)
  const [selected, setSelected] = useState<string[]>(user.outlet_ids)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleDefault = !role ? '—'
    : role.all_outlets ? 'All outlets'
    : outlets.filter(o => role.outlet_ids.includes(o.id)).map(o => o.name).join(', ') || 'No outlets'

  const valid = !custom || selected.length > 0

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateUser(user.id, { outlet_ids: custom ? selected : [] })
      onClose()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Outlet access — ${user.name}`} onClose={onClose}>
      <div className="space-y-4">
        {error && <ErrorBox>{error}</ErrorBox>}
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="radio" className="mt-1" checked={!custom} onChange={() => setCustom(false)} />
          <span>
            <span className="font-semibold">Follow role</span>
            <span className="block text-xs text-muted-foreground">{role?.name ?? user.role_name}: {roleDefault}</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="radio" className="mt-1" checked={custom} onChange={() => setCustom(true)} />
          <span>
            <span className="font-semibold">Custom outlets for this user</span>
            <span className="block text-xs text-muted-foreground">Replaces the role default for this user only.</span>
          </span>
        </label>
        {custom && <OutletChecklist outlets={outlets} selected={selected} onChange={setSelected} />}
        <ModalActions onCancel={onClose} onSubmit={save} disabled={!valid} loading={saving} label="Save" />
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Roles tab
// ---------------------------------------------------------------------------
function RolesTab({ canManage }: { canManage: boolean }) {
  const { roles, modules, rolesLoading, outlets, deleteRole } = useIssueStore()
  const [editing, setEditing] = useState<RoleDef | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (role: RoleDef) => {
    if (!confirm(`Delete role "${role.name}"?`)) return
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          A role sets which modules its users can open and which outlets&apos; data they see.
        </p>
        {canManage && (
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <Plus className="size-4" /> New Role
          </button>
        )}
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map(role => {
          const granted = modules.filter(m => (role.permissions[m.key] ?? 'none') !== 'none')
          const outletText = role.all_outlets ? 'All outlets'
            : outlets.filter(o => role.outlet_ids.includes(o.id)).map(o => o.name).join(', ') || 'No default outlets'
          return (
            <div key={role.key} className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className={cn('size-9 rounded-lg flex items-center justify-center flex-shrink-0', roleBadge(role.key))}>
                  <KeyRound className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{role.name}</p>
                    <code className="text-[10px] text-muted-foreground">{role.key}</code>
                    {role.is_system && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold flex items-center gap-1">
                        <Lock className="size-2.5" /> System
                      </span>
                    )}
                  </div>
                  {role.description && <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {role.user_count} active user{role.user_count === 1 ? '' : 's'} · approves as <span className="font-medium">{role.approval_tier}</span>
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditing(role)}
                      className="size-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                      title="Edit"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    {!role.is_system && (
                      <button
                        onClick={() => handleDelete(role)}
                        className="size-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
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
                {granted.length === 0 && <span className="text-xs text-muted-foreground">No module access</span>}
                {granted.map(m => (
                  <span key={m.key} className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-medium',
                    role.permissions[m.key] === 'manage' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}>
                    {m.label}{role.permissions[m.key] === 'manage' ? ' ✎' : ''}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">✎ = can manage (create / edit / delete). Others are view-only.</p>

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

function RoleEditor({ role, modules, outlets, onClose }: {
  role: RoleDef | null
  modules: ModuleDef[]
  outlets: Outlet[]
  onClose: () => void
}) {
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
      else if (locked) await updateRole(role.key, { name: form.name, description: form.description })
      else await updateRole(role.key, body)
      onClose()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isNew ? 'New Role' : `Edit Role — ${role.name}`} onClose={onClose} wide>
      <div className="space-y-5">
        {error && <ErrorBox>{error}</ErrorBox>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name">
            <input
              value={form.name}
              onChange={e => {
                const name = e.target.value
                setForm(f => ({ ...f, name }))
                if (isNew) setKey(name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50))
              }}
              placeholder="Area Manager"
              className={inputCls}
            />
          </Field>
          <Field label="Key" hint={isNew ? 'Used internally; cannot be changed later.' : undefined}>
            <input value={isNew ? key : role.key} disabled={!isNew} onChange={e => setKey(e.target.value)}
              placeholder="area-manager" className={cn(inputCls, !isNew && 'opacity-60')} />
          </Field>
        </div>
        <Field label="Description">
          <input value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Covers several outlets in one region" className={inputCls} />
        </Field>

        {locked ? (
          <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-3 flex items-center gap-2">
            <Lock className="size-3.5" /> The Admin role always has full access to every module and outlet.
          </p>
        ) : (
          <>
            {/* Module matrix */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Module access</p>
                <div className="flex gap-1">
                  {(['none', 'view', 'manage'] as const).map(l => (
                    <button key={l} type="button" onClick={() => setAll(l)}
                      className="px-2 h-6 rounded border border-border text-[11px] text-muted-foreground hover:bg-accent capitalize">
                      All {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border border-border rounded-md divide-y divide-border">
                {groups.map(([group, mods]) => (
                  <div key={group}>
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30">{group}</p>
                    {mods.map(m => {
                      const level = form.permissions[m.key] ?? 'none'
                      return (
                        <div key={m.key} className="flex items-center justify-between px-3 py-1.5">
                          <span className="text-sm">{m.label}</span>
                          <div className="flex rounded-md border border-border overflow-hidden">
                            {(['none', 'view', 'manage'] as const).map(l => {
                              const disabled = l === 'manage' && !m.manageable
                              return (
                                <button
                                  key={l}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => setLevel(m.key, l)}
                                  className={cn(
                                    'px-2.5 h-6 text-[11px] capitalize transition-colors',
                                    level === l
                                      ? l === 'none' ? 'bg-muted text-foreground font-semibold' : 'bg-primary text-primary-foreground font-semibold'
                                      : 'text-muted-foreground hover:bg-accent',
                                    disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent',
                                  )}
                                >
                                  {l}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Outlet access */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Outlet data access</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={form.all_outlets} onChange={() => setForm(f => ({ ...f, all_outlets: true }))} />
                All outlets
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!form.all_outlets} onChange={() => setForm(f => ({ ...f, all_outlets: false }))} />
                Selected outlets only
              </label>
              {!form.all_outlets && (
                <>
                  <OutletChecklist outlets={outlets} selected={form.outlet_ids}
                    onChange={ids => setForm(f => ({ ...f, outlet_ids: ids }))} />
                  <p className="text-[11px] text-muted-foreground">
                    Default for users with this role. A user can be given custom outlets on the Users tab.
                    With none selected, users only see records shared across all outlets.
                  </p>
                </>
              )}
            </div>

            {/* Approval tier */}
            <Field label="Approves as" hint="Which approval-workflow steps users with this role can decide.">
              <select value={form.approval_tier}
                onChange={e => setForm(f => ({ ...f, approval_tier: e.target.value as RoleInput['approval_tier'] }))}
                className={inputCls}>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </>
        )}

        <ModalActions onCancel={onClose} onSubmit={save} disabled={!valid} loading={saving} label={isNew ? 'Create Role' : 'Save'} />
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function UsersPage() {
  const { allUsers, usersLoading, currentUser, roles, loadRoles } = useIssueStore()
  const { can } = usePermissions()
  const [tab, setTab] = useState<'users' | 'roles'>('users')
  const [showInvite, setShowInvite] = useState(false)
  const [filterRole, setFilterRole] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => { loadRoles() }, [loadRoles])

  const visibleUsers = allUsers.filter(u => showInactive ? true : u.is_active)
  const filtered = filterRole ? visibleUsers.filter(u => u.role === filterRole) : visibleUsers

  const stats = {
    total:  allUsers.length,
    active: allUsers.filter(u => u.is_active).length,
    admins: allUsers.filter(u => u.role === 'admin').length,
    roles:  roles.length,
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage team access, module permissions and outlet visibility</p>
        </div>
        {can.manageUsers && tab === 'users' && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="size-4" /> Invite User
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total,  color: 'text-foreground' },
          { label: 'Active',      value: stats.active, color: 'text-success' },
          { label: 'Admins',      value: stats.admins, color: 'text-red-600' },
          { label: 'Roles',       value: stats.roles,  color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-lg border border-border bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['users', 'Users'], ['roles', 'Roles & Permissions']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'roles' ? <RolesTab canManage={can.manageUsers} /> : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Role:</span>
            {[{ key: null as string | null, name: 'All' }, ...roles].map(r => (
              <button
                key={r.key ?? 'all'}
                onClick={() => setFilterRole(r.key)}
                className={cn(
                  'px-3 h-7 rounded-full text-xs font-medium transition-colors',
                  filterRole === r.key
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground hover:bg-accent'
                )}
              >
                {r.name}
              </button>
            ))}
            <button
              onClick={() => setShowInactive(v => !v)}
              className={cn(
                'ml-2 px-3 h-7 rounded-full text-xs font-medium transition-colors border',
                showInactive
                  ? 'bg-muted text-foreground border-border'
                  : 'border-dashed border-border text-muted-foreground hover:bg-accent'
              )}
            >
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </button>
          </div>

          {usersLoading && allUsers.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="size-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filterRole ? 'No users with this role yet.' : 'Invite your first team member.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === currentUser?.id}
                  canManage={can.manageUsers}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Invite modal
// ---------------------------------------------------------------------------
function InviteModal({ onClose }: { onClose: () => void }) {
  const { inviteUser, roles } = useIssueStore()
  const [form, setForm] = useState({ name: '', email: '', role: 'staff', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = form.name.trim() && form.email.trim() && form.password.trim().length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || loading) return
    setLoading(true)
    setError(null)
    try {
      await inviteUser(form.email.trim(), form.name.trim(), form.role, form.password)
      onClose()
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Invite User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBox>{error}</ErrorBox>}

        <Field label="Full Name">
          <input type="text" placeholder="Ahmad Razif" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
        </Field>

        <Field label="Email">
          <input type="email" placeholder="ahmad@restaurant.com" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
        </Field>

        <Field label="Role">
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
            {roles.map(r => (
              <option key={r.key} value={r.key}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
            ))}
          </select>
        </Field>

        <Field label="Temporary Password" hint="User should change this on first login.">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className={cn(inputCls, 'pr-10')}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <ModalActions onCancel={onClose} submit disabled={!valid} loading={loading} label="Send Invite" />
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------
const inputCls = 'w-full px-3 py-2 rounded-md border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">{children}</div>
  )
}

function Modal({ title, onClose, wide, children }: {
  title: string; onClose: () => void; wide?: boolean; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={cn(
        'w-full bg-background rounded-2xl border border-border shadow-xl p-6 max-h-[90vh] overflow-y-auto',
        wide ? 'max-w-2xl' : 'max-w-md',
      )}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="size-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ onCancel, onSubmit, submit, disabled, loading, label }: {
  onCancel: () => void
  onSubmit?: () => void
  submit?: boolean
  disabled?: boolean
  loading?: boolean
  label: string
}) {
  const enabled = !disabled && !loading
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onCancel}
        className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
        Cancel
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
