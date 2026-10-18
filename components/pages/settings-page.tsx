'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Check, Loader2, Mail, MessageCircle, Send, Languages, CalendarDays, KeyRound } from 'lucide-react'
import { hasPermission } from '@/lib/access'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api, apiErrorMessage } from '@/lib/api-client'
import { useIssueStore } from '@/lib/store'
import { LOCALES, normalizeLocale, useT } from '@/lib/i18n'
import { validateChangePassword, type ChangePasswordForm } from '@/lib/password'
import { passwordApi } from '@/lib/password-api'
import type { User } from '@/lib/types'
import { PageHeader } from '@/components/shared/page-header'
import { useTheme } from 'next-themes'
import { ListSkeleton } from '@/components/shared/skeleton'
import { InstallAppGroup } from '@/components/shared/install-app'

interface AppPreferences {
  darkMode: boolean
  slaAlerts: boolean
  approvalReminders: boolean
  autoRefresh: boolean
  compactSidebar: boolean
  // Email notifications — keys read by the backend (notification_service.EMAIL_EVENT_PREFS).
  // Email is only sent when the server has SMTP configured.
  emailApprovalPending: boolean
  emailApprovalEscalated: boolean
  emailApprovalDecided: boolean
  emailWorkOrderAssigned: boolean
  // WhatsApp (Todo-Pilot §4) — keys read by whatsapp_service.WA_EVENT_PREFS.
  // Opt-in: nothing is sent until waEnabled is on and a number is saved.
  waEnabled: boolean
  waApprovalPending: boolean
  waApprovalEscalated: boolean
  waApprovalDecided: boolean
  waWorkOrderAssigned: boolean
  waIssueReadyToClose: boolean
  waTemperatureExcursion: boolean
  waOpsMissed: boolean
  waOpsDueSoon: boolean
  // GM outlet summary (Todo-Pilot §25) — opt-in, read by outlet_comparison_service.
  digestDaily: boolean
  digestWeekly: boolean
}

const DEFAULT_PREFS: AppPreferences = {
  darkMode:          false,
  slaAlerts:         true,
  approvalReminders: true,
  autoRefresh:       false,
  compactSidebar:    false,
  emailApprovalPending:   true,
  emailApprovalEscalated: true,
  emailApprovalDecided:   true,
  emailWorkOrderAssigned: true,
  waEnabled:           false,
  waApprovalPending:   true,
  waApprovalEscalated: true,
  waApprovalDecided:   true,
  waWorkOrderAssigned: true,
  waIssueReadyToClose: true,
  waTemperatureExcursion: true,
  waOpsMissed: true,
  waOpsDueSoon: true,
  digestDaily:         false,
  digestWeekly:        false,
}

// Label: t('settings.ev.<ev>'), description: t('settings.wa.<ev>') / t('settings.email.<ev>').
const WA_EVENTS: { key: keyof AppPreferences; ev: 'approvalPending' | 'approvalEscalated' | 'approvalDecided' | 'woAssigned' | 'readyToClose' | 'tempExcursion' | 'opsMissed' | 'opsDueSoon' }[] = [
  { key: 'waApprovalPending',   ev: 'approvalPending' },
  { key: 'waApprovalEscalated', ev: 'approvalEscalated' },
  { key: 'waApprovalDecided',   ev: 'approvalDecided' },
  { key: 'waWorkOrderAssigned', ev: 'woAssigned' },
  { key: 'waIssueReadyToClose', ev: 'readyToClose' },
  { key: 'waTemperatureExcursion', ev: 'tempExcursion' },   // Todo-Ops-Checklist Fase 2
  { key: 'waOpsMissed',  ev: 'opsMissed' },     // Fase 3
  { key: 'waOpsDueSoon', ev: 'opsDueSoon' },    // Fase 3
]
const EMAIL_EVENTS: { key: keyof AppPreferences; ev: 'approvalPending' | 'approvalEscalated' | 'approvalDecided' | 'woAssigned' }[] = [
  { key: 'emailApprovalPending',   ev: 'approvalPending' },
  { key: 'emailApprovalEscalated', ev: 'approvalEscalated' },
  { key: 'emailApprovalDecided',   ev: 'approvalDecided' },
  { key: 'emailWorkOrderAssigned', ev: 'woAssigned' },
]

