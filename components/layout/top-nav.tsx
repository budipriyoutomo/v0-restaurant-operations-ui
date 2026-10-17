'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Bell, ChevronRight, Search, Settings, LogOut, Sun, Moon, Monitor, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { openNotification } from '@/lib/notifications'
import { useT, type MessageKey } from '@/lib/i18n'
import { navigate } from '@/lib/use-route'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CommandMenu } from './command-menu'
import { navItems } from './nav-items'
import { OutletSwitcher } from './outlet-switcher'

interface TopNavProps {
  currentPage: string
  onNavigate: (page: string) => void
  onOpenMenu?: () => void   // phones: opens the off-canvas sidebar
}

const iconButton = 'relative size-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'

export function TopNav({ currentPage, onNavigate, onOpenMenu }: TopNavProps) {
  const {
    currentUser, logout,
    notifications, unreadCount, loadNotifications, markNotificationRead, markAllNotificationsRead,
  } = useIssueStore()

  const { t, relative } = useT()
  const { theme, setTheme } = useTheme()
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const navGroup = currentPage === 'notifications' ? 'system' : navItems.find((i) => i.id === currentPage)?.group

  // Keep the bell's badge fresh without a page reload.
  useEffect(() => {
    const t = setInterval(() => loadNotifications(), 60_000)
    return () => clearInterval(t)
  }, [loadNotifications])

  const userInitials = currentUser
    ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <header className="h-14 flex items-center gap-2 px-3 sm:px-6 border-b border-border bg-background/80 backdrop-blur flex-shrink-0 relative z-20">
      {onOpenMenu && (
        <button onClick={onOpenMenu} aria-label={t('shell.openMenu')} className={cn(iconButton, 'md:hidden -ml-1 text-foreground')}>
          <Menu className="size-5" />
        </button>
      )}

      {/* Where am I: group › page. The page itself carries the big title. */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5 text-sm">
        {navGroup && (
          <>
            <span className="hidden md:inline text-muted-foreground whitespace-nowrap">{t(`navGroup.${navGroup}` as MessageKey)}</span>
            <ChevronRight className="hidden md:block size-3.5 text-muted-foreground/60 flex-shrink-0" aria-hidden="true" />
          </>
        )}
        <span className="font-medium text-foreground truncate">
          {currentPage === 'notifications' ? t('topnav.pageTitle.notifications') : t(`nav.${currentPage}` as MessageKey)}
        </span>
      </div>

      {/* Global search (⌘K) */}
      <button
        onClick={() => setSearchOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3.5 h-10 rounded-full bg-muted text-muted-foreground text-sm hover:bg-accent transition-colors w-64 lg:w-80"
      >
        <Search className="size-4 flex-shrink-0" />
        <span className="flex-1 text-left">{t('topnav.search')}</span>
        <kbd className="text-xs font-medium bg-background border border-border rounded-md px-1.5 py-0.5">⌘K</kbd>
      </button>
      <button onClick={() => setSearchOpen(true)} aria-label={t('topnav.search')} className={cn(iconButton, 'sm:hidden')}>
        <Search className="size-5" />
      </button>
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />

      <OutletSwitcher />

      {/* Notifications */}
      <Popover open={notifOpen} onOpenChange={(o) => { if (o) loadNotifications(); setNotifOpen(o) }}>
        <PopoverTrigger asChild>
          <button className={iconButton} aria-label={t('topnav.notifications')}>
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-5 h-5 px-1 rounded-full bg-destructive text-xs text-white font-bold flex items-center justify-center ring-2 ring-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-[calc(100vw-1.5rem)] sm:w-96 p-0 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">{t('topnav.notifications')}</span>
            {unreadCount > 0 ? (
              <button onClick={() => markAllNotificationsRead().catch(() => {})} className="text-xs font-medium text-primary hover:underline">
                {t('topnav.markAllRead', { count: unreadCount })}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">{t('topnav.allCaughtUp')}</span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('topnav.noNotifications')}</p>
            )}
            {notifications.slice(0, 10).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  const markRead = (id: string) => markNotificationRead(id).catch(() => {})
                  if (openNotification(n, { markRead, go: navigate })) setNotifOpen(false)
                }}
                className={cn('w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3', !n.read_at && 'bg-primary/5')}
              >
                <span className={cn(
                  'mt-1.5 size-2 rounded-full flex-shrink-0',
                  n.type === 'critical' ? 'bg-destructive' :
                  n.type === 'warning' ? 'bg-warning' :
                  n.type === 'success' ? 'bg-success' : 'bg-primary'
                )} />
                <span className="flex-1 min-w-0">
                  <span className={cn('block text-sm text-foreground truncate', !n.read_at && 'font-semibold')}>{n.title}</span>
                  <span className="block text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{n.message}</span>
                  <span className="block text-xs text-muted-foreground/80 mt-1">{relative(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setNotifOpen(false); onNavigate('notifications') }}
            className="w-full px-4 py-3 border-t border-border text-sm font-medium text-primary hover:bg-accent transition-colors"
          >
            {t('topnav.viewAll')}
          </button>
        </PopoverContent>
      </Popover>

      {/* User menu: profile, theme, sign out */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-1 rounded-full focus-visible:ring-2 focus-visible:ring-ring outline-none" aria-label={t('topnav.profile')}>
            <span className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {userInitials}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-xl">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-semibold truncate">{currentUser?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground capitalize">{currentUser?.role_name ?? ''}</p>
            {currentUser?.company_name && (
              <p className="text-xs text-muted-foreground truncate">{currentUser.company_name}</p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onNavigate('settings')}>
            <Settings /> {t('topnav.settings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">{t('topnav.theme')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light"><Sun /> {t('topnav.themeLight')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><Moon /> {t('topnav.themeDark')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system"><Monitor /> {t('topnav.themeSystem')}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => logout()}>
            <LogOut /> {t('topnav.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
