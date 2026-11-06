// "Pekerjaan Saya" as one queue, most urgent first (Todo-Modern-UI Fase 3).
// GET /api/my-work returns six sections; this merges them in the browser:
//   1. late work (deadline passed, escalated approval), oldest first;
//   2. the rest by its time — a deadline, or for work that is waiting on me
//      (approvals, guests) the time it started waiting;
//   3. work without any date (ready to close, tasks/WOs without a date) last.
// Ties: priority, then record number. A date without a time is due at the end
// of that day.
import type { MyWork } from './my-work-api'
import { recordPath } from './routes'
import type { Signal } from './tone'

export type QueueKind = 'opsChecklist' | 'approval' | 'workOrder' | 'task' | 'readyToClose' | 'guest'

export interface QueueItem {
  kind: QueueKind
  key: string                 // `${kind}:${id}`
  to: string                  // record path
  number: string
  title: string
  outlet: string
  priority: string | null
  /** Deadline (ISO) for work that has one. */
  dueAt: string | null
  /** When it started waiting on me, for approvals and guests. */
  since: string | null
  late: boolean
  signal: Signal
  /** Kind-specific facts for the row's second line. */
  detail: Record<string, string | number | null>
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

/** 'YYYY-MM-DD' → end of that day, local time. */
function endOfDay(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

const SECTION_KIND: [keyof MyWork, QueueKind][] = [
  ['opsChecklists', 'opsChecklist'], ['approvals', 'approval'], ['workOrders', 'workOrder'],
  ['tasks', 'task'], ['readyToClose', 'readyToClose'], ['guestWaiting', 'guest'],
]

export function buildQueue(work: MyWork, now: Date = new Date()): QueueItem[] {
  const items: QueueItem[] = []
  const base = { priority: null, dueAt: null, since: null, late: false, signal: 'neutral' as Signal, detail: {} }

  for (const c of work.opsChecklists?.items ?? []) {
    const late = c.dueAt !== null && Date.parse(c.dueAt) < now.getTime()
    items.push({ ...base, kind: 'opsChecklist', key: `opsChecklist:${c.id}`, to: recordPath('ops', c.id), number: c.number,
      title: c.templateName, outlet: c.outlet, dueAt: c.dueAt ?? c.closesAt, late, signal: late ? 'action' : 'neutral',
      detail: { answered: c.answered, total: c.itemCount } })
  }
  for (const a of work.approvals?.items ?? []) {
    items.push({ ...base, kind: 'approval', key: `approval:${a.id}`, to: recordPath('approvals', a.id), number: a.number,
      title: a.title, outlet: a.outlet, since: a.waitingSince, late: a.escalated, signal: a.escalated ? 'action' : 'waiting',
      detail: { amount: a.amount, step: a.stepOrder, steps: a.stepCount } })
  }
  for (const w of work.workOrders?.items ?? []) {
    const due = w.scheduledDate ? endOfDay(w.scheduledDate) : null
    const late = due !== null && due < now
    items.push({ ...base, kind: 'workOrder', key: `workOrder:${w.id}`, to: recordPath('cmms', w.id), number: w.number,
      title: w.title, outlet: w.outlet, priority: w.priority, dueAt: due?.toISOString() ?? null, late,
      signal: late ? 'action' : 'neutral', detail: { asset: w.assetName } })
  }
  for (const task of work.tasks?.items ?? []) {
    const due = task.dueDate ? endOfDay(task.dueDate) : null
    const late = due !== null && due < now
    items.push({ ...base, kind: 'task', key: `task:${task.id}`, to: recordPath('issues', task.issueId), number: task.number,
      title: task.title, outlet: task.outlet, priority: task.priority, dueAt: due?.toISOString() ?? null, late,
      signal: late ? 'action' : 'neutral', detail: { issue: task.issueNumber } })
  }
  for (const i of work.readyToClose?.items ?? []) {
    items.push({ ...base, kind: 'readyToClose', key: `readyToClose:${i.id}`, to: recordPath('issues', i.id), number: i.number,
      title: i.title, outlet: i.outlet })
  }
  for (const g of work.guestWaiting?.items ?? []) {
    items.push({ ...base, kind: 'guest', key: `guest:${g.id}`, to: recordPath('issues', g.issueId), number: g.issueNumber,
      title: g.title, outlet: g.outlet, since: g.reportedAt, signal: 'waiting', detail: { channel: g.channel } })
  }

  const at = (i: QueueItem) => {
    const v = i.dueAt ?? i.since
    return v ? Date.parse(v) : null
  }
  return items.sort((x, y) => {
    if (x.late !== y.late) return x.late ? -1 : 1
    const ax = at(x), ay = at(y)
    if (ax !== ay) {
      if (ax === null) return 1
      if (ay === null) return -1
      return ax - ay
    }
    const px = PRIORITY_RANK[x.priority ?? ''] ?? 9, py = PRIORITY_RANK[y.priority ?? ''] ?? 9
    if (px !== py) return px - py
    return x.number.localeCompare(y.number)
  })
}

/** Items the server counted but did not list (each section is capped). */
export function hiddenCounts(work: MyWork): { kind: QueueKind; count: number }[] {
  return SECTION_KIND
    .map(([section, kind]) => {
      const s = work[section]
      return { kind, count: s ? s.count - s.items.length : 0 }
    })
    .filter((h) => h.count > 0)
}
