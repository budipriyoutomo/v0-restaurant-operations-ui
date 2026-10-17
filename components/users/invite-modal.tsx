'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { translate, useT } from '@/lib/i18n'
import { ErrorBox, Field, Modal, ModalActions, apiError, inputCls } from './shared'

// ---------------------------------------------------------------------------
// Invite modal
// ---------------------------------------------------------------------------
export function InviteModal({ onClose }: { onClose: () => void }) {
  const { t } = useT()
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
    <Modal title={t('users.invite')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBox>{error}</ErrorBox>}

        <Field label={t('users.fullName')}>
          <input type="text" placeholder="Ahmad Razif" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
        </Field>

        <Field label={t('common.email')}>
          <input type="email" placeholder="ahmad@restaurant.com" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
        </Field>

        <Field label={t('common.role')}>
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
            {roles.map(r => (
              <option key={r.key} value={r.key}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
            ))}
          </select>
        </Field>

        <Field label={t('users.tempPassword')} hint={t('users.tempPasswordHint')}>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder={t('users.minChars')}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className={cn(inputCls, 'pr-10')}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <ModalActions onCancel={onClose} submit disabled={!valid} loading={loading} label={t('users.sendInvite')} />
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------
