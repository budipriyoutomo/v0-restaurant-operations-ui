'use client'

import { useState } from 'react'
import { Bell, Search, ChevronDown, Settings, LogOut, User, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { outlets, notifications } from '@/lib/data'

const pageLabels: Record<string, string> = {
  dashboard: 'Executive Dashboard',
  tickets: 'Ticket Management',
  cmms: 'CMMS Dashboard',
  assets: 'Asset Management',
  finance: 'Finance Workflow',
  qa: 'QA / PQNC',
  guest: 'Guest Service',
  it: 'IT Support',
  analytics: 'Analytics',
  reports: 'Reports',
  settings: 'Settings',
  notifications: 'Notification Center',
}

interface TopNavProps {
  currentPage: string
  sidebarCollapsed: boolean
}

export function TopNav({ currentPage }: TopNavProps) {
  const [outletOpen, setOutletOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [selectedOutlet, setSelectedOutlet] = useState(outlets[0])
  const [darkMode, setDarkMode] = useState(false)
  const unreadCount = notifications.filter((n) => !n.read).length

  const toggleDark = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="h-12 flex items-center gap-3 px-4 border-b border-border bg-background flex-shrink-0 relative z-20">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-foreground truncate">{pageLabels[currentPage] ?? 'Dashboard'}</h1>
      </div>

      {/* Global search */}
      <button className="hidden sm:flex items-center gap-2 px-3 h-7 rounded-md border border-border bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors w-48">
        <Search className="size-3 flex-shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] bg-background border border-border rounded px-1">⌘K</kbd>
      </button>

      {/* Outlet switcher */}
      <div className="relative">
        <button
          onClick={() => { setOutletOpen(!outletOpen); setNotifOpen(false); setProfileOpen(false) }}
          className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-border bg-muted text-xs font-medium hover:bg-accent transition-colors"
        >
          <span className={cn(
            'size-1.5 rounded-full flex-shrink-0',
            selectedOutlet.status === 'operational' ? 'bg-success' :
            selectedOutlet.status === 'warning' ? 'bg-warning' : 'bg-destructive'
          )} />
          <span className="max-w-28 truncate">{selectedOutlet.name}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
        {outletOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Select Outlet</p>
            {outlets.map((outlet) => (
              <button
                key={outlet.id}
                onClick={() => { setSelectedOutlet(outlet); setOutletOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors',
                  selectedOutlet.id === outlet.id && 'bg-accent'
                )}
              >
                <span className={cn(
                  'size-1.5 rounded-full flex-shrink-0',
                  outlet.status === 'operational' ? 'bg-success' :
                  outlet.status === 'warning' ? 'bg-warning' : 'bg-destructive'
                )} />
                <span>{outlet.name}</span>
                <span className="ml-auto text-muted-foreground font-mono">{outlet.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Realtime indicator */}
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-success font-medium">
        <span className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
          <span className="relative inline-flex rounded-full size-2 bg-success" />
        </span>
        Live
      </div>

      {/* Dark mode */}
      <button
        onClick={toggleDark}
        className="size-7 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors"
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(!notifOpen); setOutletOpen(false); setProfileOpen(false) }}
          className="relative size-7 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell className="size-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-destructive text-[9px] text-white font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <span className="text-sm font-semibold">Notifications</span>
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {notifications.map((n) => (
                <div key={n.id} className={cn('px-3 py-2.5 hover:bg-accent transition-colors', !n.read && 'bg-primary/5')}>
                  <div className="flex items-start gap-2">
                    <span className={cn(
                      'mt-0.5 size-1.5 rounded-full flex-shrink-0',
                      n.type === 'critical' ? 'bg-destructive' :
                      n.type === 'warning' ? 'bg-warning' :
                      n.type === 'success' ? 'bg-success' : 'bg-primary'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User profile */}
      <div className="relative">
        <button
          onClick={() => { setProfileOpen(!profileOpen); setOutletOpen(false); setNotifOpen(false) }}
          className="flex items-center gap-1.5 hover:bg-accent rounded-md px-1.5 py-1 transition-colors"
        >
          <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
            MA
          </div>
          <ChevronDown className="size-3 text-muted-foreground hidden sm:block" />
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold">Mohd Azri</p>
              <p className="text-[11px] text-muted-foreground">Operations Manager</p>
            </div>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <User className="size-3.5" /> Profile
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="size-3.5" /> Settings
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-destructive transition-colors">
              <LogOut className="size-3.5" /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
