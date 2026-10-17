'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Check, Loader2, Mail, MessageCircle, Send, Languages, CalendarDays } from 'lucide-react'
import { hasPermission } from '@/lib/access'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api, apiErrorMessage } from '@/lib/api-client'
import { useIssueStore } from '@/lib/store'
import { LOCALES, normalizeLocale, useT } from '@/lib/i18n'
import type { User } from '@/lib/types'

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

function applyDarkMode(dark: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', dark)
  }
}

export function SettingsPage() {
  const { t, locale } = useT()
  const setLocale = useIssueStore((s) => s.setLocale)
  const canDigest = hasPermission(useIssueStore((s) => s.currentUser), 'dashboard')
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load preferences from API on mount
  useEffect(() => {
    api.get<Partial<AppPreferences>>('/api/auth/me/preferences')
      .then(remote => {
        const merged = { ...DEFAULT_PREFS, ...remote }
        setPrefs(merged)
        applyDarkMode(merged.darkMode)
      })
      .catch(() => {
        // fall back to current DOM state
        setPrefs(p => ({
          ...p,
          darkMode: typeof document !== 'undefined'
            ? document.documentElement.classList.contains('dark')
            : false,
        }))
      })
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
    if (key === 'darkMode') applyDarkMode(next.darkMode)
    save(next)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>
        {saving ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : saved ? (
          <span className="flex items-center gap-1 text-xs text-success font-medium">
            <Check className="size-3.5" /> {t('common.saved')}
          </span>
        ) : null}
      </div>

      <SettingGroup label={t('settings.language')}>
        <div className="flex items-center justify-between px-4 py-3.5 gap-4">
          <div className="flex items-start gap-3">
            <Languages className="size-4 mt-0.5 text-muted-foreground" />
            <div>
              <label htmlFor="settings-language" className="text-sm font-medium">{t('settings.languageLabel')}</label>
              <p className="text-xs text-muted-foreground mt-0.5">{t('settings.languageHint')}</p>
            </div>
          </div>
          <select
            id="settings-language"
            value={locale}
            onChange={(e) => setLocale(normalizeLocale(e.target.value))}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </SettingGroup>

      <SettingGroup label={t('settings.appearance')}>
        <ToggleRow
          icon={prefs.darkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
          label={t('settings.darkMode')}
          description={t('settings.darkModeHint')}
          checked={prefs.darkMode}
          onChange={() => toggle('darkMode')}
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
          <p className="text-xs text-amber-700 bg-amber-100/60 border border-amber-200 rounded-md px-2.5 py-1.5">
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
            className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={saveNumber}
            disabled={!dirty || busy !== null}
            className="px-3 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
          >
            {busy === 'save' ? t('common.saving') : t('common.save')}
          </button>
          <button
            onClick={sendTest}
            disabled={!hasNumber || dirty || busy !== null || serverEnabled === false}
            title={t('settings.wa.testTitle')}
            className="flex items-center gap-1 px-3 h-9 rounded-md border border-border text-xs font-semibold hover:bg-muted/50 disabled:opacity-50"
          >
            <Send className="size-3.5" /> {busy === 'test' ? t('settings.wa.sending') : t('settings.wa.test')}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
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

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
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
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={cn(
          'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}
