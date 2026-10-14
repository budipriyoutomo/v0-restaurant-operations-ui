'use client'

// Phones (< md): five thumb-sized entries at the bottom instead of the full
// menu — Beranda, Lapor, Pekerjaan Saya, Notifikasi, Akun (Todo-Pilot §19 /
// UX-6). The full sidebar stays reachable from the ☰ button.
import { Bell, Home, ListChecks, Plus, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { navigate } from '@/lib/use-route'
import { useT } from '@/lib/i18n'

export function BottomNav({ currentPage }: { currentPage: string }) {
  const { t } = useT()
  const { canViewPage } = usePermissions()
  const unread = useIssueStore((s) => s.unreadCount)

  const items = [
    { id: 'home', label: t('bottomNav.home'), icon: Home, to: '/' },
    ...(canViewPage('issues') ? [{ id: 'report', label: t('bottomNav.report'), icon: Plus, to: '/issues?new=1' }] : []),
    { id: 'my-work', label: t('bottomNav.myWork'), icon: ListChecks, to: '/my-work' },
    { id: 'notifications', label: t('bottomNav.notifications'), icon: Bell, to: '/notifications', badge: unread },
    { id: 'settings', label: t('bottomNav.account'), icon: UserRound, to: '/settings' },
  ]

  return (
    <nav aria-label={t('bottomNav.label')}
      className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ id, label, icon: Icon, to, badge }) => {
          const active = id === currentPage
          return (
            <li key={id}>
              <button type="button" onClick={() => navigate(to)} aria-current={active ? 'page' : undefined}
                aria-label={badge ? `${label} (${badge})` : label}
                className={cn('w-full h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium relative',
                  active ? 'text-primary' : 'text-muted-foreground',
                  id === 'report' && 'text-primary')}>
                <span className={cn('relative', id === 'report' && 'size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center')}>
                  <Icon className="size-5" />
                  {!!badge && badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
