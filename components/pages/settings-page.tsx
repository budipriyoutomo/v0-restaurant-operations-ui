'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Bell, Shield, RefreshCw, Check, Loader2, Mail, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api, apiErrorMessage } from '@/lib/api-client'
import { useIssueStore } from '@/lib/store'
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
}

const WA_EVENTS: { key: keyof AppPreferences; label: string; description: string }[] = [
  { key: 'waApprovalPending',   label: 'Approval waiting for you', description: 'An approval step needs my decision' },
  { key: 'waApprovalEscalated', label: 'Approval escalated',       description: 'An approval is stuck and escalated (admins)' },
  { key: 'waApprovalDecided',   label: 'My request decided',       description: 'A request I made is approved or rejected' },
  { key: 'waWorkOrderAssigned', label: 'Work order assigned',      description: 'A work order is assigned to me' },
  { key: 'waIssueReadyToClose', label: 'Issue ready to close',     description: 'All work under an issue in my outlet is done (managers)' },
]

function applyDarkMode(dark: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', dark)
  }
}

export function SettingsPage() {
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
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Application preferences — saved to your account</p>
        </div>
        {saving ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : saved ? (
          <span className="flex items-center gap-1 text-xs text-success font-medium">
            <Check className="size-3.5" /> Saved
          </span>
        ) : null}
      </div>

      <SettingGroup label="Appearance">
        <ToggleRow
          icon={prefs.darkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
          label="Dark Mode"
          description="Switch between light and dark theme"
          checked={prefs.darkMode}
          onChange={() => toggle('darkMode')}
        />
      </SettingGroup>

      <SettingGroup label="Notifications">
        <ToggleRow
          icon={<Bell className="size-4" />}
          label="SLA Breach Alerts"
          description="Highlight overdue Issues with visual indicators"
          checked={prefs.slaAlerts}
          onChange={() => toggle('slaAlerts')}
        />
        <ToggleRow
          icon={<Bell className="size-4" />}
          label="Approval Reminders"
          description="Show pending approval count in the sidebar badge"
          checked={prefs.approvalReminders}
          onChange={() => toggle('approvalReminders')}
        />
      </SettingGroup>

      <SettingGroup label="Email">
        <ToggleRow
          icon={<Mail className="size-4" />}
          label="Approval waiting for you"
          description="Email me when an approval step needs my decision"
          checked={prefs.emailApprovalPending}
          onChange={() => toggle('emailApprovalPending')}
        />
        <ToggleRow
          icon={<Mail className="size-4" />}
          label="Approval escalated"
          description="Email me when an approval is stuck and escalated (admins)"
          checked={prefs.emailApprovalEscalated}
          onChange={() => toggle('emailApprovalEscalated')}
        />
        <ToggleRow
          icon={<Mail className="size-4" />}
          label="My request decided"
          description="Email me when a request I made is approved or rejected"
          checked={prefs.emailApprovalDecided}
          onChange={() => toggle('emailApprovalDecided')}
        />
        <ToggleRow
          icon={<Mail className="size-4" />}
          label="Work order assigned"
          description="Email me when a work order is assigned to me"
          checked={prefs.emailWorkOrderAssigned}
          onChange={() => toggle('emailWorkOrderAssigned')}
        />
      </SettingGroup>

      <WhatsAppGroup prefs={prefs} toggle={toggle} />

      <SettingGroup label="System">
        <ToggleRow
          icon={<RefreshCw className="size-4" />}
          label="Auto-Refresh"
          description="Automatically reload data every 5 minutes"
          checked={prefs.autoRefresh}
          onChange={() => toggle('autoRefresh')}
        />
        <ToggleRow
          icon={<Shield className="size-4" />}
          label="Compact Sidebar"
          description="Start with the sidebar collapsed by default"
          checked={prefs.compactSidebar}
          onChange={() => toggle('compactSidebar')}
        />
      </SettingGroup>
    </div>
  )
}

// ---------------------------------------------------------------------------
// WhatsApp — number, opt-in and per-event switches (Todo-Pilot §4)
// ---------------------------------------------------------------------------
function WhatsAppGroup({ prefs, toggle }: { prefs: AppPreferences; toggle: (key: keyof AppPreferences) => void }) {
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
      toast.success(user.whatsapp_number ? `WhatsApp number saved: +${user.whatsapp_number}` : 'WhatsApp number removed.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save the number.'))
    } finally {
      setBusy(null)
    }
  }

  const sendTest = async () => {
    setBusy('test')
    try {
      await api.post('/api/auth/me/whatsapp/test', {})
      toast.success('Test message queued — check your WhatsApp.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send a test message.'))
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
            WhatsApp is not configured on the server yet — you can save your settings now; messages start once an admin connects WuzAPI.
          </p>
        )}
        <label className="text-sm font-medium flex items-center gap-2">
          <MessageCircle className="size-4 text-muted-foreground" /> WhatsApp number
        </label>
        <div className="flex gap-2">
          <input
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
            {busy === 'save' ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={sendTest}
            disabled={!hasNumber || dirty || busy !== null || serverEnabled === false}
            title="Send a test message to this number"
            className="flex items-center gap-1 px-3 h-9 rounded-md border border-border text-xs font-semibold hover:bg-muted/50 disabled:opacity-50"
          >
            <Send className="size-3.5" /> {busy === 'test' ? 'Sending…' : 'Test'}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Indonesian numbers can start with 0; use +country code for others. Leave empty and save to remove.
        </p>
      </div>
      <ToggleRow
        icon={<MessageCircle className="size-4" />}
        label="Send notifications to WhatsApp"
        description={hasNumber ? 'Off by default — turn on to receive the events below' : 'Save a number first'}
        checked={prefs.waEnabled && hasNumber}
        onChange={() => hasNumber && toggle('waEnabled')}
      />
      {prefs.waEnabled && hasNumber && WA_EVENTS.map((ev) => (
        <ToggleRow
          key={ev.key}
          icon={<MessageCircle className="size-4" />}
          label={ev.label}
          description={ev.description}
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
