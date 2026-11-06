import { cn } from '@/lib/utils'
import { SIGNAL_DOT, type Signal } from '@/lib/tone'
import { StatusLabel } from './status-label'

// "Papan Servis": tickets hanging from the rail of the kitchen pass, most urgent
// first (Todo-Modern-UI Fase 1). Only on the GM dashboard, the report detail and
// My Work's top ticket — not a general card style.
export function ServiceRail({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn('relative', className)}>
      <div aria-hidden="true" className="h-1.5 rounded-sm bg-foreground" />
      <ul className="flex gap-3 overflow-x-auto snap-x px-2 pb-2">{children}</ul>
    </section>
  )
}

interface RailTicketProps {
  signal: Signal
  status: string
  title: string
  meta?: React.ReactNode
  children?: React.ReactNode
  /** The ticket's one action; the whole ticket becomes that button. */
  onClick?: () => void
  className?: string
}

export function RailTicket({ signal, status, title, meta, children, onClick, className }: RailTicketProps) {
  const body = (
    <>
      <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1 rounded-t-md', SIGNAL_DOT[signal])} />
      <StatusLabel signal={signal}>{status}</StatusLabel>
      <span className="block mt-1.5 text-sm font-semibold text-foreground">{title}</span>
      {meta && <span className="block mt-0.5 text-xs text-muted-foreground">{meta}</span>}
      {children}
    </>
  )
  const cls = 'relative block w-full h-full text-left rounded-md border border-border bg-card px-3 pt-3.5 pb-3'
  return (
    <li className={cn('snap-start shrink-0 w-56', className)}>
      {/* the clip that holds the ticket on the rail */}
      <span aria-hidden="true" className="block mx-auto w-6 h-2 rounded-b-sm bg-foreground/70" />
      {onClick
        ? <button type="button" onClick={onClick} className={cn(cls, 'hover:border-foreground/40 transition-colors')}>{body}</button>
        : <div className={cls}>{body}</div>}
    </li>
  )
}