export function SettingsPage() {
  const { t, locale } = useT()
  const setLocale = useIssueStore((s) => s.setLocale)
  const canDigest = hasPermission(useIssueStore((s) => s.currentUser), 'dashboard')
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // The theme lives in next-themes (also the top bar menu), on this device.
  // The old account pref `darkMode` is no longer applied: it overwrote that choice.
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  // Load preferences from API on mount
  useEffect(() => {
    api.get<Partial<AppPreferences>>('/api/auth/me/preferences')
      .then(remote => {
        const merged = { ...DEFAULT_PREFS, ...remote }
        setPrefs(merged)
      })
      .catch(() => { /* defaults stay */ })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (next: AppPreferences) => {
    setSaving(true)
    setSaved(false)
    try {
      await api.patch('/api/auth/me/preferences', { preferences: next })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // non-critical — prefs are applied locally regardless
    } finally {
      setSaving(false)
    }
  }, [])

  const toggle = (key: keyof AppPreferences) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    save(next)
  }

  if (loading) {
    return (
      <ListSkeleton rows={4} />
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.subtitle')}
        actions={<>
          {saving ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : saved ? (
          <span className="flex items-center gap-1 text-xs text-success font-medium">
            <Check className="size-3.5" /> {t('common.saved')}
          </span>
        ) : null}
      </>}
      />

      <ProfileCard />

      <InstallAppGroup />

      <SettingGroup label={t('settings.language')}>
        {/* Phones: the picker goes under its label, full width */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 gap-3 sm:gap-4">
          <div className="flex items-start gap-3">
            <Languages className="size-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <label htmlFor="settings-language" className="text-sm font-medium">{t('settings.languageLabel')}</label>
              <p className="text-xs text-muted-foreground mt-0.5">{t('settings.languageHint')}</p>
            </div>
          </div>
          <select
            id="settings-language"
            value={locale}
            onChange={(e) => setLocale(normalizeLocale(e.target.value))}
            className="w-full sm:w-auto h-10 sm:h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </SettingGroup>

      <PasswordGroup />

      <SettingGroup label={t('settings.appearance')}>
        <ToggleRow
          icon={dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
          label={t('settings.darkMode')}
          description={t('settings.darkModeHint')}
          checked={dark}
          onChange={() => setTheme(dark ? 'light' : 'dark')}
        />
      </SettingGroup>

      <SettingGroup label={t('settings.emailGroup')}>
        {EMAIL_EVENTS.map(({ key, ev }) => (
          <ToggleRow
            key={key}
            icon={<Mail className="size-4" />}
            label={t(`settings.ev.${ev}`)}
            description={t(`settings.email.${ev}`)}
            checked={prefs[key] as boolean}
            onChange={() => toggle(key)}
          />
        ))}
      </SettingGroup>

      <WhatsAppGroup prefs={prefs} toggle={toggle} />

      {canDigest && (
        <SettingGroup label={t('settings.digestGroup')}>
          <ToggleRow icon={<CalendarDays className="size-4" />} label={t('settings.digestDaily')}
            description={t('settings.digestDailyHint')} checked={prefs.digestDaily} onChange={() => toggle('digestDaily')} />
          <ToggleRow icon={<CalendarDays className="size-4" />} label={t('settings.digestWeekly')}
            description={t('settings.digestWeeklyHint')} checked={prefs.digestWeekly} onChange={() => toggle('digestWeekly')} />
        </SettingGroup>
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// WhatsApp — number, opt-in and per-event switches (Todo-Pilot §4)
// ---------------------------------------------------------------------------
function WhatsAppGroup({ prefs, toggle }: { prefs: AppPreferences; toggle: (key: keyof AppPreferences) => void }) {
  const { t } = useT()
  const currentUser = useIssueStore((s) => s.currentUser)
  const savedNumber = currentUser?.whatsapp_number ?? ''
  const [number, setNumber] = useState(savedNumber)
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)

  useEffect(() => {
    api.get<{ enabled: boolean }>('/api/auth/whatsapp/status')
      .then((r) => setServerEnabled(r.enabled))
      .catch(() => setServerEnabled(null))
  }, [])

  const saveNumber = async () => {
    setBusy('save')
    try {
      const user = await api.patch<User>('/api/auth/me/whatsapp', { number: number.trim() })
      useIssueStore.setState({ currentUser: user })
      setNumber(user.whatsapp_number ?? '')
      toast.success(user.whatsapp_number ? t('settings.wa.numberSaved', { number: user.whatsapp_number }) : t('settings.wa.numberRemoved'))
    } catch (e) {
      toast.error(apiErrorMessage(e, t('settings.wa.saveFailed')))
    } finally {
      setBusy(null)
    }
  }

  const sendTest = async () => {
    setBusy('test')
    try {
      await api.post('/api/auth/me/whatsapp/test', {})
      toast.success(t('settings.wa.testQueued'))
    } catch (e) {
      toast.error(apiErrorMessage(e, t('settings.wa.testFailed')))
    } finally {
      setBusy(null)
    }
  }

  const hasNumber = !!savedNumber
  const dirty = number.trim() !== savedNumber

  return (
    <SettingGroup label="WhatsApp">
      <div className="px-4 py-3.5 space-y-2">
        {serverEnabled === false && (
          <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md px-2.5 py-1.5">
            {t('settings.wa.notConfigured')}
          </p>
        )}
        <label htmlFor="settings-wa-number" className="text-sm font-medium flex items-center gap-2">
          <MessageCircle className="size-4 text-muted-foreground" /> {t('settings.wa.number')}
        </label>
        <div className="flex gap-2">
          <input
            id="settings-wa-number"
            type="tel"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="0812 3456 7890"
            className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={saveNumber}
            disabled={!dirty || busy !== null}
            className="px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {busy === 'save' ? t('common.saving') : t('common.save')}
          </button>
          <button
            onClick={sendTest}
            disabled={!hasNumber || dirty || busy !== null || serverEnabled === false}
            title={t('settings.wa.testTitle')}
            className="flex items-center gap-1 px-3 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            <Send className="size-3.5" /> {busy === 'test' ? t('settings.wa.sending') : t('settings.wa.test')}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('settings.wa.numberHint')}
        </p>
      </div>
      <ToggleRow
        icon={<MessageCircle className="size-4" />}
        label={t('settings.wa.enable')}
        description={hasNumber ? t('settings.wa.enableHint') : t('settings.wa.saveFirst')}
        checked={prefs.waEnabled && hasNumber}
        onChange={() => hasNumber && toggle('waEnabled')}
      />
      {prefs.waEnabled && hasNumber && WA_EVENTS.map((ev) => (
        <ToggleRow
          key={ev.key}
          icon={<MessageCircle className="size-4" />}
          label={t(`settings.ev.${ev.ev}`)}
          description={t(`settings.wa.${ev.ev}`)}
          checked={prefs[ev.key] as boolean}
          onChange={() => toggle(ev.key)}
        />
      ))}
    </SettingGroup>
  )
}

// ---------------------------------------------------------------------------
// Security — change my own password
// ---------------------------------------------------------------------------
const EMPTY_PW: ChangePasswordForm = { current: '', next: '', confirm: '' }

function PasswordGroup() {
  const { t, locale } = useT()
  const [form, setForm] = useState<ChangePasswordForm>(EMPTY_PW)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const errors = validateChangePassword(form, locale)
  const shown = touched ? errors : {}

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(errors).length || busy) return
    setBusy(true)
    try {
      await passwordApi.changeOwn(form.current, form.next)
      setForm(EMPTY_PW)
      setTouched(false)
      toast.success(t('password.changed'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t('password.changeFailed')))
    } finally {
      setBusy(false)
    }
  }

  const fields: { key: keyof ChangePasswordForm; label: string; autoComplete: string }[] = [
    { key: 'current', label: t('password.current'), autoComplete: 'current-password' },
    { key: 'next',    label: t('password.new'),     autoComplete: 'new-password' },
    { key: 'confirm', label: t('password.confirm'), autoComplete: 'new-password' },
  ]

  return (
    <SettingGroup label={t('password.group')}>
      <form onSubmit={submit} className="px-4 py-3.5 space-y-3" noValidate>
        <p className="text-sm font-medium flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" /> {t('password.change')}
        </p>
        {fields.map(({ key, label, autoComplete }) => (
          <label key={key} className="block">
            <span className="block text-xs font-medium mb-1">{label}</span>
            <input
              type="password"
              autoComplete={autoComplete}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              aria-invalid={!!shown[key]}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {shown[key] && <span className="block text-xs text-destructive mt-1">{shown[key]}</span>}
          </label>
        ))}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t('password.hint')}</p>
          <button
            type="submit"
            disabled={busy}
            className="px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex-shrink-0"
          >
            {busy ? t('common.saving') : t('password.change')}
          </button>
        </div>
      </form>
    </SettingGroup>
  )
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="rounded-2xl border border-border bg-card overflow-hidden">
      <h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-foreground">{label}</h2>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

/** Who is signed in — the top bar's "Profile" lands here. */
function ProfileCard() {
  const { t } = useT()
  const user = useIssueStore((s) => s.currentUser)
  if (!user) return null
  const name = user.name ?? ''
  const initials = name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <section aria-label={t('settings.profile')} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
      <span className="size-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold flex-shrink-0" aria-hidden="true">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-base truncate">{name}</p>
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {[user.role_name, user.company_name].filter(Boolean).join(' · ')}
        </p>
      </div>
    </section>
  )
}

function ToggleRow({
  icon, label, description, checked, onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {/* The button is a 44px tap area; the track inside is the visible switch */}
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className="flex-shrink-0 -m-2.5 p-2.5 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className={cn('flex h-6 w-11 rounded-full border-2 border-transparent transition-colors', checked ? 'bg-primary' : 'bg-muted')}>
          <span
            className={cn(
              'pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform',
              checked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </span>
      </button>
    </div>
  )
}
