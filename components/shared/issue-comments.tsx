'use client'

// Comments on an Issue (Todo-Ops-Checklist P3) — a timeline in the drawer.
// System comments (a checklist item failing again, …) are styled apart.
// Posting goes through the offline queue: offline, the comment stays as
// "pending" and is sent when the connection returns.
import { useEffect, useState } from 'react'
import { Bot, Clock, Loader2, Send } from 'lucide-react'
import { QueuedError } from '@/lib/api-client'
import type { IssueComment } from '@/lib/types'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type Shown = IssueComment & { pending?: boolean }

export function IssueComments({ issueId, load, add }: {
  issueId: string
  load: (issueId: string) => Promise<IssueComment[]>
  add: (issueId: string, body: string) => Promise<IssueComment>
}) {
  const { t, relative } = useT()
  const [comments, setComments] = useState<Shown[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setComments(null)
    setLoadFailed(false)
    load(issueId)
      .then((rows) => { if (live) setComments(rows) })
      .catch(() => { if (live) { setComments([]); setLoadFailed(true) } })
    return () => { live = false }
  }, [issueId, load])

  const body = text.trim()
  const send = async () => {
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      const created = await add(issueId, body)
      setComments((prev) => [...(prev ?? []), created])
      setText('')
    } catch (err) {
      if (err instanceof QueuedError) {
        const pending: Shown = {
          id: `pending-${Date.now()}`, issueId, body, kind: 'user', authorUserId: null, authorName: '',
          createdAt: new Date().toISOString(), pending: true,
        }
        setComments((prev) => [...(prev ?? []), pending])
        setText('')
      } else {
        setError(t('issueComments.failed'))
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{t('issueComments.title')}</p>

      {comments === null ? (
        <div className="h-12 rounded-md bg-muted animate-pulse" />
      ) : loadFailed ? (
        <p className="text-xs text-destructive">{t('issueComments.loadFailed')}</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('issueComments.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => {
            const system = c.kind === 'system'
            return (
              <li key={c.id} className={cn('rounded-md border px-3 py-2 text-sm',
                system ? 'border-dashed border-border bg-muted/40' : 'border-border bg-background',
                c.pending && 'opacity-70')}>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
                  {system && <Bot className="size-3" aria-hidden />}
                  <span className="font-semibold text-foreground/80">
                    {system ? t('issueComments.system') : c.authorName}
                  </span>
                  {c.pending ? (
                    <span className="inline-flex items-center gap-1"><Clock className="size-3" aria-hidden /> {t('issueComments.pending')}</span>
                  ) : (
                    <span>· {relative(c.createdAt)}</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words">{c.body}</p>
              </li>
            )
          })}
        </ul>
      )}

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          aria-label={t('issueComments.write')}
          placeholder={t('issueComments.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() } }}
          rows={2}
          maxLength={4000}
          className="flex-1 px-3 py-2 rounded-md border border-border bg-muted/20 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button type="button" onClick={send} disabled={!body || sending} aria-label={t('issueComments.send')}
          className={cn('size-11 shrink-0 flex items-center justify-center rounded-md transition-colors',
            body && !sending ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
          {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        </button>
      </div>
    </div>
  )
}
