// Three signals + neutral (Todo-Modern-UI Fase 1): "needs action", "waiting",
// "done", and everything else neutral. Colours are theme tokens (app/globals.css),
// checked in both modes by lib/contrast.test.ts. A signal is never colour alone:
// it always sits next to its text label (shared/status-label.tsx).

export type Signal = 'action' | 'waiting' | 'done' | 'neutral'

/** Issue, Task, Work Order, Approval, purchase and checklist statuses. Unlisted = neutral. */
export const STATUS_SIGNAL: Record<string, Signal> = {
  overdue: 'action',
  escalated: 'action',
  rejected: 'action',
  missed: 'action',
  pending: 'waiting',
  pending_approval: 'waiting',
  late: 'waiting',
  waiting: 'waiting',
  'on-hold': 'waiting',
  resolved: 'done',
  completed: 'done',
  approved: 'done',
  submitted: 'done',
}

export const PRIORITY_SIGNAL: Record<string, Signal> = {
  critical: 'action',
  high: 'waiting',
  medium: 'neutral',
  low: 'neutral',
}

/** Daily Ops checklist window state (lib/ops-checklist.windowState). */
export const WINDOW_SIGNAL: Record<string, Signal> = {
  upcoming: 'neutral',
  open: 'neutral',
  late: 'waiting',
  missed: 'action',
  submitted: 'done',
}

/** CMMS asset condition; running normally needs no signal. */
export const ASSET_SIGNAL: Record<string, Signal> = {
  critical: 'action',
  warning: 'waiting',
  maintenance: 'waiting',
  operational: 'neutral',
}

export const SIGNAL_TEXT: Record<Signal, string> = {
  action: 'text-destructive',
  waiting: 'text-warning',
  done: 'text-success',
  neutral: 'text-foreground',
}

// --warning-mark is brighter than --warning: fine for a dot, too light for text.
export const SIGNAL_DOT: Record<Signal, string> = {
  action: 'bg-destructive',
  waiting: 'bg-warning-mark',
  done: 'bg-success',
  neutral: 'bg-muted-foreground',
}

// Kanban columns: top edge and drop-target ring per signal.
export const SIGNAL_EDGE: Record<Signal, string> = {
  action: 'border-t-destructive',
  waiting: 'border-t-warning-mark',
  done: 'border-t-success',
  neutral: 'border-t-muted-foreground',
}
export const SIGNAL_RING: Record<Signal, string> = {
  action: 'ring-destructive/40',
  waiting: 'ring-warning-mark/40',
  done: 'ring-success/40',
  neutral: 'ring-muted-foreground/40',
}

export const statusSignal = (status: string): Signal => STATUS_SIGNAL[status] ?? 'neutral'
export const prioritySignal = (priority: string): Signal => PRIORITY_SIGNAL[priority] ?? 'neutral'

/** A count or percentage gets its colour only when there is something to see:
 *  0 and "no data" stay neutral (Todo-Modern-UI Fase 0). */
export const toneIfAny = <T,>(value: number | null | undefined, tone: T): T | undefined =>
  value ? tone : undefined
