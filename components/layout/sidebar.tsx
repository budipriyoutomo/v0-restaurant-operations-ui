'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/lib/permissions'
import { useT, type MessageKey } from '@/lib/i18n'
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Utensils } from 'lucide-react'
import { collapsibleGroups, navGroups, navItems, type NavGroup } from './nav-items'

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

// Which foldable groups the user opened, remembered per browser.
const OPEN_GROUPS_KEY = 'ro.sidebar.openGroups'

function readOpenGroups(): NavGroup[] {
  try { return JSON.parse(window.localStorage.getItem(OPEN_GROUPS_KEY) ?? '[]') } catch { return [] }
}

export function Sidebar({ collapsed, onToggle, currentPage, onNavigate, badges, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { canViewPage } = usePermissions()
  const { t } = useT()
  const [openGroups, setOpenGroups] = useState<NavGroup[]>([])

  useEffect(() => { setOpenGroups(readOpenGroups()) }, [])

  const toggleGroup = (group: NavGroup) => {
    const next = openGroups.includes(group) ? openGroups.filter((g) => g !== group) : [...openGroups, group]
    setOpenGroups(next)
    try { window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next)) } catch { /* private mode */ }
  }

  const countOf = (badgeKey?: keyof SidebarBadges) => (badgeKey ? (badges?.[badgeKey] ?? 0) : 0)
  // Collapsed rail or phone drawer closed: everything is an icon, no folding.
  const iconsOnly = collapsed && !mobileOpen

  return (
    <>
    {mobileOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden" onClick={onMobileClose} aria-hidden="true" />}
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300 ease-in-out flex-shrink-0',
        // phone: fixed drawer, hidden until opened
        'fixed inset-y-0 left-0 z-50 w-72 shadow-xl',
        mobileOpen ? 'translate-x-0' : '-translate-x-full invisible',
        // md+: the usual column
        'md:visible md:relative md:inset-auto md:z-auto md:translate-x-0 md:shadow-none',
        collapsed ? 'md:w-[68px]' : 'md:w-64'
      )}
    >
      {/* Brand */}
      <div className={cn('h-14 flex items-center gap-3 px-4 flex-shrink-0', iconsOnly && 'md:justify-center md:px-0')}>
        <div className="flex-shrink-0 size-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <Utensils className="size-4 text-primary-foreground" />
        </div>
        <div className={cn('min-w-0', iconsOnly && 'md:hidden')}>
          <p className="text-[15px] font-semibold text-foreground leading-tight truncate">RestaurantOps</p>
          <p className="text-xs text-muted-foreground leading-tight">{t('shell.platform')}</p>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label={t('shell.sidebarLabel')} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-4">
        {navGroups.map((group) => {
          const items = navItems.filter((item) => item.group === group && canViewPage(item.id))
          if (items.length === 0) return null

          const foldable = !iconsOnly && collapsibleGroups.has(group)
          const holdsCurrent = items.some((item) => item.id === currentPage)
          const open = !foldable || holdsCurrent || openGroups.includes(group)
          const groupLabel = t(`navGroup.${group}` as MessageKey)
          const hiddenCount = open ? 0 : items.reduce((sum, item) => sum + countOf(item.badgeKey), 0)

          return (
            <div key={group}>
              {iconsOnly ? (
                group !== navGroups[0] && <div className="mx-2 mb-2 border-t border-sidebar-border" />
              ) : foldable ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={open}
                  disabled={holdsCurrent}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground transition-colors"
                >
                  <span className="flex-1 text-left">{groupLabel}</span>
                  {hiddenCount > 0 && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
                  {!holdsCurrent && <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />}
                </button>
              ) : (
                <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{groupLabel}</p>
              )}

              {open && (
                <div className="mt-0.5 space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon
                    const active = currentPage === item.id
                    const count = countOf(item.badgeKey)
                    const label = t(`nav.${item.id}` as MessageKey)

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        aria-current={active ? 'page' : undefined}
                        aria-label={iconsOnly ? label : undefined}
                        title={iconsOnly ? label : undefined}
                        className={cn(
                          'w-full h-10 flex items-center gap-3 px-3 rounded-lg text-sm transition-colors',
                          iconsOnly && 'md:justify-center md:px-0',
                          active
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground'
                        )}
                      >
                        <span className="relative flex-shrink-0">
                          <Icon className="size-[18px]" />
                          {iconsOnly && count > 0 && (
                            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
                          )}
                        </span>

                        <span className={cn('flex-1 text-left truncate', iconsOnly && 'md:hidden')}>{label}</span>
                        {count > 0 && (
                          <span className={cn(
                            'text-xs font-semibold rounded-full min-w-6 h-5 px-1.5 flex items-center justify-center tabular-nums',
                            active ? 'bg-primary text-primary-foreground' : 'bg-sidebar-accent text-foreground',
                            iconsOnly && 'md:hidden',
                          )}>
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle (desktop) */}
      <div className="hidden md:block p-3 border-t border-sidebar-border">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
        >
          {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          {!collapsed && <span>{t('shell.collapseSidebar')}</span>}
        </button>
      </div>
    </aside>
    </>
  )
}
