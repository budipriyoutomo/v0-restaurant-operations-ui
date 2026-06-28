'use client'

import { useState } from 'react'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIssueStore } from '@/lib/store'
import { AuditLog } from '@/lib/types'

type NotifType = 'critical' | 'warning' | 'info' | 'success'

const typeConfig: Record<NotifType, { dot: string; bg: string; label: string }> = {
  critical: { dot: 'bg-destructive', bg: 'bg-destructive/5 border-destructive/20', label: 'Critical' },
  warning:  { dot: 'bg-warning',     bg: 'bg-warning/5 border-warning/20',         label: 'Warning'  },
  info:     { dot: 'bg-primary',     bg: 'bg-primary/5 border-primary/10',         label: 'Info'     },
  success:  { dot: 'bg-success',     bg: 'bg-success/5 border-success/20',         label: 'Success'  },
}

function formatTime(iso: string): string {
  try {
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diffMin < 1)  return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const h = Math.floor(diffMin / 60)
    if (h < 24) return `${h}h ago`
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

function deriveNotification(log: AuditLog): { id: string; title: string; message: string; time: string; type: NotifType } {
  const t = log.table_name
  const a = log.action
  const nv = log.new_value ?? {}
  let type: NotifType = 'info'
  let title = ''
  let message = ''

  if (t === 'issues') {
    if (a === 'INSERT') {
      title = 'Issue Created'
      message = `${nv.number ?? ''} · ${nv.title ?? ''}`
      type = nv.priority === 'critical' || nv.priority === 'high' ? 'warning' : 'info'
    } else {
      const s = String(nv.status ?? '')
      title = 'Issue Updated'
      message = `Status → "${s}"${log.performed_by ? ` · by ${log.performed_by}` : ''}`
      type = s === 'resolved' || s === 'closed' ? 'success'
           : s === 'waiting' ? 'warning' : 'info'
    }
  } else if (t === 'approval_requests') {
    if (a === 'INSERT') {
      title = 'Approval Required'
      message = `${nv.number ?? ''} · ${nv.title ?? ''}`
      type = 'warning'
    } else {
      const decision = String(nv.status ?? '')
      title = decision === 'approved' ? 'Approval Granted'
            : decision === 'rejected' ? 'Approval Rejected' : 'Approval Updated'
      message = `${nv.title ?? ''}${log.performed_by ? ` · by ${log.performed_by}` : ''}`
      type = decision === 'approved' ? 'success' : decision === 'rejected' ? 'critical' : 'info'
    }
  } else if (t === 'tasks') {
    title = a === 'INSERT' ? 'Task Created' : 'Task Updated'
    message = `${nv.title ?? 'Task'}${log.performed_by ? ` · ${log.performed_by}` : ''}`
    type = 'info'
  } else {
    title = `${t.replace(/_/g, ' ')} ${a === 'INSERT' ? 'created' : a === 'UPDATE' ? 'updated' : 'deleted'}`
    message = log.performed_by ? `By ${log.performed_by}` : ''
    type = 'info'
  }

  return { id: log.id, title, message, time: formatTime(log.created_at), type }
}

export function NotificationsPage() {
  const { auditLogs, issues } = useIssueStore()
  const [filter, setFilter] = useState<'all' | NotifType>('all')
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const allNotifs = auditLogs
    .filter(l => !dismissedIds.has(l.id))
    .map(deriveNotification)

  const filtered = filter === 'all' ? allNotifs : allNotifs.filter(n => n.type === filter)
  const unreadCount = allNotifs.filter(n => !readIds.has(n.id)).length
  const slaBreached = issues.filter(i => i.slaBreach && i.status !== 'resolved' && i.status !== 'closed')

  const markAllRead = () => setReadIds(new Set(allNotifs.map(n => n.id)))
  const dismiss = (id: string) => setDismissedIds(prev => new Set([...prev, id]))

  return (
    <div className="p-5 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Notification Center</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{unreadCount} unread notifications</p>
        </div>
        <button
          onClick={markAllRead}
          className="flex items-center gap-1.5 px-3 h-7 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          <CheckCheck className="size-3.5" /> Mark all read
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'critical', 'warning', 'info', 'success'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 h-7 rounded-full text-xs font-medium transition-colors capitalize',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-accent'
            )}
          >
            {f === 'all' ? 'All' : typeConfig[f].label}
          </button>
        ))}
      </div>

      {/* SLA Breach Alert */}
      {slaBreached.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center flex-shrink-0">
              <Bell className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-destructive">SLA Breach — Immediate Action Required</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                <strong className="text-destructive">{slaBreached.length} issue{slaBreached.length > 1 ? 's' : ''}</strong> breaching SLA:{' '}
                {slaBreached.slice(0, 3).map(i => i.number).join(', ')}
                {slaBreached.length > 3 ? ` +${slaBreached.length - 3} more` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              {auditLogs.length === 0 ? 'No activity yet' : 'No notifications'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {auditLogs.length === 0
                ? 'Notifications will appear here as your team creates and updates issues.'
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          filtered.map((notif) => {
            const config = typeConfig[notif.type]
            const isRead = readIds.has(notif.id)
            return (
              <div
                key={notif.id}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-xl border transition-colors hover:shadow-sm',
                  !isRead ? config.bg : 'border-border bg-card'
                )}
              >
                <div className={cn('size-2 rounded-full mt-1 flex-shrink-0', config.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-semibold', !isRead ? 'text-foreground' : 'text-muted-foreground')}>
                      {notif.title}
                    </p>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">{notif.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{notif.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                      notif.type === 'critical' ? 'bg-destructive/15 text-destructive' :
                      notif.type === 'warning'  ? 'bg-warning/15 text-warning' :
                      notif.type === 'success'  ? 'bg-success/15 text-success' :
                                                  'bg-primary/15 text-primary'
                    )}>
                      {config.label}
                    </span>
                    {!isRead && <span className="size-1.5 rounded-full bg-primary" />}
                  </div>
                </div>
                <button
                  onClick={() => { setReadIds(prev => new Set([...prev, notif.id])); dismiss(notif.id) }}
                  className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
