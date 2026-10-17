'use client'

import { useState } from 'react'
import { Loader2, Eye, EyeOff, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LOCALES, useT } from '@/lib/i18n'
import { useIssueStore } from '@/lib/store'
import { passwordApi } from '@/lib/password-api'
import { apiStatus } from '@/lib/api-client'

export function LoginPage() {
  const { login, authLoading, authError, setLocale } = useIssueStore()
  const { t, locale } = useT()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [forgot, setForgot] = useState(false)

  const isValid = email.trim() && password.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || authLoading) return
    try {
      await login(email.trim(), password)
    } catch {
      // authError already set in store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex size-14 rounded-2xl bg-primary items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Utensils className="size-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">RestaurantOps</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('login.subtitle')}</p>
          <div className="mt-4 inline-flex gap-0.5 p-0.5 rounded-full bg-muted text-xs" role="group" aria-label={t('login.language')}>
            {LOCALES.map((l) => (
              <button
                key={l.value}
                type="button"
                aria-pressed={locale === l.value}
                onClick={() => setLocale(l.value)}
                className={cn('h-8 px-3 rounded-full font-medium transition-colors', locale === l.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {forgot ? <ForgotPasswordForm initialEmail={email} onBack={() => setForgot(false)} /> : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error */}
          {authError && (
            <div role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {authError.includes('Too many attempts') ? t('login.tooMany')
                : authError.includes('Invalid') ? t('login.invalid')
                : authError.includes('account is inactive') ? t('login.companyInactive')
                : authError}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="login-email" className="block text-sm font-semibold mb-1.5">{t('common.email')}</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={authLoading}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 disabled:opacity-60"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold mb-1.5">{t('login.password')}</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={authLoading}
                className="w-full min-h-10 px-3 py-2 pr-10 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 disabled:opacity-60"
              />
              <button
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="text-right -mt-2">
            <button type="button" onClick={() => setForgot(true)}
              className="text-xs font-medium text-primary hover:underline">
              {t('password.forgot')}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || authLoading}
            className={cn(
              'w-full h-11 flex items-center justify-center gap-2 px-4 rounded-lg font-semibold text-sm transition-colors',
              isValid && !authLoading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {authLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('login.signingIn')}
              </>
            ) : (
              t('login.signIn')
            )}
          </button>
        </form>
        )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t('login.contactAdmin')}
        </p>

        {/* Dev credentials hint — never in a production build (credential policy, DOC.md) */}
        {process.env.NODE_ENV !== 'production' && (
        <div className="mt-6 p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground/70 mb-2">{t('login.demoAccounts')}</p>
          {[
            { role: 'Admin', email: 'admin@restaurant.com', password: 'admin123' },
            { role: 'Manager', email: 'manager@restaurant.com', password: 'manager123' },
            { role: 'Staff', email: 'staff@restaurant.com', password: 'staff123' },
          ].map(({ role, email, password: pw }) => (
            <button
              key={email}
              type="button"
              onClick={() => { setEmail(email); setPassword(pw) }}
              className="w-full text-left hover:text-foreground transition-colors py-0.5"
            >
              <span className="font-medium">{role}</span> — {email} / {pw}
            </button>
          ))}
          <p className="text-muted-foreground/60 pt-1">{t('login.clickToFill')}</p>
        </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Forgot password — emails a one-time link (backend password_reset_service)
// ---------------------------------------------------------------------------
function ForgotPasswordForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const { t } = useT()
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || loading) return
    setLoading(true)
    setError(null)
    try {
      await passwordApi.forgot(email)
      setSentTo(email.trim())
    } catch (err) {
      setError(apiStatus(err) === 429 ? t('login.tooMany') : t('password.forgotFailed'))
    } finally {
      setLoading(false)
    }
  }

  const back = (
    <button type="button" onClick={onBack} className="w-full text-center text-xs font-medium text-primary hover:underline">
      {t('password.backToLogin')}
    </button>
  )

  if (sentTo) {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-sm" role="status">
          {t('password.forgotSent', { email: sentTo })}
        </div>
        {back}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('password.forgotTitle')}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t('password.forgotHint')}</p>
      </div>
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="forgot-email" className="block text-sm font-semibold mb-1.5">{t('common.email')}</label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full min-h-10 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={!valid || loading}
        className={cn(
          'w-full h-11 flex items-center justify-center gap-2 px-4 rounded-lg font-semibold text-sm transition-colors',
          valid && !loading ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {loading ? <><Loader2 className="size-4 animate-spin" />{t('password.sending')}</> : t('password.sendLink')}
      </button>
      {back}
    </form>
  )
}
