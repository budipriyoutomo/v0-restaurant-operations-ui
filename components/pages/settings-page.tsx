'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Bell, Shield, RefreshCw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'

interface AppPreferences {
  darkMode: boolean
  slaAlerts: boolean
  approvalReminders: boolean
  autoRefresh: boolean
  compactSidebar: boolean
}

const PREFS_KEY = 'restaurantops_prefs'

function loadPrefs(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...defaultPrefs(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return defaultPrefs()
}

function defaultPrefs(): AppPreferences {
  return {
    darkMode:          document.documentElement.classList.contains('dark'),
    slaAlerts:         true,
    approvalReminders: true,
    autoRefresh:       false,
    compactSidebar:    false,
  }
}

function savePrefs(prefs: AppPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
        value ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span className={cn(
        'inline-block size-4 rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-4' : 'translate-x-0.5'
      )} />
    </button>
  )
}

export function SettingsPage() {
  const { currentUser, loadAll, isLoading } = useIssueStore()
  const [prefs, setPrefs] = useState<AppPreferences>(defaultPrefs)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPrefs(loadPrefs())
  }, [])

  const update = (patch: Partial<AppPreferences>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    savePrefs(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)

    if ('darkMode' in patch) {
      document.documentElement.classList.toggle('dark', patch.darkMode)
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrator', manager: 'Manager', staff: 'Staff',
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Application preferences and account details</p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-success text-xs font-medium">
            <Check className="size-3.5" /> Saved
          </div>
        )}
      </div>

      {/* Profile */}
      <Section title="Your Profile" icon={<Shield className="size-4" />}>
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
          <div className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold flex-shrink-0">
            {currentUser?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{currentUser?.name ?? '—'}</p>
            <p className="text-sm text-muted-foreground truncate">{currentUser?.email ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {ROLE_LABELS[currentUser?.role ?? ''] ?? currentUser?.role ?? '—'}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground px-1">
          Contact your administrator to change your name, email, or role.
        </p>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" icon={<Sun className="size-4" />}>
        <SettingRow
          label="Dark Mode"
          description="Switch to a dark color scheme"
          control={<Toggle value={prefs.darkMode} onChange={v => update({ darkMode: v })} />}
        />
        <SettingRow
          label="Compact Sidebar"
          description="Collapse sidebar by default on load"
          control={<Toggle value={prefs.compactSidebar} onChange={v => update({ compactSidebar: v })} />}
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={<Bell className="size-4" />}>
        <SettingRow
          label="SLA Breach Alerts"
          description="Show alert banner when issues breach SLA"
          control={<Toggle value={prefs.slaAlerts} onChange={v => update({ slaAlerts: v })} />}
        />
        <SettingRow
          label="Approval Reminders"
          description="Highlight pending approvals in sidebar badge"
          control={<Toggle value={prefs.approvalReminders} onChange={v => update({ approvalReminders: v })} />}
        />
      </Section>

      {/* Data */}
      <Section title="Data & Sync" icon={<RefreshCw className="size-4" />}>
        <SettingRow
          label="Auto-refresh"
          description="Reload data every 5 minutes in background (not yet implemented)"
          control={<Toggle value={prefs.autoRefresh} onChange={v => update({ autoRefresh: v })} />}
        />
        <div className="px-1 pt-2">
          <button
            onClick={() => loadAll()}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium transition-colors',
              isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent'
            )}
          >
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
            Refresh All Data Now
          </button>
        </div>
      </Section>

      {/* About */}
      <Section title="About" icon={<Shield className="size-4" />}>
        <div className="space-y-2 text-xs text-muted-foreground px-1">
          <div className="flex justify-between">
            <span>Application</span>
            <span className="font-medium text-foreground">RestaurantOps</span>
          </div>
          <div className="flex justify-between">
            <span>Stack</span>
            <span className="font-medium text-foreground">Next.js 16 + FastAPI + PostgreSQL</span>
          </div>
          <div className="flex justify-between">
            <span>Environment</span>
            <span className="font-medium text-foreground">{typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'Development' : 'Production'}</span>
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/20">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

function SettingRow({ label, description, control }: {
  label: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-1 py-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {control}
    </div>
  )
}
