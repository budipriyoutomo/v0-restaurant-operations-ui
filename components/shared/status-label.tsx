import { cn } from '@/lib/utils'
import { SIGNAL_DOT, SIGNAL_TEXT, type Signal } from '@/lib/tone'

// A status is a dot + text, not a pill (Todo-Modern-UI Fase 1). The dot is
// decoration: the text carries the meaning, so colour is never alone.
export function StatusLabel({ signal, children, className }: { signal: Signal; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap', SIGNAL_TEXT[signal], className)}>
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', SIGNAL_DOT[signal])} />
      {children}
    </span>
  )
}
