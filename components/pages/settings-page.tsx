'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Bell, Shield, RefreshCw, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api-client'

interface AppPreferences {
  darkMode: boolean
  slaAlerts: boolean
  approvalReminders: boolean
  autoRefresh: boolean
  compactSidebar: boolean
}

const DEFAULT_PREFS: AppPreferences = {
  darkMode:          false,
  slaAlerts:         true,
  approvalReminders: true,
  autoRefresh:       false,
  compactSidebar:    false,
}

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
