'use client'

import { useState } from 'react'
import { Shield, Eye, EyeOff, Loader2, Trash2, ChevronDown, KeyRound, Store, MessageCircle, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { translate, useT } from '@/lib/i18n'
import { User } from '@/lib/types'
import { validateResetPassword } from '@/lib/password'
import { passwordApi } from '@/lib/password-api'
import { ErrorBox, Field, Modal, ModalActions, OutletChecklist, apiError, getInitials, inputCls, outletSummary, roleBadge } from './shared'

// ---------------------------------------------------------------------------
// User card
// ---------------------------------------------------------------------------
export function UserCard({ user, isCurrentUser, canManage }: { user: User; isCurrentUser: boolean; canManage: boolean }) {
  const { t } = useT()
  const { updateUser, deleteUser, roles, outlets } = useIssueStore()
  const [roleLoading, setRoleLoading]     = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [showDelete, setShowDelete]       = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showOutlets, setShowOutlets]     = useState(false)
  const [showWa, setShowWa]               = useState(false)
  const [showReset, setShowReset]         = useState(false)
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
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">{t('users.you')}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={cn('text-xs px-2 py-0.5 rounded-md font-semibold', roleBadge(user.role))}>
              {user.role_name}
            </span>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-md font-semibold',
              user.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
            )}>
              {user.is_active ? t('users.active') : t('users.inactive')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <Store className="size-3" />
            {outletSummary(user, outlets, t)}
            {user.outlet_ids.length > 0 && <span className="text-amber-700 dark:text-amber-400 font-medium">{t('users.custom')}</span>}
          </p>
          {user.whatsapp_number && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MessageCircle className="size-3" /> +{user.whatsapp_number}
            </p>
          )}
        </div>
        {user.role === 'admin' && (
          <Shield className="size-4 text-red-600 flex-shrink-0 mt-0.5" />
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
            placeholder={t('users.waPlaceholder')}
            aria-label={t('users.waNumber')}
            className="flex-1 h-9 px-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={handleSaveWa}
            disabled={waLoading}
            className="px-2 h-9 text-sm font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            {waLoading ? <Loader2 className="size-3 animate-spin" /> : t('common.save')}
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
              aria-label={t('users.changeRole')}
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
            title={t('users.waNumber')}
            aria-label={t('users.waNumber')}
            className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            <MessageCircle className="size-3.5" />
          </button>

          <button
            onClick={() => setShowOutlets(true)}
            title={t('users.outletAccess')}
            aria-label={t('users.outletAccess')}
            className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            <Store className="size-3.5" />
          </button>

          <button
            onClick={() => setShowReset(true)}
            title={t('password.reset')}
            aria-label={t('password.reset')}
            className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            <KeyRound className="size-3.5" />
          </button>

          <button
            onClick={handleToggleActive}
            disabled={toggleLoading}
            className={cn(
              'px-2 py-1 text-xs font-semibold rounded border transition-colors flex-shrink-0',
              user.is_active
                ? 'border-warning/40 text-warning hover:bg-warning/10'
                : 'border-success/40 text-success hover:bg-success/10',
              toggleLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {toggleLoading ? <Loader2 className="size-3 animate-spin" /> : user.is_active ? t('users.deactivate') : t('users.activate')}
          </button>

          <button
            onClick={() => setShowDelete(true)}
            aria-label={t('users.removeUser')}
            className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}

      {showDelete && (
        <div className="border-t border-border pt-2 space-y-2">
          <p className="text-xs text-muted-foreground">{t('users.removeConfirm', { name: user.name })}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDelete(false)}
              className="flex-1 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex-1 py-1 text-xs rounded bg-destructive text-destructive-foreground font-semibold flex items-center justify-center gap-1 hover:bg-destructive/90 transition-colors"
            >
              {deleteLoading ? <Loader2 className="size-3 animate-spin" /> : t('users.remove')}
            </button>
          </div>
        </div>
      )}

      {showOutlets && <UserOutletsModal user={user} onClose={() => setShowOutlets(false)} />}
      {showReset && <ResetPasswordModal user={user} onClose={() => setShowReset(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reset another user's password — generated (shown once) or chosen
// ---------------------------------------------------------------------------
export function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { t, locale } = useT()
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ generated: string | null } | null>(null)
  const [copied, setCopied] = useState(false)
  const invalid = validateResetPassword(password, locale)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (invalid || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await passwordApi.reset(user.id, password)
      setDone({ generated: res.password })
    } catch (err) {
      setError(apiError(err) || t('password.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked — the text is selectable */ }
  }

  return (
    <Modal title={t('password.resetTitle', { name: user.name })} onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm">{t('password.resetDone', { name: user.name })}</p>
          {done.generated && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{t('password.generated')}</p>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm font-mono select-all break-all">
                  {done.generated}
                </code>
                <button type="button" onClick={() => copy(done.generated!)}
                  className="flex items-center gap-1 px-3 rounded-md border border-border text-xs font-semibold hover:bg-accent">
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? t('password.copied') : t('password.copy')}
                </button>
              </div>
            </div>
          )}
          <ModalActions onCancel={onClose} onSubmit={onClose} label={t('password.done')} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}
          <Field label={t('password.newOptional')} hint={invalid ?? t('password.resetHint')}>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-invalid={!!invalid}
                className={cn(inputCls, 'pr-10')}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <ModalActions onCancel={onClose} submit disabled={!!invalid} loading={loading} label={t('password.reset')} />
        </form>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// User outlet override
// ---------------------------------------------------------------------------
export function UserOutletsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { t } = useT()
  const { updateUser, outlets, roles } = useIssueStore()
  const role = roles.find(r => r.key === user.role)
  const [custom, setCustom] = useState(user.outlet_ids.length > 0)
  const [selected, setSelected] = useState<string[]>(user.outlet_ids)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleDefault = !role ? '—'
    : role.all_outlets ? t('users.allOutlets')
    : outlets.filter(o => role.outlet_ids.includes(o.id)).map(o => o.name).join(', ') || t('users.noOutlets')

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
    <Modal title={t('users.outletAccessTitle', { name: user.name })} onClose={onClose}>
      <div className="space-y-4">
        {error && <ErrorBox>{error}</ErrorBox>}
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="radio" className="mt-1" checked={!custom} onChange={() => setCustom(false)} />
          <span>
            <span className="font-semibold">{t('users.followRole')}</span>
            <span className="block text-xs text-muted-foreground">{role?.name ?? user.role_name}: {roleDefault}</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="radio" className="mt-1" checked={custom} onChange={() => setCustom(true)} />
          <span>
            <span className="font-semibold">{t('users.customOutlets')}</span>
            <span className="block text-xs text-muted-foreground">{t('users.customHint')}</span>
          </span>
        </label>
        {custom && <OutletChecklist outlets={outlets} selected={selected} onChange={setSelected} />}
        <ModalActions onCancel={onClose} onSubmit={save} disabled={!valid} loading={saving} label={t('common.save')} />
      </div>
    </Modal>
  )
}
