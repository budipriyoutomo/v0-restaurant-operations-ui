'use client'

import { useState } from 'react'
import { Loader2, Eye, EyeOff, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { navigate } from '@/lib/use-route'
import { resetTokenFrom, validateNewPassword, type NewPasswordForm } from '@/lib/password'
import { passwordApi } from '@/lib/password-api'
import { apiStatus } from '@/lib/api-client'
import { useIssueStore } from '@/lib/store'

// /reset-password?token=… — opened from the "forgot password" email. Public:
// rendered before the session check, so it works signed in or out.
export function ResetPasswordPage() {
  const { t, locale } = useT()
  const [token] = useState(() => (typeof window === 'undefined' ? null : resetTokenFrom(window.location.search)))
  const [form, setForm] = useState<NewPasswordForm>({ next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const errors = validateNewPassword(form, locale)
  const shown = touched ? errors : {}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!token || Object.keys(errors).length || loading) return
    setLoading(true)
    setError(null)
    try {
      await passwordApi.resetWithToken(token, form.next)
      useIssueStore.getState().logout()        // every session of that user was just signed out
      setDone(true)
    } catch (err) {
      const code = apiStatus(err)
      setError(code === 400 ? t('password.linkExpired') : code === 429 ? t('login.tooMany') : t('password.forgotFailed'))
    } finally {
      setLoading(false)
    }
  }

  const toLogin = (
    <button type="button" onClick={() => navigate('/', { replace: true })}
      className="w-full h-11 px-4 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90">
      {t('password.signIn')}
    </button>
  )

  const inputCls = 'w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex size-14 rounded-2xl bg-primary items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Utensils className="size-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('password.resetPageTitle')}</h1>
        </div>

        {!token ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{t('password.linkInvalid')}</div>
            {toLogin}
          </div>
        ) : done ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-sm" role="status">{t('password.resetSuccess')}</div>
            {toLogin}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
            )}
            {([['next', t('password.new')], ['confirm', t('password.confirm')]] as const).map(([key, label]) => (
              <div key={key}>
                <label htmlFor={`reset-${key}`} className="block text-sm font-semibold mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    id={`reset-${key}`}
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    aria-invalid={!!shown[key]}
                    className={cn(inputCls, key === 'next' && 'pr-10')}
                  />
                  {key === 'next' && (
                    <button type="button" onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  )}
                </div>
                {shown[key] && <p className="text-xs text-destructive mt-1">{shown[key]}</p>}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{t('password.minLength')}</p>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 px-4 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : t('password.change')}
            </button>
            <button type="button" onClick={() => navigate('/', { replace: true })}
              className="w-full text-center text-xs font-medium text-primary hover:underline">
              {t('password.backToLogin')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
