import { cn } from '@/lib/utils'

// Record numbers (ISS-0042, WO-…) are for looking up, not for reading first:
// small and grey, in the body font (Todo-Modern-UI Fase 1).
export function RecordId({ id, className }: { id: string; className?: string }) {
  return <span className={cn('text-xs text-muted-foreground tabular-nums whitespace-nowrap', className)}>{id}</span>
}
