// Manager's daily sign-off and the inspection PDF (Todo-Ops-Checklist Fase 4).
// Dates are ISO yyyy-mm-dd business dates; arithmetic in UTC so no local
// timezone shifts a day.

export const EXPORT_MAX_DAYS = 31

const DAY = 86_400_000
const parse = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Business dates from `to` back to `from`, at most EXPORT_MAX_DAYS. */
export function daysDesc(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = parse(to); d >= parse(from) && out.length < EXPORT_MAX_DAYS; d -= DAY) out.push(iso(d))
  return out
}

export type ExportProblem = 'outlet' | 'order' | 'tooLong'

/** Mirrors the export endpoint's 422s: one outlet, from ≤ to, ≤ 31 days. */
export function exportRangeProblem(outlet: string, from: string, to: string): ExportProblem | null {
  if (!outlet) return 'outlet'
  if (parse(from) > parse(to)) return 'order'
  if ((parse(to) - parse(from)) / DAY + 1 > EXPORT_MAX_DAYS) return 'tooLong'
  return null
}

export type SignoffState = 'unsigned' | 'signed' | 'changed'

/** changed = the day's data no longer matches what the manager signed. */
export function signoffState(day: { signoff: unknown | null; isIntact: boolean | null } | null): SignoffState {
  if (!day?.signoff) return 'unsigned'
  return day.isIntact === false ? 'changed' : 'signed'
}
