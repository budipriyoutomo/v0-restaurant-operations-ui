'use client'

import { useState } from 'react'
import { Bell, CheckCheck, Trash2, Filter } from 'lucide-react'
import { notifications } from '@/lib/data'
import { cn } from '@/lib/utils'

const typeConfig = {
  critical: { dot: 'bg-destructive', bg: 'bg-destructive/5 border-destructive/20', label: 'Critical' },
  warning: { dot: 'bg-warning', bg: 'bg-warning/5 border-warning/20', label: 'Warning' },
  info: { dot: 'bg-primary', bg: 'bg-primary/5 border-primary/10', label: 'Info' },
  success: { dot: 'bg-success', bg: 'bg-success/5 border-success/20', label: 'Success' },
}

type NotifType = 'critical' | 'warning' | 'info' | 'success'

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | NotifType>('all')
  const [items, setItems] = useState(notifications)

  const filtered = filter === 'all' ? items : items.filter((n) => n.type === filter)
  const unreadCount = items.filter((n) => !n.read).length

  const markAllRead = () => setItems(items.map((n) => ({ ...n, read: true })))

  return (
    <div className="p-5 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Notification Center</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{unreadCount} unread notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 h-7 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            <CheckCheck className="size-3.5" /> Mark all read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'critical', 'warning', 'info', 'success'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 h-7 rounded-full text-xs font-medium transition-colors capitalize',
              filter === f ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-accent'
            )}
          >
            {f === 'all' ? 'All' : typeConfig[f as NotifType].label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          filtered.map((notif) => {
            const config = typeConfig[notif.type as NotifType]
            return (
              <div
                key={notif.id}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-xl border transition-colors',
                  !notif.read ? config.bg : 'border-border bg-card',
                  'hover:shadow-sm'
                )}
              >
                <div className={cn('size-2 rounded-full mt-1 flex-shrink-0', config.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-semibold', !notif.read ? 'text-foreground' : 'text-muted-foreground')}>
                      {notif.title}
                    </p>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">{notif.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{notif.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                      notif.type === 'critical' ? 'bg-destructive/15 text-destructive' :
                      notif.type === 'warning' ? 'bg-warning/15 text-warning' :
                      notif.type === 'success' ? 'bg-success/15 text-success' :
                      'bg-primary/15 text-primary'
                    )}>
                      {config.label}
                    </span>
                    {!notif.read && (
                      <span className="size-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setItems(items.filter((n) => n.id !== notif.id))}
                  className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  aria-label="Dismiss notification"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* SLA Alert panel */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center flex-shrink-0">
            <Bell className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-destructive">SLA Escalation Policy Active</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Tickets breaching SLA by more than 2 hours are automatically escalated to the Operations Manager via SMS and email.
              Current SLA breach: <strong className="text-destructive">1 ticket (TK-2041)</strong> — 45 minutes overdue.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button className="px-3 py-1.5 rounded-md bg-destructive text-white text-xs font-medium hover:bg-destructive/90 transition-colors">
                View Breached Tickets
              </button>
              <button className="px-3 py-1.5 rounded-md border border-destructive/30 text-xs text-destructive hover:bg-destructive/10 transition-colors">
                Escalation Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
