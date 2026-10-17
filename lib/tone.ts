// One source of badge colours (Todo-UI 0.3): pale background + dark text in
// light mode, deep background + light text in dark mode. lib/contrast.test.ts
// checks every pair against WCAG AA in both modes.

const blue    = 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
const purple  = 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
const amber   = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
const orange  = 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
const cyan    = 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
const green   = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
const red     = 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
const rose    = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
const neutral = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

export const PRIORITY_TONE: Record<string, string> = {
  critical: red,
  high: orange,
  medium: amber,
  low: neutral,
}

/** Issue, Task, Work Order, Approval and checklist statuses. */
export const STATUS_TONE: Record<string, string> = {
  open: blue,
  scheduled: blue,
  assigned: purple,
  'in-progress': amber,
  in_progress: amber,
  pending: amber,
  waiting: cyan,
  'on-hold': cyan,
  resolved: green,
  completed: green,
  approved: green,
  submitted: green,
  escalated: red,
  overdue: red,
  rejected: red,
  missed: red,
  cancelled: rose,
  closed: neutral,
}

/** Daily Ops checklist window state (lib/ops-checklist.windowState). */
export const WINDOW_TONE: Record<string, string> = {
  upcoming: neutral,
  open: blue,
  late: amber,
  missed: red,
  submitted: green,
}

export const statusTone = (status: string) => STATUS_TONE[status] ?? STATUS_TONE.closed
export const priorityTone = (priority: string) => PRIORITY_TONE[priority] ?? PRIORITY_TONE.low
