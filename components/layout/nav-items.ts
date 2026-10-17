// The app's menu, shared by the sidebar and the ⌘K search so both always list
// the same pages. Label = t('nav.<id>'), group label = t('navGroup.<group>').
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
  Settings,
  ListChecks,
  ClipboardList,
} from 'lucide-react'

export type NavGroup = 'operations' | 'modules' | 'insights' | 'system'

export interface NavItem {
  id: string               // page id
  icon: React.ElementType
  group: NavGroup
  badgeKey?: 'issues' | 'tasks' | 'approvals'
}

export const navItems: NavItem[] = [
  // OPERATIONS - Core workflow, always open
  { id: 'my-work',     icon: ListChecks,      group: 'operations' },   // Todo-Pilot §19
  { id: 'dashboard',   icon: LayoutDashboard, group: 'operations' },
  { id: 'issues',      icon: AlertCircle,     group: 'operations', badgeKey: 'issues' },
  { id: 'it-support',  icon: Monitor,         group: 'operations' },   // the Issues list pinned to IT
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

  // INSIGHTS - Analytics & reporting
  { id: 'analytics', icon: BarChart3, group: 'insights' },
  { id: 'reports',   icon: FileText,  group: 'insights' },

  // SYSTEM - Configuration & admin. Notifications live behind the bell and the
  // phone's bottom bar, so they no longer take a sidebar row.
  { id: 'master-data', icon: Database, group: 'system' },
  { id: 'users',       icon: Users,    group: 'system' },
  { id: 'settings',    icon: Settings, group: 'system' },
]

export const navGroups: NavGroup[] = ['operations', 'modules', 'insights', 'system']

/** Groups that fold away; the core workflow stays open. */
export const collapsibleGroups: ReadonlySet<NavGroup> = new Set(['modules', 'insights', 'system'])
