// Daily ops checklist rules for the phone (Todo-Ops-Checklist Fase 1 §1.8).
// Mirrors backend/app/services/ops_checklist_rules.py: the same pass/fail,
// score and submit blockers the server will apply, shown before submitting.
import type { OpsRunItem, OpsRunStatus } from './types'

/** pass | fail for a measured value; bounds inclusive, null = unbounded. */
export function evaluateItem(value: number | null, min: number | null, max: number | null): 'pass' | 'fail' | null {
  if (value === null || Number.isNaN(value)) return null
  if (min !== null && value < min) return 'fail'
  if (max !== null && value > max) return 'fail'
  return 'pass'
}

export type ProblemKind = 'unanswered' | 'photo' | 'corrective'
export interface SubmitProblem { title: string; kind: ProblemKind }

/** Why the run cannot be submitted yet. `queuedPhotos` (by item id) count —
 *  photos taken offline are uploaded before the queued submit replays. */
export function submitProblems(items: OpsRunItem[], queuedPhotos: Record<string, number> = {}): SubmitProblem[] {
  const problems: SubmitProblem[] = []
  for (const i of items) {
    if (!i.result) {
      problems.push({ title: i.title, kind: 'unanswered' })
      continue
    }
    if (i.requiresPhoto && i.result !== 'na' && i.photos.length + (queuedPhotos[i.id] ?? 0) === 0) {
      problems.push({ title: i.title, kind: 'photo' })
    }
    if (i.itemType === 'temperature' && i.result === 'fail' && !(i.correctiveAction ?? '').trim()) {
      problems.push({ title: i.title, kind: 'corrective' })
    }
  }
  return problems
}

/** % of pass among pass/fail items (n/a excluded), one decimal; null when none apply. */
export function runScore(items: Pick<OpsRunItem, 'result'>[]): number | null {
  const applicable = items.filter((i) => i.result === 'pass' || i.result === 'fail')
  if (applicable.length === 0) return null
  const pass = applicable.filter((i) => i.result === 'pass').length
  return Math.round((pass * 1000) / applicable.length) / 10
}

/** Failed items — each raises an Issue on submit, or adds to the open one. */
export function failPreview(items: OpsRunItem[]): { id: string; title: string; critical: boolean }[] {
  return items.filter((i) => i.result === 'fail').map((i) => ({ id: i.id, title: i.title, critical: i.isCritical }))
}

export function progress(items: Pick<OpsRunItem, 'result'>[]): { answered: number; total: number; percent: number } {
  const answered = items.filter((i) => i.result).length
  return { answered, total: items.length, percent: items.length ? Math.round((answered * 100) / items.length) : 0 }
}

export type WindowState = 'upcoming' | 'open' | 'late' | 'missed' | 'submitted'

/** Where a run stands right now (the server re-checks on every write). */
export function windowState(
  run: { status: OpsRunStatus; opensAt: string; dueAt: string; closesAt: string },
  now: number = Date.now(),
): WindowState {
  if (run.status === 'submitted') return 'submitted'
  if (run.status === 'missed') return 'missed'
  if (now < Date.parse(run.opensAt)) return 'upcoming'
  if (now <= Date.parse(run.dueAt)) return 'open'
  if (now <= Date.parse(run.closesAt)) return 'late'
  return 'missed'
}
