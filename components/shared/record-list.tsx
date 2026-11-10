'use client'

// Dense record rows for module lists (Todo-Modern-UI Fase 4), the pattern of
// the Issues list: title on top, small grey facts under it, status on the
// right. A row is one button when it opens something, named by number + title;
// its facts and status are the description. No pills.
import { cn } from '@/lib/utils'
import { RecordId } from './record-id'

export function RecordList({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <ul aria-label={label} className={cn('divide-y divide-border rounded-lg border border-border bg-card overflow-hidden', className)}>
      {children}
    </ul>
  )
}

export function RecordRow({ id, number, title, meta = [], aside, onOpen, muted = false }: {
  id: string
  number?: string
  title: React.ReactNode
  /** Small facts under the title; empty ones are skipped. */
  meta?: React.ReactNode[]
  /** Right side: status, amount. */
  aside?: React.ReactNode
  onOpen?: () => void
  /** Inactive records. */
  muted?: boolean
}) {
  const key = `rec-${id}`
  const facts = meta.filter((m) => m !== null && m !== undefined && m !== false && m !== '')
  const body = (
    <>
      <span className="min-w-0">
        <span id={`${key}-title`} className="block text-sm font-medium truncate">{title}</span>
        <span id={`${key}-meta`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {number && <span id={`${key}-number`}><RecordId id={number} /></span>}
          {facts.map((m, i) => <span key={i}>{m}</span>)}
        </span>
      </span>
      {aside && <span id={`${key}-aside`} className="flex flex-col items-end gap-0.5 text-right">{aside}</span>}
    </>
  )
  const cls = cn('w-full grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 text-left', muted && 'opacity-60')
  return (
    <li>
      {onOpen ? (
        <button type="button" onClick={onOpen}
          aria-labelledby={`${number ? `${key}-number ` : ''}${key}-title`}
          aria-describedby={`${key}-meta${aside ? ` ${key}-aside` : ''}`}
          className={cn(cls, 'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary')}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
}
