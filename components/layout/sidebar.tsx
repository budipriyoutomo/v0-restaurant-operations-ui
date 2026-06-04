'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Ticket,
  Wrench,
  Package,
  DollarSign,
  ClipboardCheck,
  MessageSquareWarning,
  Monitor,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Utensils,
  Wifi,
  Database,
} from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'main' },
  { id: 'tickets', label: 'Tickets', icon: Ticket, group: 'main', badge: 14 },
  { id: 'cmms', label: 'CMMS', icon: Wrench, group: 'main' },
  { id: 'assets', label: 'Assets', icon: Package, group: 'main' },
  { id: 'finance', label: 'Finance', icon: DollarSign, group: 'operations' },
  { id: 'qa', label: 'QA / PQNC', icon: ClipboardCheck, group: 'operations' },
  { id: 'guest', label: 'Guest Service', icon: MessageSquareWarning, group: 'operations' },
  { id: 'it', label: 'IT Support', icon: Monitor, group: 'operations' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'insights' },
  { id: 'reports', label: 'Reports', icon: FileText, group: 'insights' },
  { id: 'master-data', label: 'Master Data', icon: Database, group: 'system' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'system' },
  { id: 'notifications', label: 'Notifications', icon: Wifi, group: 'system' },
]

const groups: { id: string; label: string }[] = [
  { id: 'main', label: 'Operations' },
  { id: 'operations', label: 'Modules' },
  { id: 'insights', label: 'Insights' },
  { id: 'system', label: 'System' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  currentPage: string
  onNavigate: (page: string) => void
}

export function Sidebar({ collapsed, onToggle, currentPage, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out flex-shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center gap-2.5 px-3 py-4 border-b border-border', collapsed && 'justify-center px-0')}>
        <div className="flex-shrink-0 size-7 rounded-lg bg-primary flex items-center justify-center">
          <Utensils className="size-3.5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-none truncate">RestaurantOps</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Enterprise Platform</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {groups.map((group) => {
          const groupItems = navItems.filter((item) => item.group === group.id)
          return (
            <div key={group.id} className="mb-1">
              {!collapsed && (
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
              )}
              {groupItems.map((item) => {
                const Icon = item.icon
                const active = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors relative group',
                      collapsed && 'justify-center px-0',
                      active
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                    )}
                    <Icon className={cn('flex-shrink-0', collapsed ? 'size-4.5' : 'size-4')} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 z-10 size-6 rounded-full border border-border bg-background flex items-center justify-center shadow-sm hover:bg-accent transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>
    </aside>
  )
}
