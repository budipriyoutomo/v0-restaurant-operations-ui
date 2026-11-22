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

export type NavGroup = 'today' | 'equipment' | 'purchasing' | 'people' | 'analytics' | 'settings'

export interface NavItem {
  id: string               // page id
  icon: React.ElementType
  group: NavGroup
  badgeKey?: 'issues' | 'tasks' | 'approvals'
}

// Groups follow the working day, not the module list (Todo-Modern-UI Fase 2).
export const navItems: NavItem[] = [
  // TODAY - Core workflow, always open
  { id: 'my-work',     icon: ListChecks,      group: 'today' },   // Todo-Pilot §19
  { id: 'dashboard',   icon: LayoutDashboard, group: 'today' },
  { id: 'issues',      icon: AlertCircle,     group: 'today', badgeKey: 'issues' },
  { id: 'tasks',       icon: CheckSquare,     group: 'today', badgeKey: 'tasks' },
  { id: 'approvals',   icon: CheckCircle2,    group: 'today', badgeKey: 'approvals' },
  { id: 'ops',         icon: ClipboardList,   group: 'today' },   // Daily checklists

  // EQUIPMENT - Maintenance = outlet queue of maintenance issues · CMMS ("Aset &
  //   Perawatan") = equipment, WOs, PM, parts · IT Support = the Issues list pinned to IT
  { id: 'maintenance', icon: Wrench,  group: 'equipment' },
  { id: 'cmms',        icon: Gauge,   group: 'equipment' },
  { id: 'it-support',  icon: Monitor, group: 'equipment' },

  // PURCHASING - Procurement (PR → PO, vendors, budget) · Asset Purchase = requests to buy/replace assets
  { id: 'procurement', icon: ShoppingCart, group: 'purchasing' },
  { id: 'assets',      icon: Package,      group: 'purchasing' },

  // TEAM & QUALITY
  { id: 'training',      icon: BookOpen,             group: 'people' },
  { id: 'qa',            icon: Shield,               group: 'people' },
  { id: 'guest-service', icon: MessageSquareWarning, group: 'people' },
  { id: 'marketing',     icon: Megaphone,            group: 'people' },

  // ANALYTICS - Analytics & data export
  { id: 'analytics', icon: BarChart3, group: 'analytics' },
  { id: 'reports',   icon: FileText,  group: 'analytics' },

  // SETTINGS - Configuration & admin. Notifications live behind the bell and the
  // phone's bottom bar, so they no longer take a sidebar row.
  { id: 'master-data', icon: Database, group: 'settings' },
  { id: 'users',       icon: Users,    group: 'settings' },
  { id: 'settings',    icon: Settings, group: 'settings' },
]

export const navGroups: NavGroup[] = ['today', 'equipment', 'purchasing', 'people', 'analytics', 'settings']

/** Groups that fold away; the core workflow stays open. */
export const collapsibleGroups: ReadonlySet<NavGroup> = new Set(['equipment', 'purchasing', 'people', 'analytics', 'settings'])
