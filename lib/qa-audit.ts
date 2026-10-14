// QA audit screen rules (Todo-Pilot §7). Pure — unit-tested in qa-audit.test.ts.
// Must match backend/app/services/qa_audit_service.py (compute_score,
// submit_problems): the server stays the authority, this only previews.
import { translate } from './i18n/translate'
import type { Locale } from './i18n/locale'
import type { QAAuditFinding } from './types'

type FindingLike = Pick<QAAuditFinding, 'title' | 'result' | 'weight' | 'requiresPhoto' | 'photos'>

/** Weighted % of applicable items that passed (`na`/unanswered excluded), 1 decimal. */
export function previewScore(findings: FindingLike[]): number | null {
  const applicable = findings.filter((f) => f.result === 'pass' || f.result === 'fail')
  const total = applicable.reduce((sum, f) => sum + f.weight, 0)
  if (total <= 0) return null
  const passed = applicable.filter((f) => f.result === 'pass').reduce((sum, f) => sum + f.weight, 0)
  return Math.round((passed * 1000) / total) / 10
}

/** Why the audit cannot be submitted yet — same wording as the API's 409. */
export function submitProblems(findings: FindingLike[], locale: Locale = 'en'): string[] {
  const problems: string[] = []
  for (const f of findings) {
    if (!f.result) problems.push(translate(locale, 'qaRunner.notAnswered', { title: f.title }))
    else if (f.requiresPhoto && f.result !== 'na' && f.photos.length === 0) problems.push(translate(locale, 'qaRunner.photoRequired', { title: f.title }))
  }
  return problems
}

export function auditProgress(findings: Pick<QAAuditFinding, 'result'>[]) {
  const total = findings.length
  const answered = findings.filter((f) => f.result).length
  return { answered, total, percent: total ? Math.round((answered * 100) / total) : 0 }
}

/** Colour band for a score: ≥ 85 good, ≥ 70 warn, below that bad. */
export function scoreTone(score: number | null): 'good' | 'warn' | 'bad' | 'none' {
  if (score === null) return 'none'
  if (score >= 85) return 'good'
  return score >= 70 ? 'warn' : 'bad'
}
