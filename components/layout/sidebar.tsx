'use client'

import { cn } from '@/lib/utils'
import { usePermissions } from '@/lib/permissions'
import { useT, type MessageKey } from '@/lib/i18n'
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
  Gauge,
  BarChart3,
  FileText,
  Database,
  Users,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Utensils,
  ListChecks,
  ClipboardList,
} from 'lucide-react'

interface NavItem {
  id: string               // page id; label = t('nav.<id>')
  icon: React.ElementType
  group: string
  badgeKey?: 'issues' | 'tasks' | 'approvals' | 'notifications'
}

const navItems: NavItem[] = [
  // OPERATIONS - Core workflow
  { id: 'my-work',     icon: ListChecks,      group: 'operations' },   // Todo-Pilot §19
  { id: 'dashboard',   icon: LayoutDashboard, group: 'operations' },
  { id: 'issues',      icon: AlertCircle,     group: 'operations', badgeKey: 'issues' },
  { id: 'tasks',       icon: CheckSquare,     group: 'operations', badgeKey: 'tasks' },
  { id: 'approvals',   icon: CheckCircle2,    group: 'operations', badgeKey: 'approvals' },
  { id: 'ops',         icon: ClipboardList,   group: 'operations' },   // Daily ops checklists

  // OPERATIONS MODULES - Execution domains (Todo-Pilot §6)
  //   Maintenance = outlet queue of maintenance issues · CMMS = equipment, WOs, PM, parts
  //   Asset Purchase = requests to buy/replace assets
  { id: 'maintenance',  icon: Wrench,               group: 'modules' },
  { id: 'cmms',         icon: Gauge,                group: 'modules' },
  { id: 'assets',       icon: Package,              group: 'modules' },
  { id: 'procurement',  icon: ShoppingCart,         group: 'modules' },
  { id: 'training',     icon: BookOpen,             group: 'modules' },
  { id: 'marketing',    icon: Megaphone,            group: 'modules' },
  { id: 'qa',           icon: Shield,               group: 'modules' },
  { id: 'guest-service',icon: MessageSquareWarning, group: 'modules' },

  // ISSUE VIEWS - the Issues list pinned to one category
  { id: 'it-support',   icon: Monitor,              group: 'views' },

  // INSIGHTS - Analytics & reporting
  { id: 'analytics', icon: BarChart3, group: 'insights' },
  { id: 'reports',   icon: FileText,  group: 'insights' },

  // SYSTEM - Configuration & admin
  { id: 'master-data',   icon: Database, group: 'system' },
  { id: 'users',         icon: Users,    group: 'system' },
  { id: 'notifications', icon: Bell,     group: 'system', badgeKey: 'notifications' },
  { id: 'settings',      icon: Settings, group: 'system' },
]

const groups: { id: string }[] = [   // label = t('navGroup.<id>')
  { id: 'operations' },
  { id: 'modules' },
  { id: 'views' },
  { id: 'insights' },
  { id: 'system' },
]

export interface SidebarBadges {
  issues: number
  tasks: number
  approvals: number
  notifications: number
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  currentPage: string
  onNavigate: (page: string) => void
  badges?: SidebarBadges
  // Phones (< md): the sidebar is an off-canvas menu opened from the top bar
  // instead of a column eating 2/3 of a 360px screen (Todo-Pilot §15).
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ collapsed, onToggle, currentPage, onNavigate, badges, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { canViewPage } = usePermissions()
  const { t } = useT()

  return (
    <>
    {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} aria-hidden="true" />}
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out flex-shrink-0',
        // phone: fixed drawer, hidden until opened
        'fixed inset-y-0 left-0 z-50 w-64 shadow-lg',
        mobileOpen ? 'translate-x-0' : '-translate-x-full invisible',
        // md+: the usual column
        'md:visible md:relative md:inset-auto md:z-auto md:translate-x-0 md:shadow-none',
        collapsed ? 'md:w-14' : 'md:w-56'
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
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{t('shell.platform')}</p>
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
                  {t(`navGroup.${group.id}` as MessageKey)}
                </p>
              )}
              {groupItems.filter((item) => canViewPage(item.id)).map((item) => {
                const Icon = item.icon
                const active = currentPage === item.id
                const count = item.badgeKey ? (badges?.[item.badgeKey] ?? 0) : 0
                const showBadge = count > 0

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? t(`nav.${item.id}` as MessageKey) : undefined}
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

                    {/* Icon — with dot indicator when collapsed */}
                    <span className="relative flex-shrink-0">
                      <Icon className={cn(collapsed ? 'size-4.5' : 'size-4')} />
                      {collapsed && showBadge && (
                        <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary border border-sidebar" />
                      )}
                    </span>

                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{t(`nav.${item.id}` as MessageKey)}</span>
                        {showBadge && (
                          <span className="text-[10px] font-semibold bg-primary text-primary-foreground rounded-full min-w-[18px] px-1.5 py-0.5 leading-none text-center">
                            {count > 99 ? '99+' : count}
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
        className="hidden md:flex absolute -right-3 top-16 z-10 size-6 rounded-full border border-border bg-background flex items-center justify-center shadow-sm hover:bg-accent transition-colors"
        aria-label={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
      >
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>
    </aside>
    </>
  )
}
