'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  AlertCircle,
  CheckSquare,
  CheckCircle2,
  Wrench,
  Shield,
  ShoppingCart,
  BookOpen,
  Megaphone,
  MessageSquareWarning,
  Monitor,
  Package,
  BarChart3,
  FileText,
  Database,
  Users,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Utensils,
} from 'lucide-react'

const navItems = [
  // OPERATIONS - Core workflow
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, group: 'operations' },
  { id: 'issues', label: 'Issues', icon: AlertCircle, group: 'operations', badge: 14 },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, group: 'operations', badge: 8 },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2, group: 'operations', badge: 3 },
  
  // OPERATIONS MODULES - Execution domains
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, group: 'modules' },
  { id: 'qa', label: 'QA & Compliance', icon: Shield, group: 'modules' },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart, group: 'modules' },
  { id: 'training', label: 'Training', icon: BookOpen, group: 'modules' },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, group: 'modules' },
  { id: 'guest-service', label: 'Guest Service', icon: MessageSquareWarning, group: 'modules' },
  { id: 'it-support', label: 'IT Support', icon: Monitor, group: 'modules' },
  { id: 'assets', label: 'Assets', icon: Package, group: 'modules' },
  
  // INSIGHTS - Analytics & reporting
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'insights' },
  { id: 'reports', label: 'Reports', icon: FileText, group: 'insights' },
  
  // SYSTEM - Configuration & admin
  { id: 'master-data', label: 'Master Data', icon: Database, group: 'system' },
  { id: 'users', label: 'Users & Roles', icon: Users, group: 'system' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'system' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'system' },
]

const groups: { id: string; label: string }[] = [
  { id: 'operations', label: 'Operations' },
  { id: 'modules', label: 'Operations Modules' },
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
