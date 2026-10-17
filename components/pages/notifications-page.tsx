'use client'

import { useEffect } from 'react'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { AppNotification, NotificationType } from '@/lib/types'
import { openNotification } from '@/lib/notifications'
import { notificationPath } from '@/lib/routes'
import { useT } from '@/lib/i18n'
import { navigate } from '@/lib/use-route'

type NotifConfig = { dot: string; bg: string }

const TYPE_CONFIG: Record<NotificationType, NotifConfig> = {
  critical: { dot: 'bg-destructive', bg: 'bg-destructive/5 border-destructive/20' },
  warning:  { dot: 'bg-warning',     bg: 'bg-warning/5 border-warning/20' },
  info:     { dot: 'bg-primary',     bg: 'bg-primary/5 border-primary/10' },
  success:  { dot: 'bg-success',     bg: 'bg-success/5 border-success/20' },
}

function NotifCard({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const cfg = TYPE_CONFIG[n.type as NotificationType] ?? TYPE_CONFIG.info
  const isUnread = !n.read_at
  const { t, relative } = useT()
  // Notifications about a record open it on click (Todo-Pilot §14).
  const hasRecord = notificationPath(n.entity_type, n.entity_id) !== null
  return (
    <div
      onClick={hasRecord ? () => openNotification(n, { markRead: onRead, go: navigate }) : undefined}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        cfg.bg,
        isUnread ? 'opacity-100' : 'opacity-60',
        hasRecord && 'cursor-pointer hover:bg-accent/50'
      )}
    >
      <span className={cn('mt-1.5 size-2 rounded-full flex-shrink-0', cfg.dot, !isUnread && 'opacity-30')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-semibold leading-snug', isUnread ? 'text-foreground' : 'text-muted-foreground')}>
            {n.title}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{relative(n.created_at)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
      </div>
      {isUnread && (
        <button
          onClick={(e) => { e.stopPropagation(); onRead(n.id) }}
          className="flex-shrink-0 mt-0.5 size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title={t('notifications.markRead')}
          aria-label={t('notifications.markRead')}
        >
          <CheckCheck className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export function NotificationsPage() {
  const { t } = useT()
  const {
    notifications,
    unreadCount,
    notificationsLoading,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useIssueStore()

  useEffect(() => {
    loadNotifications()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const unread = notifications.filter(n => !n.read_at)
  const read   = notifications.filter(n =>  n.read_at)

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="size-6 text-foreground" />
          <div>
            <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount > 0 ? t('notifications.unread', { count: unreadCount }) : t('topnav.allCaughtUp')}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <CheckCheck className="size-3.5" /> {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {notificationsLoading && notifications.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="size-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">{t('notifications.empty')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('notifications.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('notifications.unreadHeading')}</p>
              {unread.map(n => (
                <NotifCard key={n.id} n={n} onRead={markNotificationRead} />
              ))}
            </div>
          )}
          {read.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('notifications.earlier')}</p>
              {read.map(n => (
                <NotifCard key={n.id} n={n} onRead={markNotificationRead} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
